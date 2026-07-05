interface Dataset{
  id: string;
  name: string;
  postcode_field: string;
  status: string;
  original_file: string;
  synthetic_file: string;
  original_rows_count: number;
  synthetic_rows_count: number;
  created_at: string;
  updated_at: string;
  original_file_preview: Record<string, number>[];
  synthetic_file_preview: Record<string, number>[];
  columns: string[];
  flagged_rows_count: number;
  unmatched_rows_count: number;
}

interface Visualisation {
  original?: Record<string, number>;
  synthetic?: Record<string, number>;
  difference?: Record<string, number>;
}