"use client";

import { toast } from "sonner";
import { useCallback, useRef } from "react";
import {API} from "@/lib/api";
import { useRouter } from "next/navigation";

export function usePollDatasetToast() {
  const intervalRef = useRef<number | null>(null);
  const router = useRouter();

  const stop = useCallback(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const start = useCallback(async (datasetId: string, datasetName: string) => {
    stop();

    const loadingId = toast.loading(`Processing dataset '${datasetName}'…`, {
      duration: Infinity,
    });

    const tick = async () => {
      try {
        const data = await API.getDataset(datasetId);

        if (data.status !== "processing") {
          stop();

          toast.dismiss(loadingId);

          toast("Dataset processed", {
            description: `Dataset '${datasetName}' is ready to view.`,
            action: {
                label: "View",
                onClick: () => router.push(`/datasets/${datasetId}/view`)
            },
            duration: 5_000,
          });
        }

        if (data.status === "failed") {
          stop();
          toast.dismiss(loadingId);
          toast.error("Failed to process dataset", {
            description: `Dataset '${datasetName}' could not be processed.`,
            duration: 5_000,
          });
        }
      } catch (e) {
        // optional: don’t immediately stop polling on transient errors
        // toast.message("Still trying…", { description: "Temporary error" });
      }
    };

    // run immediately, then every 5s
    await tick();
    intervalRef.current = window.setInterval(tick, 5000);
  }, [stop]);

  return { start, stop };
}
