This is the frontend for the [Dual Dataset Visualisation Tool](../README.md) — a Next.js app for uploading a pair of CSV datasets (an original and a synthetic version of it) and comparing them geographically against Dutch postcodes.

It talks to the [Django/DRF backend](../dual_dataset_visualisation/README.md), which does the actual CSV processing, postcode resolution, and aggregation.

## Stack

- **Next.js 16** (App Router) + React 19
- **TanStack Query** for server state, **axios** for HTTP
- **MapLibre GL** / `react-map-gl` for the choropleth maps
- **shadcn/ui**, Radix primitives, Tailwind CSS for UI
- **sonner** for toast notifications

## Environment variables

Create a `.env` (see the example for local dev defaults):

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://127.0.0.1:8000/api` | Base URL of the backend API. Used by [lib/axios.ts](lib/axios.ts). |

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The backend (and its Postgres/Redis/Celery worker) must already be running — see the [root README](../README.md) for the fastest way to bring everything up together via Docker Compose.

Other scripts: `npm run build` (production build), `npm run start` (serve the production build), `npm run lint`.

## How it's structured

- **`/` ([app/page.tsx](app/page.tsx))** — lists existing datasets ([components/datasets.tsx](components/datasets.tsx)), with actions to create or delete one.
- **`/datasets/create` ([page.tsx](app/datasets/create/page.tsx))** — upload form for an original + synthetic CSV pair. Validates both files against the backend (`POST /datasets/validate-files/`) before creating the dataset, so column-mismatch errors surface before the (slower) processing step.
- **`/datasets/[datasetId]/view` ([page.tsx](app/datasets/%5BdatasetId%5D/view/page.tsx))** — dataset detail: row counts, flagged/unmatched rows, a preview table, rename/delete, and the entry point into visualisation.
- **`/datasets/[datasetId]/visualize` ([page.tsx](app/datasets/%5BdatasetId%5D/visualize/page.tsx))** — pick an aggregate function, visualisation level (province/municipality), and numeric field, then render the result via [components/maps-container.tsx](components/maps-container.tsx) as one or two choropleth maps (single map for plain aggregates, side-by-side original vs. synthetic when a `MEAN_DIFFERENCE`/`VAR_DIFFERENCE` function is picked) and a companion data table.

### API access

All backend calls go through [lib/api.ts](lib/api.ts) (a thin static-method wrapper) on top of the shared axios instance in [lib/axios.ts](lib/axios.ts). Add new backend endpoints here rather than calling `axios`/`fetch` directly from components.

### Async dataset processing

Dataset creation returns immediately with `status: "pending"`/`"processing"` — the backend processes the CSVs asynchronously via Celery. [hooks/poll-dataset-toast.tsx](hooks/poll-dataset-toast.tsx) polls `GET /datasets/{id}/` every 5 seconds and swaps a loading toast for a success/error toast once the status leaves `"processing"`.

### Maps

[components/visualisation-map.tsx](components/visualisation-map.tsx) renders a single choropleth layer; [components/maps-container.tsx](components/maps-container.tsx) decides whether to show one or two of them side by side and computes a shared min/max across both datasets so their color scales stay comparable. Regions with no value use a fixed `-999999` sentinel paired with a fallback color in the MapLibre style expression — don't change one without the other.
