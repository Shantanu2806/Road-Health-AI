#!/usr/bin/env python3
"""
RDD2022 In-Place Extraction Script
Extracts country zip archives in-place with integrity checks, progress bars,
disk space safety checks, and summary reporting.
"""

import sys
import shutil
import zipfile
import argparse
from pathlib import Path
from typing import Optional, Tuple, Dict, List, Any

# Try importing tqdm for rich progress bar display; fallback cleanly if absent
try:
    from tqdm import tqdm
except ImportError:
    tqdm = None


COUNTRY_ZIP_NAMES = [
    "China_Drone.zip",
    "China_MotorBike.zip",
    "Czech.zip",
    "India.zip",
    "Japan.zip",
    "Norway.zip",
    "United_States.zip",
]


def format_bytes(size_bytes: int) -> str:
    """Format bytes into a human-readable string (KB, MB, GB)."""
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if abs(size_bytes) < 1024.0 or unit == "TB":
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} GB"


def get_disk_free_space(path: Path) -> int:
    """Return free disk space in bytes for the drive containing path."""
    try:
        usage = shutil.disk_usage(path.resolve())
        return usage.free
    except Exception:
        # Fallback to current directory or anchor drive
        try:
            return shutil.disk_usage(path.anchor or ".").free
        except Exception:
            return sys.maxsize


def find_dataset_directory(start_dir: Path) -> Optional[Path]:
    """
    Auto-detect the directory containing country zip files.
    Checks candidate relative locations, then searches recursively.
    """
    # Direct candidate paths
    candidates = [
        start_dir / "RDD2022_released_through_CRDDC2022",
        start_dir / "RDD2022_released_through_CRDDC2022" / "RDD2022",
        start_dir / "21431547" / "RDD2022_released_through_CRDDC2022" / "RDD2022",
        start_dir / "21431547" / "RDD2022_released_through_CRDDC2022",
        start_dir / "21431547",
        start_dir,
    ]

    for cand in candidates:
        if cand.is_dir():
            found_zips = [z.name for z in cand.glob("*.zip")]
            if any(name in found_zips for name in COUNTRY_ZIP_NAMES):
                return cand.resolve()

    # Recursive search if not found in top candidates
    for p in start_dir.rglob("*.zip"):
        if p.name in COUNTRY_ZIP_NAMES and p.parent.is_dir():
            return p.parent.resolve()

    return None


def fix_accidental_double_nesting(country_dir: Path, country_name: str) -> bool:
    """
    Detect and fix accidental double nesting like {Country}/{Country}/train/...
    caused by previous manual extractions. Moves files up to {Country}/.
    """
    nested_dir = country_dir / country_name
    if not nested_dir.is_dir():
        return False

    train_in_nested = (nested_dir / "train").is_dir()
    train_in_root = (country_dir / "train").is_dir()

    if train_in_nested and not train_in_root:
        print(f"  [FIX] Found nested folder '{country_dir.name}/{nested_dir.name}'. Moving contents up...")
        for item in nested_dir.iterdir():
            dest = country_dir / item.name
            if not dest.exists():
                shutil.move(str(item), str(dest))
        try:
            nested_dir.rmdir()
        except OSError:
            pass
        return True
    return False


def get_zip_expected_counts(zip_path: Path) -> Dict[str, int]:
    """
    Quickly read zip central directory to count expected images and xmls.
    Runs in < 0.1 seconds even on 10 GB zip files.
    """
    train_imgs = 0
    train_xmls = 0
    test_imgs = 0
    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            for name in zf.namelist():
                name_lower = name.lower()
                if "/train/images/" in name_lower and name_lower.endswith((".jpg", ".jpeg", ".png")):
                    train_imgs += 1
                elif "/train/annotations/xmls/" in name_lower and name_lower.endswith(".xml"):
                    train_xmls += 1
                elif "/test/images/" in name_lower and name_lower.endswith((".jpg", ".jpeg", ".png")):
                    test_imgs += 1
    except Exception:
        pass
    return {
        "train_imgs": train_imgs,
        "train_xmls": train_xmls,
        "test_imgs": test_imgs,
    }


def inspect_extracted_folder(country_dir: Path) -> Dict[str, int]:
    """Count existing files in an extracted country folder."""
    train_imgs_dir = country_dir / "train" / "images"
    train_xmls_dir = country_dir / "train" / "annotations" / "xmls"
    test_imgs_dir = country_dir / "test" / "images"

    train_imgs = 0
    if train_imgs_dir.is_dir():
        train_imgs = sum(1 for f in train_imgs_dir.glob("*") if f.is_file() and f.suffix.lower() in [".jpg", ".jpeg", ".png"])

    train_xmls = 0
    if train_xmls_dir.is_dir():
        train_xmls = sum(1 for f in train_xmls_dir.glob("*.xml") if f.is_file())

    test_imgs = 0
    if test_imgs_dir.is_dir():
        test_imgs = sum(1 for f in test_imgs_dir.glob("*") if f.is_file() and f.suffix.lower() in [".jpg", ".jpeg", ".png"])

    return {
        "train_imgs": train_imgs,
        "train_xmls": train_xmls,
        "test_imgs": test_imgs,
    }


def is_extraction_complete(
    country_dir: Path,
    zip_path: Optional[Path] = None,
    expected_counts: Optional[Dict[str, int]] = None
) -> Tuple[bool, str, Dict[str, int]]:
    """
    Check if a country folder is complete:
    - Has train/images and train/annotations/xmls
    - Has matching-ish counts between images and xmls
    - Verifies against expected counts from the zip if available
    """
    if not country_dir.is_dir():
        return False, "Directory does not exist", {"train_imgs": 0, "train_xmls": 0, "test_imgs": 0}

    # Fix accidental double nesting if present
    fix_accidental_double_nesting(country_dir, country_dir.name)

    counts = inspect_extracted_folder(country_dir)
    train_imgs = counts["train_imgs"]
    train_xmls = counts["train_xmls"]
    test_imgs = counts["test_imgs"]

    # Basic presence check
    if train_imgs == 0 and train_xmls == 0:
        return False, "No training images or XML annotations found", counts

    if train_imgs == 0:
        return False, "Missing training images", counts

    if train_xmls == 0:
        return False, "Missing XML annotations", counts

    # Check against zip if provided
    if expected_counts and expected_counts.get("train_imgs", 0) > 0:
        exp_imgs = expected_counts["train_imgs"]
        exp_xmls = expected_counts["train_xmls"]
        exp_test = expected_counts.get("test_imgs", 0)

        if train_imgs >= exp_imgs and train_xmls >= exp_xmls and (exp_test == 0 or test_imgs >= exp_test):
            return True, f"Verified complete against zip archive ({train_imgs:,} train imgs, {train_xmls:,} xmls, {test_imgs:,} test imgs)", counts
        elif train_imgs < exp_imgs or train_xmls < exp_xmls:
            return False, f"Partial extraction: found {train_imgs:,}/{exp_imgs:,} train imgs, {train_xmls:,}/{exp_xmls:,} xmls", counts

    # Matching-ish file count rule:
    # Train images and XML annotations should closely match (diff <= 5% or 10 files)
    count_diff = abs(train_imgs - train_xmls)
    max_allowed_diff = max(10, int(0.05 * max(train_imgs, train_xmls)))
    if count_diff <= max_allowed_diff:
        return True, f"Complete: matching train images ({train_imgs:,}) and XMLs ({train_xmls:,})", counts
    else:
        return False, f"Mismatched count: {train_imgs:,} train images vs {train_xmls:,} xml annotations", counts


def extract_zip(zip_path: Path, target_dir: Path) -> None:
    """
    Extract a zip file in-place into target_dir.
    Displays a real-time progress bar (tqdm) or periodic status updates.
    Ensures no extra nested subfolders are created.
    """
    with zipfile.ZipFile(zip_path, "r") as zf:
        members = zf.infolist()
        total_members = len(members)

        # Check member paths: do they already start with country_name/?
        # If all members start with {country}/, extracting to target_dir places them in target_dir/{country}/...
        # If not, extracting directly to target_dir / zip_path.stem prevents dumping files into target_dir root
        prefix = zip_path.stem.lower() + "/"
        has_root_prefix = all(m.filename.lower().startswith(prefix) for m in members if not m.filename.endswith("/"))

        extract_destination = target_dir if has_root_prefix else (target_dir / zip_path.stem)
        extract_destination.mkdir(parents=True, exist_ok=True)

        if tqdm is not None:
            with tqdm(
                total=total_members,
                desc=f"Extracting {zip_path.name}",
                unit="file",
                ncols=90,
                leave=True,
            ) as pbar:
                for member in members:
                    zf.extract(member, extract_destination)
                    pbar.update(1)
        else:
            print(f"Extracting {zip_path.name} ({total_members:,} files)...")
            log_interval = max(1, total_members // 20)
            for idx, member in enumerate(members, start=1):
                zf.extract(member, extract_destination)
                if idx % log_interval == 0 or idx == total_members:
                    pct = (idx / total_members) * 100
                    print(f"  [{zip_path.stem}] {pct:5.1f}% ({idx:,}/{total_members:,} files)")

    print(f"Extracting {zip_path.name}... done")


def print_disk_warning_box(free_bytes: int, needed_bytes: int, context_msg: str) -> None:
    """Print a highly visible warning block when disk space is tight."""
    free_str = format_bytes(free_bytes)
    needed_str = format_bytes(needed_bytes)
    border = "=" * 80
    print("\n" + border)
    print(" [!] DISK SPACE WARNING - ACTION RECOMMENDED")
    print(border)
    print(f" Context:             {context_msg}")
    print(f" Current Free Space:  {free_str}")
    print(f" Safe Space Needed:   {needed_str} (approx. 2x zip size for safe extraction)")
    print(" WARNING: Your disk free space is below the recommended safety buffer!")
    print(" Extraction might run out of disk space. Proceed with caution.")
    print(border + "\n")


def print_summary_table(summary_data: List[Dict[str, Any]]) -> None:
    """Print the final formatted summary table."""
    title = "RDD2022 Dataset Extraction Summary"
    border = "=" * 90
    sub_border = "-" * 90

    print("\n" + border)
    print(f"{title:^90}")
    print(border)
    print(f"{'Country':<20} {'Train Images':<16} {'Train XMLs':<16} {'Test Images':<16} {'Status':<18}")
    print(sub_border)

    total_train_imgs = 0
    total_train_xmls = 0
    total_test_imgs = 0

    for row in summary_data:
        country = row["country"]
        train_imgs = row["train_imgs"]
        train_xmls = row["train_xmls"]
        test_imgs = row["test_imgs"]
        status = row["status"]

        total_train_imgs += train_imgs
        total_train_xmls += train_xmls
        total_test_imgs += test_imgs

        train_imgs_str = f"{train_imgs:,}" if train_imgs > 0 else "0"
        train_xmls_str = f"{train_xmls:,}" if train_xmls > 0 else "0"
        test_imgs_str = f"{test_imgs:,}" if test_imgs > 0 else "0 (N/A)"

        print(f"{country:<20} {train_imgs_str:<16} {train_xmls_str:<16} {test_imgs_str:<16} {status:<18}")

    print(sub_border)
    tot_train_imgs_str = f"{total_train_imgs:,}"
    tot_train_xmls_str = f"{total_train_xmls:,}"
    tot_test_imgs_str = f"{total_test_imgs:,}"
    print(f"{'TOTAL':<20} {tot_train_imgs_str:<16} {tot_train_xmls_str:<16} {tot_test_imgs_str:<16}")
    print(border + "\n")


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract RDD2022 country zip archives in-place with resume and safety checks."
    )
    parser.add_argument(
        "--data-dir",
        type=str,
        default=None,
        help="Path to folder containing country .zip files (auto-detected if omitted)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force re-extraction of all archives, ignoring existing complete folders",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Scan and verify integrity without performing any extraction",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_arguments()

    print("=" * 80)
    print(" RDD2022 Dataset In-Place Extractor")
    print("=" * 80)

    # 1. Resolve dataset directory
    script_dir = Path(__file__).resolve().parent
    target_dir: Optional[Path] = None

    if args.data_dir:
        candidate = Path(args.data_dir).resolve()
        if candidate.is_dir():
            target_dir = candidate
        else:
            print(f"[ERROR] Specified --data-dir does not exist: {args.data_dir}")
            sys.exit(1)
    else:
        target_dir = find_dataset_directory(script_dir)
        if not target_dir:
            # Also try current working directory
            target_dir = find_dataset_directory(Path.cwd())

    if not target_dir or not target_dir.is_dir():
        print("[ERROR] Could not find RDD2022 dataset directory containing country zip files.")
        print("Please specify the path using: python extract_all.py --data-dir \"path/to/RDD2022\"")
        sys.exit(1)

    print(f"Dataset Directory: {target_dir}")

    # 2. Find all .zip files directly inside target_dir
    all_zips = sorted([
        f for f in target_dir.glob("*.zip")
        if f.is_file() and not f.name.startswith(".") and f.name != "21431547.zip"
    ])

    if not all_zips:
        print(f"[ERROR] No country .zip files found directly inside: {target_dir}")
        sys.exit(1)

    print(f"Found {len(all_zips)} zip archive(s): {', '.join(z.name for z in all_zips)}\n")

    # 3. Pre-flight check: scan completeness & disk space requirements
    planned_extractions: List[Tuple[Path, Path, Dict[str, int]]] = []
    summary_data: List[Dict[str, Any]] = []
    total_uncompressed_needed = 0
    total_zip_bytes_to_extract = 0

    print("Checking existing extractions and verifying files...")
    for zip_path in all_zips:
        country_name = zip_path.stem
        country_dir = target_dir / country_name

        # Read zip metadata for expected counts
        expected = get_zip_expected_counts(zip_path)

        if args.force:
            is_complete = False
            reason = "Forced re-extraction (--force flag passed)"
            counts = inspect_extracted_folder(country_dir)
        else:
            is_complete, reason, counts = is_extraction_complete(country_dir, zip_path, expected)

        if is_complete:
            print(f"  [SKIP] {country_name}: {reason}")
            summary_data.append({
                "country": country_name,
                "train_imgs": counts["train_imgs"],
                "train_xmls": counts["train_xmls"],
                "test_imgs": counts["test_imgs"],
                "status": "Complete (Skipped)",
            })
        else:
            if country_dir.is_dir():
                print(f"  [QUEUE] {country_name}: {reason}. Will re-extract.")
            else:
                print(f"  [QUEUE] {country_name}: Not extracted yet.")

            zip_size = zip_path.stat().st_size
            total_zip_bytes_to_extract += zip_size
            planned_extractions.append((zip_path, country_dir, expected))

    # 4. Check disk space safety buffer
    free_space = get_disk_free_space(target_dir)
    safe_buffer_needed = 2 * total_zip_bytes_to_extract

    print("\n" + "-" * 80)
    print(f"Disk Space Pre-Flight Check (Drive {target_dir.anchor or 'Current'}):")
    print(f"  Available Free Space:  {format_bytes(free_space)}")
    print(f"  Pending Zip Archives:  {len(planned_extractions)} file(s) ({format_bytes(total_zip_bytes_to_extract)})")
    print(f"  Safe Buffer (2x Zips): {format_bytes(safe_buffer_needed)}")

    if planned_extractions and free_space < safe_buffer_needed:
        print_disk_warning_box(
            free_space,
            safe_buffer_needed,
            f"Pre-flight check before extracting {len(planned_extractions)} archive(s)"
        )
    else:
        print("  Status: [OK] Sufficient free space available for extraction.")
    print("-" * 80 + "\n")

    if args.dry_run:
        # Populate dry-run table with pending status for queued archives
        dry_run_summary = list(summary_data)
        for zip_path, country_dir, expected in planned_extractions:
            curr_counts = inspect_extracted_folder(country_dir)
            dry_run_summary.append({
                "country": zip_path.stem,
                "train_imgs": curr_counts["train_imgs"],
                "train_xmls": curr_counts["train_xmls"],
                "test_imgs": curr_counts["test_imgs"],
                "status": "Pending",
            })
        dry_run_summary.sort(key=lambda x: x["country"].lower())
        print("[DRY RUN] Current dataset status (no files extracted):")
        print_summary_table(dry_run_summary)
        return

    # 5. Perform extractions
    for zip_path, country_dir, expected in planned_extractions:
        zip_size = zip_path.stat().st_size
        safe_space_this_zip = 2 * zip_size
        current_free = get_disk_free_space(target_dir)
        is_big_extraction = zip_path.stem in ["Norway", "India", "Japan"] or zip_size >= 500 * 1024 * 1024

        # Check disk space before each extraction, especially big ones (Norway, India, Japan)
        if current_free < safe_space_this_zip:
            print_disk_warning_box(
                current_free,
                safe_space_this_zip,
                f"LOW DISK SPACE before extracting {zip_path.name} ({format_bytes(zip_size)})"
            )
        elif is_big_extraction:
            print(f"[DISK CHECK] Large archive {zip_path.name} ({format_bytes(zip_size)}): "
                  f"Free drive space = {format_bytes(current_free)} (Required ~2x: {format_bytes(safe_space_this_zip)}) -> OK")

        try:
            extract_zip(zip_path, target_dir)
            status_text = "Complete (Extracted)"
        except KeyboardInterrupt:
            print(f"\n[INTERRUPTED] Extraction cancelled by user on {zip_path.name}.")
            print("You can safely re-run this script later to resume/re-extract.")
            sys.exit(130)
        except Exception as err:
            print(f"[ERROR] Failed extracting {zip_path.name}: {err}")
            status_text = "Failed"

        # Fix accidental nesting if any tool or zip structure nested it
        fix_accidental_double_nesting(country_dir, country_dir.name)

        # Inspect final file counts
        counts = inspect_extracted_folder(country_dir)
        summary_data.append({
            "country": country_dir.name,
            "train_imgs": counts["train_imgs"],
            "train_xmls": counts["train_xmls"],
            "test_imgs": counts["test_imgs"],
            "status": status_text,
        })

    # Sort summary by country name
    summary_data.sort(key=lambda x: x["country"].lower())

    # 6. Print final summary table
    print_summary_table(summary_data)
    print("Done! Original .zip files have been preserved as backup.")


if __name__ == "__main__":
    main()
