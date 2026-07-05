import {Badge} from "@/components/ui/badge";

interface DatasetStatusProps {
  status: "completed" | "processing" | "failed";
}

export default function DatasetStatus({status} : DatasetStatusProps) {

  const getVariant = () => {
    switch(status) {
      case "completed":
        return "success";
      case "failed":
        return "error";
      case "processing":
        return "pending";
      default:
        return "default";
    }
  }

  return (
    <Badge variant={getVariant()} className="capitalize">
      {status}
    </Badge>
  )
}