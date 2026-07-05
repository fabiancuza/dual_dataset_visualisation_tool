"use client";

import {useEffect, useMemo, useState} from "react";
import {API} from "@/lib/api";
import {ColumnDef} from "@tanstack/react-table";
import {DataTable} from "@/components/ui/datatable";
import {Button} from "@/components/ui/button";
import {IconDownload} from "@tabler/icons-react";

type TableRow = {
  area_code: string;
  area_name: string;
  original_value: number | null;
  synthetic_value: number | null;
  difference_value?: number | null;
};

interface VisualisationTableProps {
  level: string;
  values: Visualisation;
}

export default function VisualisationTable({level, values}: VisualisationTableProps) {

  const [areas, setAreas] = useState<Municipality[] | Province[]>([]);
  const formatValue = (value: number | null) =>
    value == null ? "N/A" : value.toLocaleString("nl-NL", { maximumFractionDigits: 3 })

  useEffect(() => {
    const fetchAreas = async () => {
      let response: Municipality[] | Province[] = [];
      if (level === "province") {
        response = await API.getProvinces();
      }
      if (level === "municipality") {
        response = await API.getMunicipalities();
      }
      setAreas(response);
    }

    fetchAreas();
  }, [level]);

  const columns = useMemo<ColumnDef<TableRow>[]>(
    () => [
      {
        header: level === "province" ? "Province" : "Municipality",
        accessorKey: "area_name",
      },
      {
        header: "Original",
        accessorKey: "original_value",
        cell: ({ row }) => {
          const value = formatValue(row.getValue("original_value") as number | null);
          return value ?? "N/A";
        },
      },
      {
        header: "Synthetic",
        accessorKey: "synthetic_value",
        cell: ({ row }) => {
          const value = formatValue(row.getValue("synthetic_value") as number | null);
          return value ?? "N/A";
        },
      },
      ...(values.difference
        ? [
          {
            header: "Difference",
            accessorKey: "difference_value",
            cell: ({ row }) => {
              const value = formatValue(row.getValue("difference_value") as number | null);
              return value ?? "N/A";
            },
          } satisfies ColumnDef<TableRow>,
        ]
        : []),
    ],
    [level, values.difference]
  );

  const data = useMemo<TableRow[]>(() => {
    return areas.map((area) => ({
      area_code: area.code,
      area_name: area.name,
      original_value: values.original?.[area.code] ?? null,
      synthetic_value: values.synthetic?.[area.code] ?? null,
      difference_value: values.difference?.[area.code] ?? null,
    }));
  }, [areas, values]);

  const downloadAsCsv = () => {
    const header = columns.map(col => col.header).join(",");
    const rows = data.map(row => [
      row.area_name,
      row.original_value?.toFixed(3) ?? "N/A",
      row.synthetic_value?.toFixed(3) ?? "N/A",
      values.difference ? (row.difference_value?.toFixed(3) ?? "N/A") : null,
    ].filter(value => value !== null).join(","));

    const csvContent = [header, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${level}_data.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Button className="mb-3" onClick={downloadAsCsv}>
        <IconDownload />
        Download
      </Button>
      <DataTable columns={columns} data={data} />
    </>
  );
}