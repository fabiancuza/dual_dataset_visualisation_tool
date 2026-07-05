import os
import pandas as pd
import loguru
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from concurrent.futures import ThreadPoolExecutor, as_completed

from django.core.management.base import BaseCommand
from django.contrib.staticfiles import finders

from dual_dataset_visualisation.api.models import Postcode, District, Municipality, Province, Neighborhood
from dual_dataset_visualisation.api.utils.normalize_postcode import normalize_postcode


PDOK = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/free"


def make_session() -> requests.Session:
    s = requests.Session()
    retry = Retry(
        total=6,
        backoff_factor=0.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET",),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=50, pool_maxsize=50)
    s.mount("https://", adapter)
    s.headers.update({"User-Agent": "postcode-loader/1.0"})
    return s


def fetch_pdok_one(session: requests.Session, pc4: str) -> dict | None:
    """
    pc4 is '0000'..'9999'. We query an address doc whose postcode starts with pc4.
    """
    pc4 = str(pc4).strip()
    if not (len(pc4) == 4 and pc4.isdigit()):
        return None

    params = {
        # Query: postcode:1234* (prefix match)
        "q": f"postcode:{pc4}*",
        "fq": "type:adres",
        "qf": "postcode",
        "rows": 1,
        # Keep response small
        "fl": ",".join([
            "postcode",
            "provincienaam", "gemeentenaam", "wijknaam", "buurtnaam",
            "provinciecode", "gemeentecode", "wijkcode", "buurtcode",
        ]),
    }

    r = session.get(PDOK, params=params, timeout=15)
    if r.status_code != 200:
        return None

    data = r.json()
    docs = data.get("response", {}).get("docs", [])
    return docs[0] if docs else None


def create_province_if_not_exists(
        province_name: str,
        province_code: str
) -> Province:
    try:
        province = Province.objects.get(code=province_code)
    except Province.DoesNotExist:
        province = Province.objects.create(
            code=province_code,
            name=province_name
        )
    return province


def create_municipality_if_not_exists(
        municipality_name: str,
        municipality_code: str,
        province_name: str,
        province_code: str
) -> Municipality:
    try:
        municipality = Municipality.objects.get(code=municipality_code)
    except Municipality.DoesNotExist:
        province = create_province_if_not_exists(
            province_name,
            province_code
        )
        municipality = Municipality.objects.create(
            code=municipality_code,
            name=municipality_name,
            province=province
        )
    return municipality


def create_district_if_not_exists(
        district_name: str,
        district_code: str,
        municipality_name: str,
        municipality_code: str,
        province_name: str,
        province_code: str
) -> District:
    try:
        district = District.objects.get(code=district_code)
    except District.DoesNotExist:
        municipality = create_municipality_if_not_exists(
            municipality_name,
            municipality_code,
            province_name,
            province_code
        )
        district = District.objects.create(
            code=district_code,
            name=district_name,
            municipality=municipality
        )
    return district


def create_neighborhood_if_not_exists(
    neighborhood_name: str,
    neighborhood_code: str,
    district_name: str,
    district_code: str,
    municipality_name: str,
    municipality_code: str,
    province_name: str,
    province_code: str
) -> Postcode:
    try:
        neighborhood = Neighborhood.objects.get(code=neighborhood_code)
    except Neighborhood.DoesNotExist:
        district = create_district_if_not_exists(
            district_name,
            district_code,
            municipality_name,
            municipality_code,
            province_name,
            province_code
        )
        neighborhood = Neighborhood.objects.create(
            code=neighborhood_code,
            name=neighborhood_name,
            district=district
        )
    return neighborhood


class Command(BaseCommand):
    help = "Load postcodes into the database"

    def add_arguments(self, parser):
        parser.add_argument("--file", type=str, required=True)
        parser.add_argument("--postcode_field", type=str, required=True)
        parser.add_argument("--workers", type=int, default=8)  # tune: 4–16
        parser.add_argument("--chunk", type=int, default=1000)  # bulk_create chunk size

    def handle(self, *args, **options):
        file_path = finders.find(options["file"])
        if not file_path:
            loguru.logger.error(f"File {options['file']} not found.")
            return

        if ".csv" not in file_path.lower() and ".gpkg" not in file_path.lower():
            loguru.logger.error("Only CSV or GPKG files are supported.")
            return

        if ".gpkg" in file_path.lower():
            loguru.logger.info(f"Converting GPKG to CSV... ({file_path})")
            output_file = file_path.rsplit(".", 1)[0] + ".csv"
            os.system(f'ogr2ogr -f CSV "{output_file}" "{file_path}"')
            file_path = output_file

        loguru.logger.info(f"Loading postcodes from {file_path}")
        df = pd.read_csv(file_path, dtype=str)

        field = options["postcode_field"]
        if field not in df.columns:
            loguru.logger.error(f"Postcode field {field} not found in file.")
            return

        # Unique 4-digit prefixes
        pc = df[field].astype(str)
        pc4 = pc.str.replace(r"\s+", "", regex=True).str.upper().str.slice(0, 4)
        postcodes = pc4.dropna().drop_duplicates().tolist()

        # Optional: skip ones already in DB (if postcode stored as 1234XX you can store prefix too)
        # Here we assume Postcode.postcode stores normalized full postcode; adjust as needed.
        existing_prefixes = set(
            Postcode.objects.values_list("postcode", flat=True)
        )
        # If you store only 4 digits in DB, keep it. Otherwise remove this filter.
        # postcodes = [p for p in postcodes if p not in existing_prefixes]

        loguru.logger.info(f"Found {len(postcodes)} unique 4-digit postcodes to process.")

        session = make_session()
        workers = max(1, int(options["workers"]))
        chunk_size = max(1, int(options["chunk"]))

        to_create: list[Postcode] = []

        with ThreadPoolExecutor(max_workers=workers) as ex:
            futures = {ex.submit(fetch_pdok_one, session, pc4): pc4 for pc4 in postcodes}

            done = 0
            for fut in as_completed(futures):
                pc4 = futures[fut]
                done += 1

                try:
                    doc = fut.result()
                except Exception as e:
                    loguru.logger.warning(f"({done}/{len(postcodes)}) {pc4}: error {e}")
                    continue

                if not doc:
                    loguru.logger.info(f"({done}/{len(postcodes)}) No result for {pc4}")
                    continue

                full_pc = doc.get("postcode")  # e.g. "1234AB"
                if not full_pc:
                    continue

                obj = Postcode(
                    postcode=normalize_postcode(full_pc),
                    neighborhood=create_neighborhood_if_not_exists(
                        neighborhood_name=doc.get("buurtnaam", "Unknown"),
                        neighborhood_code=doc.get("buurtcode", "000000"),
                        district_name=doc.get("wijknaam", "Unknown"),
                        district_code=doc.get("wijkcode", "000000"),
                        municipality_name=doc.get("gemeentenaam", "Unknown"),
                        municipality_code=doc.get("gemeentecode", "000"),
                        province_name=doc.get("provincienaam", "Unknown"),
                        province_code=doc.get("provinciecode", "00"),
                    )
                )
                to_create.append(obj)

                if len(to_create) >= chunk_size:
                    Postcode.objects.bulk_create(to_create, ignore_conflicts=True)
                    to_create.clear()

                if done % 50 == 0:
                    loguru.logger.info(f"Progress: {done}/{len(postcodes)}")

        if to_create:
            Postcode.objects.bulk_create(to_create, ignore_conflicts=True)

        loguru.logger.info("Finished loading postcodes.")
