# Dual Dataset Visualisation Tool

A Django + Django REST Framework backend for comparing an **original** dataset against a **synthetic** (e.g. anonymized/generated) version of it, geographically. Users upload two CSV files that share a postcode column; the backend matches each row to a Dutch postcode/administrative region, then exposes aggregated statistics (mean, sum, variance, median, etc.) per region so the two datasets can be visualised and compared side by side.

## How it works

1. A `Dataset` is created via the API with an `original_file` and `synthetic_file` (both CSVs, same columns) and a `postcode_field` naming which column holds the postcode.
2. Saving a new `Dataset` automatically queues a Celery task (`process_dataset`, see [tasks.py](dual_dataset_visualisation/api/tasks.py)) which, for each file:
   - Streams the CSV in chunks (`CHUNK_SIZE`) with pandas.
   - Normalizes the postcode column (strips to digits only, see [normalize_postcode.py](dual_dataset_visualisation/api/utils/normalize_postcode.py)).
   - Resolves each postcode against the known `Postcode` table. If there's no exact match, it tries correcting the last digit, then the last two digits, before giving up (see `resolve_postcode_digits_only`). Rows that only matched after correction are flagged (`DatasetRow.flagged`); rows that couldn't be resolved at all are recorded in `PostcodeError` / `PostcodeErrorReport` and dropped.
   - Bulk-inserts the results as `DatasetRow` records linked to the resolved `Postcode`.
   - Sets `Dataset.status` to `completed` or `failed` and records `unmatched_rows_count`.
3. Once processing is complete, `GET /api/datasets/{id}/visualize/` aggregates `DatasetRow.row_data` (a JSON blob of the original CSV row) grouped by municipality or province, for both the original and synthetic rows, using the [Aggregator](dual_dataset_visualisation/api/utils/aggregator.py). For difference-style aggregate functions (`MEAN_DIFFERENCE`, `VAR_DIFFERENCE`) it also returns a per-region `difference` (synthetic − original) via the [DifferenceCalculator](dual_dataset_visualisation/api/utils/difference_calculator.py).

### Data model

```
Province ← Municipality ← District ← Neighborhood ← Postcode ← DatasetRow → Dataset
                                                                 PostcodeError ← PostcodeErrorReport → Dataset
```

- `Province` / `Municipality` / `District` / `Neighborhood` form the Dutch administrative hierarchy (loaded once via a management command, not per-dataset).
- `Postcode` maps a normalized 4-digit postcode to a `Neighborhood`.
- `Dataset` holds the two uploaded files and processing status.
- `DatasetRow` holds one CSV row (as JSON) tagged `original` or `synthetic`, linked to the `Postcode` it resolved to.
- `PostcodeError` / `PostcodeErrorReport` log postcodes from uploaded files that couldn't be resolved to a known `Postcode`, per dataset.

## Requirements

- Python 3.12
- PostgreSQL (aggregation uses a Postgres-only `PERCENTILE_CONT` expression, see [aggregator.py](dual_dataset_visualisation/api/utils/aggregator.py) — other databases are not supported)
- Redis (Celery broker + result backend)
- GDAL / `ogr2ogr` (only needed if seeding postcodes from a `.gpkg` file instead of CSV)

## Environment variables

Create a `.env` file in the project root (loaded automatically by [settings.py](dual_dataset_visualisation/settings.py)):

| Variable | Default | Purpose |
|---|---|---|
| `DB_NAME` | — | Postgres database name |
| `DB_USER` | — | Postgres user |
| `DB_PASSWORD` | — | Postgres password |
| `DB_HOST` | `localhost` | Postgres host |
| `DB_PORT` | `5432` | Postgres port |
| `CELERY_BROKER_URL` | `redis://localhost:6379/0` | Celery broker |
| `CELERY_RESULT_BACKEND` | `redis://localhost:6379/1` | Celery result backend |

Note: `SECRET_KEY` and `DEBUG` are currently hardcoded in `settings.py` — treat this as a dev-only configuration and harden it (env-driven secret key, `DEBUG=False`, restricted `ALLOWED_HOSTS`/`CORS_ALLOW_ALL_ORIGINS`) before deploying anywhere public.

## Running locally

Postgres and Redis need to be available separately (locally installed, Docker containers you start yourself, or managed services) and pointed to via the env vars above.

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

python manage.py migrate

# Terminal 1: API server
python manage.py runserver

# Terminal 2: Celery worker (required — dataset uploads are processed asynchronously)
celery -A dual_dataset_visualisation worker -l info
```

The API is then available at `http://localhost:8000/api/`, with interactive docs at `http://localhost:8000/swagger/`.

## Seeding reference data

Datasets can only be processed once the `Postcode`/`Province`/`Municipality`/`District`/`Neighborhood` tables are populated. Use the `load_postcodes` management command, which reads unique postcodes from a CSV (or a `.gpkg`, converted via `ogr2ogr`) and looks each one up against the [PDOK](https://www.pdok.nl/) (Dutch government geocoding) API to resolve its administrative region:

```bash
python manage.py load_postcodes --file <path-found-via-staticfiles> --postcode_field <column_name> [--workers 8] [--chunk 1000]
```

`--file` is resolved via Django's static files finder, so the source file must live somewhere `staticfiles` can find it.

Other management commands:

- `clear_postcodes` — deletes all `Postcode` rows.
- `clear_dataset_rows` — deletes all `DatasetRow` rows.

## API overview

Routed in [urls.py](dual_dataset_visualisation/api/urls.py), full schema at `/swagger/`:

- `GET/POST /api/datasets/` — list/create datasets. `POST` accepts `original_file`, `synthetic_file`, `name`, `postcode_field`.
- `GET /api/datasets/{id}/` — dataset detail, including row counts (`original_rows_count`, `synthetic_rows_count`, `flagged_rows_count`), a small preview of each file's rows, and the list of numeric `columns` available for visualisation (postcode field excluded).
- `GET /api/datasets/{id}/visualize/?visualisation_level=&aggregate_function=&field_name=` — aggregated values per region for both datasets (see [AggregateFunctions](dual_dataset_visualisation/api/utils/aggregate_functions.py) and [VisualisationLevel](dual_dataset_visualisation/api/utils/visualisation_level.py) for valid values). Requires the dataset to already have both original and synthetic rows processed.
- `POST /api/datasets/validate-files/` — pre-upload validation: checks both files are CSV, UTF-8, non-empty, with matching column sets, and returns the original file's header columns.
- `GET /api/utils/aggregate-functions/` — list of supported aggregate functions.
- `GET /api/administrative-regions/provinces/`, `GET /api/administrative-regions/municipalities/` — reference data lookups.

### Aggregate functions

`AVG`, `SUM`, `MIN`, `MAX`, `COUNT`, `MEDIAN`, `VAR` aggregate a numeric field per region for one dataset side. `COUNT_NAN` counts rows where the field is missing or non-numeric. `MEAN_DIFFERENCE` / `VAR_DIFFERENCE` compute `AVG`/`VAR` for both original and synthetic sides and additionally return a per-region difference (synthetic − original).
