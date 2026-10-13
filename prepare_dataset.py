#!/usr/bin/env python3
"""
RDD2022 Dataset Preparation Script for YOLOv8
Converts Pascal VOC annotations to YOLO format, filters for classes D00/D10/D20/D40,
performs country-stratified 80/10/10 splitting, and structures output into dataset_yolo/.

Only requires Python standard library + Pillow + tqdm.
"""

import sys
import shutil
import random
import argparse
import xml.etree.ElementTree as ET
from pathlib import Path
from collections import Counter, defaultdict
from typing import Optional, Tuple, Dict, List, Any

try:
    from PIL import Image
except ImportError:
    Image = None

try:
    from tqdm import tqdm
except ImportError:
    tqdm = None


# Target class mapping: D00=0, D10=1, D20=2, D40=3
VALID_CLASSES = {"D00": 0, "D10": 1, "D20": 2, "D40": 3}
CLASS_NAMES = ["D00", "D10", "D20", "D40"]

COUNTRY_NAMES = [
    "China_Drone",
    "China_MotorBike",
    "Czech",
    "India",
    "Japan",
    "Norway",
    "United_States",
]


def find_rdd2022_directory(start_dir: Path) -> Optional[Path]:
    """
    Auto-detect the RDD2022 dataset directory containing country folders.
    """
    candidates = [
        start_dir / "21431547" / "RDD2022_released_through_CRDDC2022" / "RDD2022",
        start_dir / "RDD2022_released_through_CRDDC2022" / "RDD2022",
        start_dir / "RDD2022_released_through_CRDDC2022",
        start_dir / "RDD2022",
        start_dir,
    ]

    for cand in candidates:
        if cand.is_dir():
            # Check if it contains at least one country folder with train/images
            if any((cand / c / "train" / "images").is_dir() for c in COUNTRY_NAMES):
                return cand.resolve()

    # Recursive search
    for p in start_dir.rglob("RDD2022"):
        if p.is_dir() and any((p / c / "train" / "images").is_dir() for c in COUNTRY_NAMES):
            return p.resolve()

    return None


def parse_voc_xml(xml_path: Path, img_path: Path) -> Tuple[List[str], List[str]]:
    """
    Parse Pascal VOC XML and convert valid bounding boxes (D00/D10/D20/D40) to YOLO format.
    Returns:
        (yolo_lines, valid_class_names)
    """
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
    except Exception as e:
        return [], []

    # Get image dimensions from <size> tag
    img_w, img_h = 0, 0
    size_elem = root.find("size")
    if size_elem is not None:
        try:
            w_elem = size_elem.find("width")
            h_elem = size_elem.find("height")
            if w_elem is not None and h_elem is not None:
                img_w = int(float(w_elem.text))
                img_h = int(float(h_elem.text))
        except (ValueError, TypeError):
            img_w, img_h = 0, 0

    # Fallback to Pillow if width or height missing/invalid
    if img_w <= 0 or img_h <= 0:
        if Image is not None and img_path.is_file():
            try:
                with Image.open(img_path) as im:
                    img_w, img_h = im.size
            except Exception:
                return [], []
        else:
            return [], []

    yolo_lines = []
    valid_class_names = []

    for obj in root.findall("object"):
        name_elem = obj.find("name")
        if name_elem is None or not name_elem.text:
            continue

        class_name = name_elem.text.strip()
        if class_name not in VALID_CLASSES:
            continue

        bndbox = obj.find("bndbox")
        if bndbox is None:
            continue

        try:
            xmin = float(bndbox.find("xmin").text)
            ymin = float(bndbox.find("ymin").text)
            xmax = float(bndbox.find("xmax").text)
            ymax = float(bndbox.find("ymax").text)
        except (ValueError, TypeError, AttributeError):
            continue

        # Clamp coordinates to image boundaries
        xmin = max(0.0, min(xmin, float(img_w)))
        xmax = max(0.0, min(xmax, float(img_w)))
        ymin = max(0.0, min(ymin, float(img_h)))
        ymax = max(0.0, min(ymax, float(img_h)))

        box_w = xmax - xmin
        box_h = ymax - ymin

        # Ignore degenerate boxes
        if box_w <= 0 or box_h <= 0:
            continue

        # Convert to normalized YOLO coordinates
        x_center = (xmin + xmax) / 2.0 / img_w
        y_center = (ymin + ymax) / 2.0 / img_h
        norm_w = box_w / img_w
        norm_h = box_h / img_h

        # Clamp normalized values to [0.0, 1.0]
        x_center = max(0.0, min(x_center, 1.0))
        y_center = max(0.0, min(y_center, 1.0))
        norm_w = max(0.0, min(norm_w, 1.0))
        norm_h = max(0.0, min(norm_h, 1.0))

        cls_id = VALID_CLASSES[class_name]
        yolo_lines.append(f"{cls_id} {x_center:.6f} {y_center:.6f} {norm_w:.6f} {norm_h:.6f}")
        valid_class_names.append(class_name)

    return yolo_lines, valid_class_names


def write_yolo_yaml(output_dir: Path) -> None:
    """
    Write data.yaml in the exact format Ultralytics YOLOv8 expects.
    """
    yaml_path = output_dir / "data.yaml"
    content = (
        "# RDD2022 Road Damage Detection Dataset - YOLOv8 Format\n"
        "path: .  # dataset root dir (relative to data.yaml)\n"
        "train: train/images\n"
        "val: val/images\n"
        "test: test/images\n\n"
        "nc: 4\n"
        "names: ['D00', 'D10', 'D20', 'D40']\n"
    )
    with open(yaml_path, "w", encoding="utf-8") as f:
        f.write(content)


def print_summary(
    total_images_found: int,
    skipped_missing_xml: int,
    skipped_zero_valid_boxes: int,
    country_stats: Dict[str, Dict[str, int]],
    split_items: Dict[str, List[Any]],
    split_class_counts: Dict[str, Counter],
) -> None:
    """
    Print comprehensive end-of-run summary table:
    1. Overall filtering statistics
    2. Country breakdown
    3. Split image counts
    4. Class distribution (D00/D10/D20/D40) per split
    """
    total_valid = sum(len(items) for items in split_items.values())
    total_skipped = skipped_missing_xml + skipped_zero_valid_boxes

    border = "=" * 80
    sub_border = "-" * 80

    print("\n" + border)
    print(f"{'RDD2022 Dataset Preparation Summary':^80}")
    print(border)
    print(f" Total Train Images Found:      {total_images_found:,}")
    print(f" Skipped (Missing XML):         {skipped_missing_xml:,}")
    print(f" Skipped (Zero Valid Boxes):    {skipped_zero_valid_boxes:,}")
    print(f" Total Skipped:                 {total_skipped:,} ({(total_skipped/max(1, total_images_found))*100:.1f}%)")
    print(f" Valid Images Retained:         {total_valid:,} ({(total_valid/max(1, total_images_found))*100:.1f}%)")
    print(sub_border)

    # Country Breakdown
    print("\nCountry Stratification Breakdown:")
    print(f"{'Country':<20} {'Scanned':<12} {'Valid':<12} {'Skipped':<12} {'Retained %':<12}")
    print(sub_border)
    for c_name in sorted(country_stats.keys()):
        stat = country_stats[c_name]
        scanned = stat["scanned"]
        valid = stat["valid"]
        skipped = stat["skipped"]
        pct = (valid / scanned * 100) if scanned > 0 else 0.0
        print(f"{c_name:<20} {scanned:<12,} {valid:<12,} {skipped:<12,} {pct:<11.1f}%")

    print(sub_border)

    # Split Image Counts
    print("\nImage Counts per Split (80 / 10 / 10 Target):")
    print(f"{'Split':<15} {'Images':<15} {'Percentage':<15}")
    print(sub_border)
    for split_name in ["train", "val", "test"]:
        count = len(split_items[split_name])
        pct = (count / max(1, total_valid)) * 100
        print(f"{split_name:<15} {count:<15,} {pct:<14.1f}%")
    print(sub_border)
    print(f"{'Total':<15} {total_valid:<15,} 100.0%")
    print(sub_border)

    # Class Distribution Table
    print("\nBounding Box Class Distribution across Splits:")
    header = f"{'Split':<12} {'D00 (Long.)':<14} {'D10 (Trans.)':<14} {'D20 (Allig.)':<14} {'D40 (Pothole)':<14} {'Total Boxes':<14}"
    print(header)
    print(sub_border)

    total_boxes_by_class = Counter()
    for split_name in ["train", "val", "test"]:
        cc = split_class_counts[split_name]
        d00 = cc["D00"]
        d10 = cc["D10"]
        d20 = cc["D20"]
        d40 = cc["D40"]
        subtotal = d00 + d10 + d20 + d40
        total_boxes_by_class.update(cc)
        print(f"{split_name:<12} {d00:<14,} {d10:<14,} {d20:<14,} {d40:<14,} {subtotal:<14,}")

    print(sub_border)
    grand_d00 = total_boxes_by_class["D00"]
    grand_d10 = total_boxes_by_class["D10"]
    grand_d20 = total_boxes_by_class["D20"]
    grand_d40 = total_boxes_by_class["D40"]
    grand_total = grand_d00 + grand_d10 + grand_d20 + grand_d40
    print(f"{'TOTAL':<12} {grand_d00:<14,} {grand_d10:<14,} {grand_d20:<14,} {grand_d40:<14,} {grand_total:<14,}")
    print(border + "\n")


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Prepare RDD2022 dataset for YOLOv8 (Pascal VOC to YOLO format, stratified split, resume support)."
    )
    parser.add_argument(
        "--data-dir",
        type=str,
        default=None,
        help="Path to folder containing RDD2022 country folders (auto-detected if omitted)",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=None,
        help="Path for output dataset_yolo directory (default: created alongside RDD2022)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for deterministic stratified train/val/test splitting (default: 42)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Scan and verify annotations and splits without copying files or writing to disk",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing output files instead of skipping already copied files",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_arguments()

    print("=" * 80)
    print(" RDD2022 -> YOLOv8 Dataset Converter & Stratified Splitter")
    print("=" * 80)

    # 1. Resolve source dataset directory
    script_dir = Path(__file__).resolve().parent
    if args.data_dir:
        data_dir = Path(args.data_dir).resolve()
        if not data_dir.is_dir():
            print(f"[ERROR] Specified --data-dir does not exist: {args.data_dir}")
            sys.exit(1)
    else:
        data_dir = find_rdd2022_directory(script_dir)
        if not data_dir:
            data_dir = find_rdd2022_directory(Path.cwd())

    if not data_dir or not data_dir.is_dir():
        print("[ERROR] Could not auto-detect RDD2022 dataset directory.")
        print("Please specify the path using: python prepare_dataset.py --data-dir \"path/to/RDD2022\"")
        sys.exit(1)

    print(f"Source Dataset: {data_dir}")

    # 2. Resolve output directory
    if args.output_dir:
        output_dir = Path(args.output_dir).resolve()
    else:
        # Created alongside RDD2022
        output_dir = (data_dir.parent / "dataset_yolo").resolve()

    print(f"Target Output:  {output_dir}")
    print(f"Split Ratios:   80% train / 10% val / 10% test (Stratified by Country)")
    print(f"Random Seed:    {args.seed}\n")

    # 3. Walk all country folders and process train/images + train/annotations/xmls
    country_dirs = [
        d for d in sorted(data_dir.iterdir())
        if d.is_dir() and (d / "train" / "images").is_dir() and (d / "train" / "annotations" / "xmls").is_dir()
    ]

    if not country_dirs:
        print(f"[ERROR] No valid country folders with train/images found in: {data_dir}")
        sys.exit(1)

    total_images_found = 0
    skipped_missing_xml = 0
    skipped_zero_valid_boxes = 0

    # Track valid items per country: country -> list of dicts
    valid_items_by_country: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    country_stats: Dict[str, Dict[str, int]] = {}

    # Filename deduplication tracker: filename -> country
    seen_filenames: Dict[str, str] = {}
    duplicate_filename_count = 0

    print("Step 1/3: Scanning country folders and parsing Pascal VOC annotations...")

    pbar_countries = country_dirs
    for c_dir in pbar_countries:
        country_name = c_dir.name
        img_dir = c_dir / "train" / "images"
        xml_dir = c_dir / "train" / "annotations" / "xmls"

        all_imgs = sorted([
            f for f in img_dir.glob("*")
            if f.is_file() and f.suffix.lower() in [".jpg", ".jpeg", ".png"]
        ])

        country_scanned = len(all_imgs)
        total_images_found += country_scanned
        country_valid = 0
        country_skipped = 0

        for img_path in all_imgs:
            xml_path = xml_dir / f"{img_path.stem}.xml"

            # Check 1: Missing XML
            if not xml_path.is_file():
                skipped_missing_xml += 1
                country_skipped += 1
                continue

            # Check for duplicate filename across different countries
            if img_path.name in seen_filenames:
                prev_country = seen_filenames[img_path.name]
                print(f"  [WARNING] Duplicate filename '{img_path.name}' found in both '{prev_country}' and '{country_name}'. Deduplicating (skipping).")
                duplicate_filename_count += 1
                country_skipped += 1
                continue

            # Parse bounding boxes
            yolo_lines, valid_class_names = parse_voc_xml(xml_path, img_path)

            # Check 2: Zero valid boxes after filtering
            if not yolo_lines:
                skipped_zero_valid_boxes += 1
                country_skipped += 1
                continue

            # Valid sample
            seen_filenames[img_path.name] = country_name
            country_valid += 1
            valid_items_by_country[country_name].append({
                "country": country_name,
                "img_path": img_path,
                "xml_path": xml_path,
                "filename": img_path.name,
                "stem": img_path.stem,
                "yolo_lines": yolo_lines,
                "classes": valid_class_names,
            })

        country_stats[country_name] = {
            "scanned": country_scanned,
            "valid": country_valid,
            "skipped": country_skipped,
        }
        print(f"  [{country_name:<16}] Scanned: {country_scanned:5,d} | Valid: {country_valid:5,d} | Skipped: {country_skipped:5,d}")

    total_valid = sum(len(v) for v in valid_items_by_country.values())
    print(f"\nScanning complete: {total_valid:,} valid labeled images ready for splitting.")
    if duplicate_filename_count > 0:
        print(f"  [NOTICE] Deduplicated {duplicate_filename_count} duplicate filenames across countries.")

    # 4. Stratified 80/10/10 split per country
    print("\nStep 2/3: Stratifying split (80% train / 10% val / 10% test per country)...")
    rng = random.Random(args.seed)

    split_items: Dict[str, List[Dict[str, Any]]] = {
        "train": [],
        "val": [],
        "test": [],
    }
    split_class_counts: Dict[str, Counter] = {
        "train": Counter(),
        "val": Counter(),
        "test": Counter(),
    }

    for country_name in sorted(valid_items_by_country.keys()):
        items = valid_items_by_country[country_name]
        # Deterministic shuffle
        rng.shuffle(items)

        n = len(items)
        n_train = int(round(n * 0.80))
        n_val = int(round(n * 0.10))
        n_test = n - n_train - n_val

        train_slice = items[:n_train]
        val_slice = items[n_train:n_train + n_val]
        test_slice = items[n_train + n_val:]

        split_items["train"].extend(train_slice)
        split_items["val"].extend(val_slice)
        split_items["test"].extend(test_slice)

        for itm in train_slice:
            split_class_counts["train"].update(itm["classes"])
        for itm in val_slice:
            split_class_counts["val"].update(itm["classes"])
        for itm in test_slice:
            split_class_counts["test"].update(itm["classes"])

    if args.dry_run:
        print("\n[DRY RUN] Bypassing file copy and YAML generation.")
        print_summary(
            total_images_found,
            skipped_missing_xml,
            skipped_zero_valid_boxes,
            country_stats,
            split_items,
            split_class_counts,
        )
        return

    # 5. Create directory structure and copy images + write YOLO labels
    print("\nStep 3/3: Writing YOLO dataset structure and copying images...")
    for split_name in ["train", "val", "test"]:
        (output_dir / split_name / "images").mkdir(parents=True, exist_ok=True)
        (output_dir / split_name / "labels").mkdir(parents=True, exist_ok=True)

    # Write data.yaml
    write_yolo_yaml(output_dir)

    total_files_to_process = sum(len(items) for items in split_items.values())
    skipped_existing = 0
    copied_count = 0

    for split_name in ["train", "val", "test"]:
        items = split_items[split_name]
        split_img_dir = output_dir / split_name / "images"
        split_lbl_dir = output_dir / split_name / "labels"

        desc = f"Writing {split_name:<5}"
        pbar = tqdm(items, desc=desc, unit="file", ncols=85) if tqdm is not None else items

        for itm in pbar:
            src_img: Path = itm["img_path"]
            dst_img = split_img_dir / src_img.name
            dst_lbl = split_lbl_dir / f"{src_img.stem}.txt"

            # Check idempotency / resume: skip if already copied and complete
            if not args.force and dst_img.is_file() and dst_lbl.is_file():
                if dst_img.stat().st_size == src_img.stat().st_size and dst_lbl.stat().st_size > 0:
                    skipped_existing += 1
                    continue

            # Copy image (preserves metadata)
            shutil.copy2(src_img, dst_img)

            # Write YOLO label file
            with open(dst_lbl, "w", encoding="utf-8") as f:
                f.write("\n".join(itm["yolo_lines"]) + "\n")

            copied_count += 1

    if skipped_existing > 0:
        print(f"  [RESUME] Skipped {skipped_existing:,} already existing files in {output_dir.name}/.")
    print(f"  [DONE] Processed {copied_count:,} newly written image-label pairs.")

    # 6. Print final summary table
    print_summary(
        total_images_found,
        skipped_missing_xml,
        skipped_zero_valid_boxes,
        country_stats,
        split_items,
        split_class_counts,
    )
    print(f"Dataset successfully prepared in: {output_dir}")
    print(f"YOLOv8 configuration file:        {output_dir / 'data.yaml'}")


if __name__ == "__main__":
    main()
