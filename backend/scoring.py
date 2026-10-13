"""
scoring.py - Pure Python Road Health Scoring Engine

Scoring Formulas (Strict Standard):
------------------------------------
1. Damage Class Weights:
   - D00 (Longitudinal Crack): 1.0
   - D10 (Transverse Crack):   1.5
   - D20 (Alligator Crack):    2.5
   - D40 (Pothole):            3.0

2. Damage Index (DI):
   DI = sum over all detections of (class_weight * confidence)

3. Coverage %:
   Coverage % = (sum of all bounding box areas / total image area) * 100, capped at 100

4. Severity Level:
   - DI < 5           -> "Low"
   - 5 <= DI <= 12    -> "Medium"
   - DI > 12          -> "High"

5. Road Health Score:
   Score = 100 - (DI * 3) - (Coverage% * 1.2), clipped to [0, 100]

6. Condition Label:
   - 81 - 100 -> "Good"
   - 61 - 80  -> "Fair"
   - 31 - 60  -> "Poor"
   - 0  - 30  -> "Critical"
"""

from typing import List, Dict, Any

# Damage class weights as defined in project specification
DAMAGE_WEIGHTS: Dict[str, float] = {
    "D00": 1.0,  # Longitudinal Crack
    "D10": 1.5,  # Transverse Crack
    "D20": 2.5,  # Alligator Crack
    "D40": 3.0,  # Pothole
}

DAMAGE_NAMES: Dict[str, str] = {
    "D00": "Longitudinal Crack",
    "D10": "Transverse Crack",
    "D20": "Alligator Crack",
    "D40": "Pothole",
}


def compute_damage_index(detections: List[Dict[str, Any]]) -> float:
    """
    Compute Damage Index (DI) = sum over all detections of (class_weight * confidence).

    Args:
        detections: List of detection dicts containing 'class_code' (e.g. 'D00')
                    and 'confidence' (float 0.0 - 1.0).

    Returns:
        float: Damage Index, >= 0.0 rounded to 4 decimals.
    """
    if not detections:
        return 0.0

    total_di = 0.0
    for det in detections:
        code = det.get("class_code", "").upper().strip()
        weight = DAMAGE_WEIGHTS.get(code, 0.0)
        confidence = float(det.get("confidence", 0.0))
        total_di += weight * confidence

    return round(total_di, 4)


def compute_coverage(
    detections: List[Dict[str, Any]],
    image_width: int,
    image_height: int
) -> float:
    """
    Compute Coverage % = (sum of all bounding box areas / total image area) * 100,
    capped at 100.

    Bounding boxes can be provided in 'bbox': [xmin, ymin, xmax, ymax] in pixel coords
    or normalized coordinates.

    Args:
        detections: List of detection dicts with 'bbox': [xmin, ymin, xmax, ymax].
        image_width: Width of the image in pixels (> 0).
        image_height: Height of the image in pixels (> 0).

    Returns:
        float: Percentage of road covered by damage [0.0, 100.0], rounded to 2 decimals.
    """
    if not detections or image_width <= 0 or image_height <= 0:
        return 0.0

    total_image_area = float(image_width * image_height)
    total_box_area = 0.0

    for det in detections:
        bbox = det.get("bbox")
        if not bbox or len(bbox) != 4:
            continue

        xmin, ymin, xmax, ymax = bbox

        # Check if coordinates are normalized [0, 1] or pixel coordinates
        if max(xmax, ymax) <= 1.0 and total_image_area > 1.0:
            w = max(0.0, xmax - xmin) * image_width
            h = max(0.0, ymax - ymin) * image_height
        else:
            w = max(0.0, float(xmax) - float(xmin))
            h = max(0.0, float(ymax) - float(ymin))

        total_box_area += w * h

    coverage_pct = (total_box_area / total_image_area) * 100.0
    return round(min(100.0, max(0.0, coverage_pct)), 2)


def compute_severity(damage_index: float) -> str:
    """
    Determine Severity level from Damage Index:
    - DI < 5        -> "Low"
    - 5 <= DI <= 12 -> "Medium"
    - DI > 12       -> "High"

    Args:
        damage_index: Computed Damage Index.

    Returns:
        str: "Low", "Medium", or "High".
    """
    if damage_index < 5.0:
        return "Low"
    elif damage_index <= 12.0:
        return "Medium"
    else:
        return "High"


def compute_road_health_score(damage_index: float, coverage_pct: float) -> float:
    """
    Compute Road Health Score:
    Score = 100 - (DI * 3) - (Coverage% * 1.2), clipped to [0, 100].

    Args:
        damage_index: Damage Index (DI).
        coverage_pct: Damage coverage percentage [0, 100].

    Returns:
        float: Road Health Score in [0.0, 100.0], rounded to 2 decimals.
    """
    penalty = (damage_index * 3.0) + (coverage_pct * 1.2)
    score = 100.0 - penalty
    clipped_score = max(0.0, min(100.0, score))
    return round(clipped_score, 2)


def compute_condition_label(score: float) -> str:
    """
    Determine Condition label from Road Health Score:
    - 81 - 100 -> "Good"
    - 61 - 80  -> "Fair"
    - 31 - 60  -> "Poor"
    - 0  - 30  -> "Critical"

    Args:
        score: Road Health Score [0, 100].

    Returns:
        str: "Good", "Fair", "Poor", or "Critical".
    """
    rounded = round(score)
    if rounded >= 81:
        return "Good"
    elif rounded >= 61:
        return "Fair"
    elif rounded >= 31:
        return "Poor"
    else:
        return "Critical"


def assess_road_health(
    detections: List[Dict[str, Any]],
    image_width: int,
    image_height: int
) -> Dict[str, Any]:
    """
    High-level evaluation function that runs all scoring calculations and
    returns a unified road health assessment dictionary.

    Args:
        detections: List of detection dictionaries.
        image_width: Width of image in pixels.
        image_height: Height of image in pixels.

    Returns:
        dict: Complete assessment report containing DI, coverage, severity,
              score, and condition label.
    """
    di = compute_damage_index(detections)
    cov = compute_coverage(detections, image_width, image_height)
    severity = compute_severity(di)
    score = compute_road_health_score(di, cov)
    condition = compute_condition_label(score)

    return {
        "damage_index": di,
        "coverage_pct": cov,
        "severity": severity,
        "road_health_score": score,
        "condition_label": condition,
        "detection_count": len(detections),
    }
