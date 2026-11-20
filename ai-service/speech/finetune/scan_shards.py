"""Step 1: find out which parquet files hold which provinces, without downloading audio.

    python scan_shards.py                 # all splits (a few minutes, small downloads)
    python scan_shards.py --splits test   # just one split (also refreshes the region table)

Writes shard_index.json and prints, per province, how many rows each split has and
how many files it is spread over. Then `plan_download.py` tells what a choice of
provinces would cost to download.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict

from vimd import INDEX_FILE, REGIONS_KEY, SPLITS, list_shards, scan_shard


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--splits", nargs="+", default=list(SPLITS), choices=SPLITS)
    args = parser.parse_args()

    index = json.loads(INDEX_FILE.read_text(encoding="utf-8")) if INDEX_FILE.exists() else {}
    regions = dict(index.get(REGIONS_KEY, {}))

    for split in args.splits:
        shards = list_shards(split)
        print(f"{split}: scanning {len(shards)} files")
        index[split] = {}
        for number, path in enumerate(shards, 1):
            counts, found = scan_shard(path)
            index[split][path] = counts
            regions.update(found)
            print(f"  {number}/{len(shards)} {path}", end="\r", flush=True)
        print()
    index[REGIONS_KEY] = dict(sorted(regions.items()))

    INDEX_FILE.write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")

    rows: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    spread: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for split in SPLITS:
        for counts in index.get(split, {}).values():
            for province, count in counts.items():
                rows[province][split] += count
                spread[province][split] += 1

    print(f"\n{len(rows)} provinces. rows (files) per split:")
    print(f"{'province':<20}{'region':<9}" + "".join(f"{split:>16}" for split in SPLITS))
    for province in sorted(rows):
        cells = "".join(
            f"{rows[province].get(split, 0):>9} ({spread[province].get(split, 0):>2})" if split in index else f"{'-':>16}"
            for split in SPLITS
        )
        print(f"{province:<20}{regions.get(province, '?'):<9}{cells}")
    print(f"\nSaved {INDEX_FILE}")


if __name__ == "__main__":
    main()
