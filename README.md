# Dual Dataset Visualisation Tool

Compares an **original** CSV dataset against a **synthetic** (e.g. anonymized/generated) version of it, geographically. Upload two CSVs that share a postcode column and a numeric field; the tool matches rows to Dutch postcodes/administrative regions and renders per-region aggregates (mean, sum, variance, median, etc.) for both datasets side by side on a map.

## Structure

This is a two-app monorepo:

```
dual_dataset_visualisation_tool/
├── docker-compose.yml               # runs everything together
├── dual_dataset_visualisation/      # backend — Django + DRF + Celery
└── dual_dataset_visualisation_frontend/  # frontend — Next.js
```

- **[dual_dataset_visualisation/](dual_dataset_visualisation/README.md)** — the API. Handles CSV upload, postcode resolution against the Dutch administrative hierarchy (province → municipality → district → neighborhood → postcode), and aggregation. Processing runs asynchronously via a Celery worker (Redis-backed); results are stored in PostgreSQL. See its README for the data model, environment variables, management commands, and full API reference.
- **[dual_dataset_visualisation_frontend/](dual_dataset_visualisation_frontend/README.md)** — the UI. Next.js app for uploading dataset pairs, tracking processing status, and viewing the two datasets as choropleth maps / tables side by side.

Three moving pieces sit behind the backend: **PostgreSQL** (aggregation relies on a Postgres-only `PERCENTILE_CONT` expression), **Redis** (Celery broker + result backend), and the **Celery worker** itself, which must be running for uploaded datasets to ever leave `pending` status.

## Running everything with Docker Compose

The root [docker-compose.yml](docker-compose.yml) wires up all five services: `db` (Postgres), `redis`, `backend` (Django/gunicorn), `celery` (worker), and `frontend` (Next.js).

```bash
docker compose up --build -d
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:8000/api/](http://localhost:8000/api/)
- Swagger docs: [http://localhost:8000/swagger/](http://localhost:8000/swagger/)

Postgres and Redis are provisioned automatically with named volumes (`postgres_data`, `media_files`), so no manual DB setup is needed for this path. The backend container runs migrations on startup, but the reference tables (`Postcode`/`Province`/`Municipality`/`District`/`Neighborhood`) still need seeding once — see the backend README's [Seeding reference data](dual_dataset_visualisation/README.md#seeding-reference-data) section (run `load_postcodes` inside the `backend` container, e.g. `docker compose exec backend python manage.py load_postcodes ...`).

The compose file hardcodes dev-friendly defaults (empty DB password, `POSTGRES_HOST_AUTH_METHOD: trust`) — do not use it as-is in production.

### Loading postcodes and administrative regions (Docker)

Datasets can only be processed once the `Postcode`/`Province`/`Municipality`/`District`/`Neighborhood` tables are popuated. Use the `load_postcodes` management command, which reads unique postcodes from a CSV (or a `.gpkg`, converted via `ogr2ogr`) and looks each one up against the [PDOK](https://www.pdok.nl/) (Dutch government geocoding) API to resolve its administrative region. Run this after the Docker containers have been spun up.

```bash
docker compose exec backend python manage.py load_postcodes --file <path-found-via-staticfiles> --postcode_field <column_name> [--workers 8] [--chunk 1000]
```

`--file` is resolved via Django's static files finder, so the source file must live somewhere `staticfiles` can find it.

## Running the apps individually (without Docker)

Useful for active development, since it gives faster reload loops than rebuilding containers.

1. Start Postgres and Redis yourself (locally installed or via Docker), then follow the backend's [Running locally](dual_dataset_visualisation/README.md#running-locally) instructions — this starts the Django dev server **and** a Celery worker (both required).
2. In a separate terminal, follow the frontend's [Getting Started](dual_dataset_visualisation_frontend/README.md#getting-started) instructions, pointing `NEXT_PUBLIC_API_BASE_URL` at the backend (defaults to `http://127.0.0.1:8000/api`).

Each app has its own `.env` — the backend needs DB/Celery connection details, the frontend needs the API base URL. See each app's README for the full list of variables.
