"use client";

import PageTitle from "@/components/page-title";
import Link from "next/link";
import {IconInfoCircle, IconMap, IconPlus, IconTrash} from "@tabler/icons-react";
import {Button} from "@/components/ui/button";
import React, {useEffect} from "react";
import {Card, CardContent} from "@/components/ui/card";
import {ColumnDef} from "@tanstack/table-core";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {API} from "@/lib/api";
import {DataTable} from "@/components/ui/datatable";
import {Spinner} from "@/components/ui/spinner";
import moment from "moment";
import DatasetStatus from "@/components/dataset-status";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {PopoverClose} from "@radix-ui/react-popover";
import {toast} from "sonner";

export const columns = ({
                          onDelete,
                          isDeleting,
                        }: {
  onDelete: (id: string) => void;
  isDeleting: (id: string) => boolean;
}): ColumnDef<Dataset>[] => [
  {
    accessorKey: "name",
    header: "Dataset name",
    cell: ({row}) => <span className="font-bold">{row.getValue('name')}</span>,
  },
  {
    accessorKey: "created_at",
    header: "Upload date",
    cell: ({row}) => moment(row.getValue('created_at')).format("DD MMMM YYYY, HH:mm")
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({row}) => <DatasetStatus status={row.getValue('status')}/>
  },
  {
    id: "actions",
    header: () => (
      <div className="text-right">Actions</div>
    ),
    accessorFn: (d) => ({
      id: d.id,
    }),
    cell: ({getValue}) => {
      const v = getValue() as { id: string; };
      const deleting = isDeleting(v.id);
      return (
        <div className="flex justify-end gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" disabled={deleting}>
                {deleting ? (
                  <Spinner/>
                ) : (
                  <IconTrash className="text-gray-500"/>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <b>Are you sure you want to delete this dataset?</b> It will delete its rows as well and this action is
              not reversible.
              <Button onClick={() => onDelete(v.id)} variant="destructive">Yes, Delete</Button>
              <PopoverClose asChild>
                <Button variant="outline">Cancel</Button>
              </PopoverClose>
            </PopoverContent>
          </Popover>
          <Button asChild variant="outline" size="icon">
            <Link href={`/datasets/${v.id}/view`}>
              <IconInfoCircle className="text-gray-500"/>
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon">
            <Link href={`/datasets/${v.id}/visualize`}>
              <IconMap className="text-gray-500"/>
            </Link>
          </Button>
        </div>
      );
    },
  }
];

export default function Datasets() {

  const [deletingIds, setDeletingIds] = React.useState<Set<string>>(new Set());

  const {data: datasets, isPending, error} = useQuery({
    queryKey: ['datasets'],
    queryFn: () => API.getDatasets(),
    refetchInterval: (query) => {
      const data = query.state.data as Dataset[] | undefined;
      const hasProcessing = data?.some(d => d.status === "processing");
      return hasProcessing ? 5000 : false; // or 10000
    },
  });

  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => API.deleteDataset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["datasets"]});
    },
  });

  const handleDelete = (id: string) => {
    if (deletingIds.has(id)) return;

    setDeletingIds((prev) => new Set(prev).add(id));

    toast.promise(deleteMutation.mutateAsync(id), {
      loading: "Deleting dataset…",
      success: "Dataset deleted successfully.",
      error: (err) => err?.message ?? "Failed to delete dataset.",
      finally: () => {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      },
    });
  };


  useEffect(() => {
    console.log(datasets);
  }, [datasets]);

  return (
    <>
      <PageTitle title="Datasets">
        <Button asChild>
          <Link href="/datasets/create">
            <IconPlus/>
            Create
          </Link>
        </Button>
      </PageTitle>
      <Card>
        <CardContent>
          {(isPending || !datasets) ? <Spinner className="mx-auto"/> : (
            <DataTable
              columns={columns({
                onDelete: handleDelete,
                isDeleting: (id) => deletingIds.has(id),
              })}
              data={datasets}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}