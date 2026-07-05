"use client"; // Mark this as a Client Component

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {Toaster} from "sonner";
import React from "react";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="bottom-center" richColors />
    </QueryClientProvider>
  );
}