"use client";

import PageTitle from "@/components/page-title";
import {Card, CardContent} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {useState} from "react";
import {IconArrowRight} from "@tabler/icons-react";
import {Button} from "@/components/ui/button";
import {Spinner} from "@/components/ui/spinner";
import {toast} from "sonner";
import {API} from "@/lib/api";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group"
import {usePollDatasetToast} from "@/hooks/poll-dataset-toast";
import {useRouter} from "next/navigation";

export default function CreateDataset() {
  const [originalFile, setOriginalFile] = useState<File|undefined>(undefined);
  const [syntheticFile, setSyntheticFile] = useState<File|undefined>(undefined);
  const [datasetName, setDatasetName] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [postcodeColumn, setPostcodeColumn] = useState("");
  const { start: processingToast, stop } = usePollDatasetToast();
  const router = useRouter();

  const processFiles = async () => {
    setLoadingColumns(true);
    if (!originalFile || !syntheticFile) {
      return;
    }

    await toast.promise(
      API.validateFiles(originalFile, syntheticFile),
      {
        loading: "Processing files…",
        success: (r) => {
          setColumns(r.columns);

          return "Files processed!";
        },
        error: (e) => {
          console.error("File validation failed:", e);

          return (
            e?.response?.data?.non_field_errors[0] ??
            "Something went wrong while processing files"
          );
        },
        finally: () => setLoadingColumns(false),
      }
    );
  }

  const createDataset = async () => {
    if (!datasetName || !postcodeColumn) {
      if (!datasetName) {
        toast.error("Fill in dataset name.");
      }
      if (!postcodeColumn) {
        toast.error("Select a postcode column");
      }
      return;
    }

    if (!originalFile || !syntheticFile) {
      toast.error("Original and synthetic file are required.");
      return;
    }

    const dataset = await API.createDataset(
      datasetName, postcodeColumn, originalFile, syntheticFile
    );

    await processingToast(dataset.id, dataset.name);
    router.push('/datasets');
  }

  return (
    <>
      <PageTitle title="Create dataset"/>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <Card>
            <CardContent className={columns.length > 0 || loadingColumns ? "opacity-50 pointer-events-none" : ""}>
              <Label htmlFor="original_file" className="mb-2">Original file</Label>
              <Input
                id="original_file"
                type="file"
                onChange={(e) => setOriginalFile(e.target.files?.[0])}
              />
              <Label htmlFor="synthetic_file" className="mt-6 mb-2">Synthetic file</Label>
              <Input
                id="synthetic_file"
                type="file"
                onChange={(e) => setSyntheticFile(e.target.files?.[0])}
              />
              <>
                {columns.length === 0 && (
                  <div className="mt-6 flex justify-end">
                    <Button onClick={processFiles} disabled={!originalFile && !syntheticFile}>
                      <>
                        {loadingColumns ? <Spinner/> : (
                          <>
                            Next <IconArrowRight/>
                          </>
                        )}
                      </>
                    </Button>
                  </div>
                )}
              </>
            </CardContent>
          </Card>
          {columns.length > 0 && (
            <Card className="mt-6">
              <CardContent>
                <Label htmlFor="name" className="mb-2">Dataset name</Label>
                <Input
                  id="name"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="E.g. Nutrition data 2025"
                />
              </CardContent>
            </Card>
          )}
        </div>
        {columns.length > 0 && (
          <div>
            <Card>
              <CardContent>
                <FieldGroup>
                  <FieldSet>
                    <FieldLabel htmlFor="compute-environment-p8w">
                      Postcode column
                    </FieldLabel>
                    <FieldDescription>
                      Select the column containing the postcode. We will use this to localise the entry. The podcodes
                      can
                      have any format, we will extract the 4 digits.
                    </FieldDescription>
                    <RadioGroup value={postcodeColumn} onValueChange={(v) => setPostcodeColumn(v)}>
                      <>
                        {columns.map((column) => (
                          <FieldLabel key={`column-${column}`} htmlFor={`column-${column}`}>
                            <Field orientation="horizontal">
                              <FieldContent>
                                <FieldTitle className="font-mono text-xs">{column}</FieldTitle>
                              </FieldContent>
                              <RadioGroupItem value={column} id={`column-${column}`}/>
                            </Field>
                          </FieldLabel>
                        ))}
                      </>
                    </RadioGroup>
                  </FieldSet>
                </FieldGroup>
              </CardContent>
            </Card>
            <div className="flex mt-4 justify-end">
              <Button onClick={createDataset}  size="lg">
                Create dataset
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}