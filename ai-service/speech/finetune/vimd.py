"""Shared helpers for the ViMD dialect-ASR experiment.

ViMD (https://huggingface.co/datasets/nguyendv02/ViMD_Dataset) is about 60 GB of
Vietnamese speech from 63 provinces. Its parquet files are not grouped by
province, so these helpers first read only the small `province_name` and `region`
columns of each file, and later download just the files that hold the provinces we need.

Licence: CC BY-NC-ND 4.0 (non-commercial, no derivatives). Use it for coursework
and research only; do not ship a model trained on it inside a commercial product.

Choosing provinces (everywhere a script takes --provinces / --train-provinces):
    QuangNgai,KhanhHoa     names, written without accents (see shard_index.json)
    coastal                the 28 coastal provinces, the ones a seafood trade cares about
    region:Central         every province of a region (North, Central or South)
    all                    every province (about 60 GB: only for a big GPU box)
Tokens can be mixed: coastal,HaNoi
"""

from __future__ import annotations

import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

DATASET_ID = "nguyendv02/ViMD_Dataset"
SPLITS = ("train", "valid", "test")
SAMPLE_RATE = 16_000

# A small default for quick trials and smoke tests; use `coastal` for a real run.
DEFAULT_PROVINCES = "QuangNgai,KhanhHoa,BaRiaVungTau"

# Provinces with a sea coast (the 63-province map the dataset uses).
COASTAL_PROVINCES = (
    "QuangNinh", "HaiPhong", "ThaiBinh", "NamDinh", "NinhBinh", "ThanhHoa", "NgheAn",
    "HaTinh", "QuangBinh", "QuangTri", "ThuaThienHue", "DaNang", "QuangNam", "QuangNgai",
    "BinhDinh", "PhuYen", "KhanhHoa", "NinhThuan", "BinhThuan", "BaRiaVungTau", "HoChiMinh",
    "TienGiang", "BenTre", "TraVinh", "SocTrang", "BacLieu", "CaMau", "KienGiang",
)
PRESETS = {"coastal": COASTAL_PROVINCES}

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
# Kept in git (it is small), so Colab does not have to scan the whole repository again.
INDEX_FILE = ROOT / "shard_index.json"
REGIONS_KEY = "regions"  # {province: region} next to the per-split tables in the index


def normalize_text(text: str) -> str:
    """Text as compared for WER: NFC, lower case, no punctuation, single spaces.

    Both the reference and the model output go through this, so a missing comma or
    a capital letter is not counted as a recognition error. Tone marks are kept,
    because a wrong tone is a real error in Vietnamese.
    """
    text = unicodedata.normalize("NFC", text).lower()
    text = re.sub(r"[^\w\s]", " ", text, flags=re.UNICODE)
    return re.sub(r"\s+", " ", text).strip()


def list_shards(split: str) -> list[str]:
    """Repository paths of the parquet files of one split, e.g. data/test-00000-of-00014.parquet."""
    from huggingface_hub import HfApi

    paths = HfApi().list_repo_files(DATASET_ID, repo_type="dataset")
    return sorted(p for p in paths if p.startswith(f"data/{split}-") and p.endswith(".parquet"))


def scan_shard(path: str) -> tuple[dict[str, int], dict[str, str]]:
    """(rows per province, region per province) of one parquet file. Reads no audio."""
    import pyarrow.parquet as pq
    from huggingface_hub import HfFileSystem

    fs = HfFileSystem()
    with fs.open(f"datasets/{DATASET_ID}/{path}", "rb") as handle:
        table = pq.ParquetFile(handle).read(columns=["province_name", "region"])
    names = table.column("province_name").to_pylist()
    regions = dict(zip(names, table.column("region").to_pylist()))
    return dict(Counter(names)), regions


def load_index() -> dict:
    """{split: {shard path: {province: rows}}, 'regions': {province: region}} saved by scan_shards.py."""
    if not INDEX_FILE.exists():
        raise SystemExit("No shard index yet. Run: python scan_shards.py")
    return json.loads(INDEX_FILE.read_text(encoding="utf-8"))


def shards_for(index: dict, split: str, provinces: set[str] | None) -> list[str]:
    """Shards of a split that hold at least one of the provinces (all shards when provinces is None)."""
    shards = index.get(split, {})
    if provinces is None:
        return sorted(shards)
    return sorted(path for path, counts in shards.items() if provinces & set(counts))


def parse_provinces(value: str | None, regions: dict[str, str] | None = None) -> set[str] | None:
    """'coastal,HaNoi' or 'region:Central' or 'all' -> a set of province names (None = every province).

    `regions` maps province -> region; it is read from the index when a region is asked for.
    """
    if not value or value.strip().lower() == "all":
        return None

    names: set[str] = set()
    for token in (t.strip() for t in value.split(",")):
        if not token:
            continue
        key = token.lower()
        if key == "all":
            return None
        if key in PRESETS:
            names.update(PRESETS[key])
        elif key.startswith("region:"):
            wanted = key.split(":", 1)[1]
            table = regions if regions is not None else load_index().get(REGIONS_KEY)
            if not table:
                raise SystemExit("The index has no region table yet. Run: python scan_shards.py --splits test")
            found = {p for p, r in table.items() if r.lower() == wanted}
            if not found:
                raise SystemExit(f"Unknown region '{wanted}'. Use North, Central or South.")
            names.update(found)
        else:
            names.add(token)
    return names


def check_provinces(provinces: set[str] | None, index: dict | None = None) -> None:
    """Stop with the list of valid names when a name is misspelt (they are easy to get wrong without accents)."""
    if not provinces:
        return
    index = index if index is not None else load_index()
    known = set(index.get(REGIONS_KEY, {}))
    unknown = sorted(provinces - known) if known else []
    if unknown:
        raise SystemExit(f"Unknown province name(s): {', '.join(unknown)}.\nValid names: {', '.join(sorted(known))}")


def load_subset(split: str, provinces: set[str] | None):
    """One split as a datasets.Dataset at 16 kHz, limited to the given provinces.

    Downloads only the parquet files that hold those provinces (about 0.4 GB each).
    """
    from datasets import Audio, load_dataset
    from huggingface_hub import hf_hub_download

    index = load_index()
    check_provinces(provinces, index)
    files = shards_for(index, split, provinces)
    if not files:
        raise SystemExit(f"No file of the {split} split holds {sorted(provinces or [])}.")
    local = [hf_hub_download(DATASET_ID, path, repo_type="dataset") for path in files]
    dataset = load_dataset("parquet", data_files=local, split="train")
    if provinces:
        dataset = dataset.filter(lambda name: name in provinces, input_columns="province_name")
    return dataset.cast_column("audio", Audio(sampling_rate=SAMPLE_RATE))
