"use client";

import React, {useEffect, useState} from "react";
import {useParams, useRouter} from "next/navigation";
import {API} from "@/lib/api";
import {toast} from "sonner";
import PageTitle from "@/components/page-title";
import {Button} from "@/components/ui/button";
import {
  IconArrowLeft,
} from "@tabler/icons-react";
import FullScreenSpinner from "@/components/full-screen-spinner";
import {Card, CardContent} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {Label} from "@/components/ui/label";
import MapsContainer from "@/components/maps-container";
import VisualisationTable from "@/components/visualisation-table";

const VISUALISATION_LEVELS = {
  MUNICIPALITY: "municipality",
  PROVINCE: "province"
}

const VISUALISATION_TYPES = {
  MAP: "map",
  TABLE: "table"
}

export default function VisualizeDataset() {
  const [dataset, setDataset] = useState<Dataset|null>(null);
  const params = useParams<{ datasetId: string }>();
  const [aggregateFunctions, setAggregateFunctions] = useState<string[]>([]);
  const [aggregateFunction, setAggregateFunction] = useState("");
  const [level, setLevel] = useState(VISUALISATION_LEVELS.PROVINCE);
  const [column, setColumn] = useState("");
  const router = useRouter();
  const [values, setValues] = useState<Visualisation|null>(null);
  const [visualisationType, setVisualisationType] = useState(VISUALISATION_TYPES.MAP);

  useEffect(() => {
    const fetchDataset = async () => {
      try {
        const datasetResponse = await API.getDataset(params.datasetId);
        setDataset(datasetResponse);
        setColumn(datasetResponse.columns[0]);
        const functionsResponse = await API.getAggregateFunctions();
        setAggregateFunction(functionsResponse[0]);
        setAggregateFunctions(functionsResponse);
      } catch (e) {
        toast.error("Invalid dataset ID.");
        router.push("/");
      }
    }

    fetchDataset();
  }, [params]);

  useEffect(() => {
    setValues(null);

    const fetchValues = async () => {
      if (!dataset || !aggregateFunction || !level || !column) return;
      const valuesResponse = await API.getVisualisationValues(dataset.id, aggregateFunction, level, column);
      setValues(valuesResponse);
    }

    fetchValues();
  }, [dataset, aggregateFunction, level, column]);

  return dataset ? (
    <>
      <PageTitle title={`Visualize dataset ${dataset.name}`}>
        <Button onClick={() => router.back()} className="bg-black" size="icon">
          <IconArrowLeft/>
        </Button>
      </PageTitle>
      <Card className="mb-6">
        <CardContent className="flex gap-6">
          <div className="flex-grow-1">
            <Label className="mb-2">Visualisation level</Label>
            <Select value={level} onValueChange={(v) => setLevel(v)}>
              <SelectTrigger className="w-full capitalize">
                <SelectValue/>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Visualisation levels</SelectLabel>
                  {(Object.keys(VISUALISATION_LEVELS) as Array<keyof typeof VISUALISATION_LEVELS>).map((lvl) => (
                    <SelectItem className="capitalize" key={lvl}
                                value={VISUALISATION_LEVELS[lvl]}>{VISUALISATION_LEVELS[lvl]}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-grow-1">
            <Label className="mb-2">Aggregate function</Label>
            <Select value={aggregateFunction} onValueChange={(v) => setAggregateFunction(v)}>
              <SelectTrigger className="w-full">
                <SelectValue/>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Aggregate functions</SelectLabel>
                  {aggregateFunctions.map((func) => (
                    <SelectItem key={func} value={func}>{func}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-grow-1">
            <Label className="mb-2">Column</Label>
            <Select value={column} onValueChange={(v) => setColumn(v)}>
              <SelectTrigger className="w-full">
                <SelectValue/>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Columns</SelectLabel>
                  {dataset.columns.map((col) => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-grow-1">
            <Label className="mb-2">Visualisation type</Label>
            <Select value={visualisationType} onValueChange={(v) => setVisualisationType(v)}>
              <SelectTrigger className="w-full capitalize">
                <SelectValue/>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Visualisation types</SelectLabel>
                  {(Object.keys(VISUALISATION_TYPES) as Array<keyof typeof VISUALISATION_TYPES>).map((type) => (
                    <SelectItem className="capitalize" key={type}
                                value={VISUALISATION_TYPES[type]}>{VISUALISATION_TYPES[type]}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      {values ? (
        <>
          {visualisationType === VISUALISATION_TYPES.TABLE ? (
            <VisualisationTable
              level={level}
              values={values}
            />
          ) : (
            <MapsContainer
              level={level}
              values={values}
            />
          )}
        </>
      ) : <FullScreenSpinner/>}
    </>
  ) : <FullScreenSpinner/>;
}