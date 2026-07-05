"use client";

import React, {useEffect, useState} from "react";
import {useParams, useRouter} from "next/navigation";
import {API} from "@/lib/api";
import {toast} from "sonner";
import PageTitle from "@/components/page-title";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Button} from "@/components/ui/button";
import {Spinner} from "@/components/ui/spinner";
import {
  IconAlertTriangle,
  IconDeviceFloppy,
  IconDownload,
  IconMap,
  IconTable,
  IconTableSpark,
  IconTrash,
  IconZoomExclamation
} from "@tabler/icons-react";
import {PopoverClose} from "@radix-ui/react-popover";
import FullScreenSpinner from "@/components/full-screen-spinner";
import {Card, CardContent, CardTitle} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import Link from "next/link";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";

export default function ViewDataset() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const params = useParams<{ datasetId: string }>();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [datasetName, setDatasetName] = useState("");

  useEffect(() => {
    const fetchDataset = async () => {
      try {
        const response = await API.getDataset(params.datasetId);
        setDataset(response);
        setDatasetName(response.name);
      } catch (e) {
        toast.error("Invalid dataset ID.");
        router.push("/");
      }
    }

    fetchDataset();
  }, [params]);

  const handleDelete = () => {
    setDeleting(true);

    toast.promise(API.deleteDataset(params.datasetId), {
      loading: "Deleting dataset…",
      success: "Dataset deleted successfully.",
      error: (err) => err?.message ?? "Failed to delete dataset.",
      finally: () => {
        router.push('/');
      },
    });
  };

  const saveName = async () => {
    const response = await API.updateDataset(params.datasetId, {name: datasetName});
    setDataset(response);
    toast.success("Dataset name updated successfully.");
  }

  return dataset ? (
    <>
      <PageTitle title={`Dataset ${dataset.name}`}>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="destructive" size="icon" disabled={deleting}>
              {deleting ? (
                <Spinner/>
              ) : (
                <IconTrash/>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <b>Are you sure you want to delete this dataset?</b> It will delete its rows as well and this action is
            not reversible.
            <Button onClick={handleDelete} variant="destructive">Yes, Delete</Button>
            <PopoverClose asChild>
              <Button variant="outline">Cancel</Button>
            </PopoverClose>
          </PopoverContent>
        </Popover>
        <Button asChild>
          <Link href={`/datasets/${params.datasetId}/visualize`}>
            <IconMap/>
            Visualize
          </Link>
        </Button>
      </PageTitle>
      <div className="grid grid-cols-3 gap-6">
        <Card>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-grow-1">
                <Label htmlFor="name" className="mb-2">Dataset name</Label>
                <Input
                  id="name"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                />
              </div>
              <Button onClick={saveName}>
                <IconDeviceFloppy/>
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={dataset.original_file} target="_blank">
              <Card>
                <CardContent className="flex gap-4 items-center h-full">
                  <div className="bg-red-500 w-fit p-4 rounded-full bg-zinc-100">
                    <IconTable size={18} className="text-gray-500"/>
                  </div>
                  <div>
                    Original file
                    <span
                      className="block font-bold text-blue-700 text-xs">{dataset.original_file.split("/").slice(-1)[0]}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p><IconDownload size={12} className="inline align-text-base"/> Click to download</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={dataset.synthetic_file} target="_blank">
              <Card>
                <CardContent className="flex gap-4 items-center h-full">
                  <div className="bg-red-500 w-fit p-4 rounded-full bg-zinc-100">
                    <IconTableSpark size={18} className="text-gray-500"/>
                  </div>
                  <div>
                    Synthetic file
                    <span
                      className="block font-bold text-blue-700 text-xs">{dataset.synthetic_file.split("/").slice(-1)[0]}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p><IconDownload size={12} className="inline align-text-base"/> Click to download</p>
          </TooltipContent>
        </Tooltip>
        <Card>
          <CardContent className="flex gap-4 items-center h-full">
            <div className="bg-red-500 w-fit p-4 rounded-full bg-zinc-100">
              <IconZoomExclamation size={18} className="text-gray-500"/>
            </div>
            <div>
              Rows not matched to postcode
              <span
                className="block font-bold text-blue-700 text-xs">{dataset.unmatched_rows_count}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex gap-4 items-center h-full">
            <div className="bg-red-500 w-fit p-4 rounded-full bg-zinc-100">
              <IconAlertTriangle size={18} className="text-gray-500"/>
            </div>
            <div>
              Rows matched to similar postcode
              <span
                className="block font-bold text-blue-700 text-xs">{dataset.flagged_rows_count}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6 relative pb-10">
        <CardContent>
          <CardTitle>
            Original file preview
          </CardTitle>
          {dataset.original_file_preview.length > 0 ? (
            <Table className="mt-2">
              <TableHeader>
                <TableRow>
                  {Object.keys(dataset.original_file_preview[0]).map((column) => (
                    <TableHead
                      key={`column-${column}-original`}
                      className={`text-xs ${column === dataset.postcode_field ? "text-blue-700" : ""}`}
                    >
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <>
                  {dataset.original_file_preview.map((row, idx) => (
                    <TableRow key={`original-${idx}`}>
                      {Object.keys(row).map((col) => (
                        <TableCell
                          key={`original-${idx}-${col}`}
                          className={`text-xs ${col === dataset.postcode_field ? "font-bold" : ""}`}
                        >
                          {row[col]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </>
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center gap-2 py-10">
              <IconTable size={48} className="text-gray-400"/>
              <p className="text-sm text-gray-500">No preview available</p>
            </div>
          )}
        </CardContent>
        <div
          className="pointer-events-none absolute bottom-0 left-0
         h-40 w-full
         bg-gradient-to-t
         from-white
         via-white/80 via-60%
         to-transparent
         dark:from-gray-dark dark:via-gray-dark/90"/>
        <span className="text-xs font-bold absolute block w-full text-center bottom-4">
          {dataset.original_rows_count} rows
        </span>
      </Card>
      <Card className="mt-6 relative pb-10">
        <CardContent>
          <CardTitle>
            Synthetic file preview
          </CardTitle>
          {dataset.synthetic_file_preview.length > 0 ? (
            <Table className="mt-2">
              <TableHeader>
                <TableRow>
                  {Object.keys(dataset.synthetic_file_preview[0]).map((column) => (
                    <TableHead
                      key={`column-${column}-synthetic`}
                      className={`text-xs ${column === dataset.postcode_field ? "text-blue-700" : ""}`}
                    >
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <>
                  {dataset.synthetic_file_preview.map((row, idx) => (
                    <TableRow key={`synthetic-${idx}`}>
                      {Object.keys(row).map((col) => (
                        <TableCell
                          key={`synthetic-${idx}-${col}`}
                          className={`text-xs ${col === dataset.postcode_field ? "font-bold" : ""}`}
                        >
                          {row[col]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </>
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center gap-2 py-10">
              <IconTable size={48} className="text-gray-400"/>
              <p className="text-sm text-gray-500">No preview available</p>
            </div>
          )}
        </CardContent>
        <div
          className="pointer-events-none absolute bottom-0 left-0
         h-40 w-full
         bg-gradient-to-t
         from-white
         via-white/80 via-60%
         to-transparent
         dark:from-gray-dark dark:via-gray-dark/90"/>
        <span className="text-xs font-bold absolute block w-full text-center bottom-4">
          {dataset.synthetic_rows_count} rows
        </span>
      </Card>
    </>
  ) : <FullScreenSpinner/>;
}