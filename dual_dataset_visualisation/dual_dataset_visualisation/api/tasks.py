from celery import shared_task
from django.db import transaction
import pandas as pd
import loguru

from .models import DatasetRow, Postcode, Dataset, PostcodeErrorReport
from .models.dataset import DatasetStatus
from .models.dataset_row import DatasetRowType
from .utils.normalize_postcode import normalize_postcode

BATCH_SIZE = 5000
CHUNK_SIZE = 50_000  # tune for memory/throughput


def resolve_postcode_digits_only(s: str, all_postcodes: set[str], dataset: Dataset):
    """
    s: digits-only string (already normalized)
    returns a postcode string that exists in all_postcodes, or None
    """
    if not s:
        return None, False
    s = str(s).strip()
    if not s.isdigit():
        return None, False
    if len(s) < 4:
        s = s.zfill(4)

    if s in all_postcodes:
        return s, True

    # change last digit
    prefix = s[:-1]
    orig_last = s[-1]
    for d in "0123456789":
        if d == orig_last:
            continue
        cand = prefix + d
        if cand in all_postcodes:
            return cand, False

    # change last two digits
    prefix2 = s[:-2]
    orig_last2 = s[-2:]
    for x in range(100):
        last2 = f"{x:02d}"
        if last2 == orig_last2:
            continue
        cand = prefix2 + last2
        if cand in all_postcodes:
            return cand, False

    PostcodeErrorReport.create_report(
        postcode=s,
        dataset=dataset
    )

    return None, False


def count_csv_rows_path(path: str) -> int:
    with open(path, "rb") as f:
        return max(sum(1 for _ in f) - 1, 0)


def count_csv_rows_fieldfile(field_file) -> int | None:
    try:
        field_file.open("rb")
        try:
            return max(sum(1 for _ in field_file) - 1, 0)
        finally:
            field_file.close()
    except Exception:
        return None


def process_individual_dataset_fast(dataset, dataset_row_type):
    file = dataset.original_file if dataset_row_type == DatasetRowType.ORIGINAL else dataset.synthetic_file

    # Load all postcodes once
    all_postcodes = set(Postcode.objects.values_list("postcode", flat=True))

    path = getattr(file, "path", None)
    if path:
        total_rows = count_csv_rows_path(path)
        loguru.logger.info(f"Starting {dataset.name} ({dataset_row_type}) — {total_rows:,} rows")
    else:
        # Any storage (S3 etc.)
        total_rows = count_csv_rows_fieldfile(file)
        if total_rows is not None:
            loguru.logger.info(f"Starting {dataset.name} ({dataset_row_type}) — {total_rows:,} rows")
        else:
            loguru.logger.info(f"Starting {dataset.name} ({dataset_row_type}) — total rows unknown")

    # Optional: cache resolutions for repeated inputs
    resolution_cache: dict[str, tuple[str | None, bool]] = {}

    total_unresolved = 0

    # Read CSV in chunks
    for chunk in pd.read_csv(file, chunksize=CHUNK_SIZE):
        if dataset.postcode_field not in chunk.columns:
            raise ValueError(f"Postcode field '{dataset.postcode_field}' not found in dataset columns.")

        # Normalize postcode column (vector-ish: apply still loops in Python, but only over one column)
        raw_pc = chunk[dataset.postcode_field]

        # normalize_postcode is your function; apply only on the column, not the whole row
        norm_pc = raw_pc.apply(normalize_postcode)

        # Resolve with cache + in-memory set
        def resolve_one(x):
            if x is None:
                return None, False
            key = str(x)
            if key in resolution_cache:
                return resolution_cache[key]
            resolved, identical = resolve_postcode_digits_only(key, all_postcodes, dataset)
            resolution_cache[key] = (resolved, identical)
            return resolved, identical

        resolved_val = norm_pc.apply(resolve_one)
        resolved_pc = resolved_val.apply(lambda x: x[0])
        none_count = resolved_pc.isna().sum()
        total_unresolved += none_count
        resolved_identical = resolved_val.apply(lambda x: x[1])

        # Keep only rows that resolved
        ok_mask = resolved_pc.notna()
        if not ok_mask.any():
            continue

        chunk_ok = chunk.loc[ok_mask].copy()
        resolved_ok = resolved_pc.loc[ok_mask].astype(str)
        identical_ok = resolved_identical.loc[ok_mask]

        # Fetch all Postcode objects needed for this chunk in ONE query
        needed = resolved_ok.unique().tolist()
        pc_map = Postcode.objects.in_bulk(needed, field_name="postcode")  # postcode -> Postcode

        objs = []
        # iterating here is OK: it's now only object construction + dict conversion,
        # no DB work per row.
        for i, row in chunk_ok.iterrows():
            row_dict = row.to_dict()
            pc_str = str(resolved_pc.loc[i])
            pc_obj = pc_map.get(pc_str)
            if not pc_obj:
                continue

            objs.append(DatasetRow(
                dataset=dataset,
                type=dataset_row_type,
                postcode=pc_obj,
                row_data=row_dict,
                flagged=not bool(resolved_identical.loc[i]),
            ))

            if len(objs) >= BATCH_SIZE:
                DatasetRow.objects.bulk_create(objs, batch_size=BATCH_SIZE)
                objs.clear()

        if objs:
            DatasetRow.objects.bulk_create(objs, batch_size=BATCH_SIZE)

    dataset.unmatched_rows_count = total_unresolved
    dataset.save()
    loguru.logger.info(f"Completed processing dataset {dataset.name} ({dataset_row_type})")


@shared_task
def process_dataset(dataset_id):
    dataset = Dataset.objects.get(id=dataset_id)
    try:
        process_individual_dataset_fast(dataset, DatasetRowType.ORIGINAL)
        process_individual_dataset_fast(dataset, DatasetRowType.SYNTHETIC)
        dataset.status = DatasetStatus.COMPLETED
    except Exception as e:
        loguru.logger.error(f"Error processing dataset {dataset.name}: {e}")
        dataset.status = DatasetStatus.FAILED
    dataset.save()
