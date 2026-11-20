"""See what a choice of provinces costs before downloading anything.

    python plan_download.py --provinces coastal
    python plan_download.py --provinces region:Central,HaNoi
    python plan_download.py --provinces all

Prints, per split, how many files and gigabytes would be downloaded and how many clips
of the chosen provinces they hold. A file also carries clips of neighbouring provinces,
so the download is larger than the clips you keep. Colab's free disk is about 70 GB.
"""

from __future__ import annotations

import argparse

from vimd import DATASET_ID, DEFAULT_PROVINCES, SPLITS, check_provinces, load_index, parse_provinces, shards_for


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--provinces", default=DEFAULT_PROVINCES)
    args = parser.parse_args()

    from huggingface_hub import HfApi

    index = load_index()
    provinces = parse_provinces(args.provinces, index.get("regions"))
    check_provinces(provinces, index)

    sizes = {
        entry.path: entry.size
        for entry in HfApi().list_repo_tree(DATASET_ID, path_in_repo="data", repo_type="dataset")
        if getattr(entry, "size", None)
    }

    chosen = sorted(provinces) if provinces else "every province"
    print(f"Provinces ({len(provinces) if provinces else 63}): {', '.join(chosen) if provinces else chosen}\n")
    print(f"{'split':<8}{'files':>7}{'download':>12}{'clips kept':>13}")
    total_bytes = 0
    for split in SPLITS:
        files = shards_for(index, split, provinces)
        size = sum(sizes.get(path, 0) for path in files)
        kept = sum(
            count
            for path in files
            for province, count in index[split][path].items()
            if provinces is None or province in provinces
        )
        total_bytes += size
        print(f"{split:<8}{len(files):>7}{size / 1e9:>10.1f} GB{kept:>13}")
    print(f"{'total':<8}{'':>7}{total_bytes / 1e9:>10.1f} GB")


if __name__ == "__main__":
    main()
