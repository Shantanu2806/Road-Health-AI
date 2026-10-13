"""
inference_stub.py - YOLOv8 Inference Module for Road Damage Detection
Loads trained YOLOv8 models (trained on RDD2022 dataset & pothole benchmarks) and runs inference.
"""

import os
from pathlib import Path
from typing import Union, List, Dict, Any, Optional
from ultralytics import YOLO

# Class mapping matching RDD2022 dataset:
# 0 -> D00 (Longitudinal Crack)
# 1 -> D10 (Transverse Crack)
# 2 -> D20 (Alligator Crack)
# 3 -> D40 (Pothole)
CLASS_MAP: Dict[int, Dict[str, str]] = {
    0: {"class_code": "D00", "class_name": "Longitudinal Crack"},
    1: {"class_code": "D10", "class_name": "Transverse Crack"},
    2: {"class_code": "D20", "class_name": "Alligator Crack"},
    3: {"class_code": "D40", "class_name": "Pothole"},
}

CLASSES: List[Dict[str, str]] = [
    {"code": "D00", "name": "Longitudinal Crack"},
    {"code": "D10", "name": "Transverse Crack"},
    {"code": "D20", "name": "Alligator Crack"},
    {"code": "D40", "name": "Pothole"},
]

# Module-level variables for lazy loading
_model: Optional[YOLO] = None
_loaded_model_path: Optional[str] = None
_pothole_model: Optional[YOLO] = None


def get_model(model_path: str = "best.pt") -> YOLO:
    """
    Load YOLO model lazily (only once on first call) using a module-level variable.
    Keeps model path relative so it works from the backend/ directory when running uvicorn.
    """
    global _model, _loaded_model_path
    if _model is None or _loaded_model_path != model_path:
        model_file = model_path
        if not os.path.exists(model_file):
            alt_path = os.path.join(os.path.dirname(__file__), model_path)
            if os.path.exists(alt_path):
                model_file = alt_path

        _model = YOLO(model_file)
        _loaded_model_path = model_path
    return _model


def get_pothole_model() -> Optional[YOLO]:
    """
    Lazily loads the specialized pothole detector (trained on cavities and water-puddle potholes)
    if available in the backend directory.
    """
    global _pothole_model
    if _pothole_model is None:
        pothole_weights = os.path.join(os.path.dirname(__file__), "pothole_yolo.pt")
        if os.path.exists(pothole_weights):
            try:
                _pothole_model = YOLO(pothole_weights)
            except Exception:
                _pothole_model = None
    return _pothole_model


def run_inference(
    image_path_or_array: Union[str, Path, Any],
    model_path: str = "best.pt",
    conf_threshold: float = 0.25,
) -> Dict[str, Any]:
    """
    Run YOLOv8 road damage detection on an image.

    Args:
        image_path_or_array: Path to image file, PIL image, or numpy ndarray.
        model_path: Path to trained YOLO model weights (default: "best.pt").
        conf_threshold: Minimum detection confidence threshold (default: 0.25).

    Returns:
        dict with keys:
          - detections: list of {class_code, class_name, confidence, bbox:[x1,y1,x2,y2]}
          - image_width: int
          - image_height: int
    """
    model = get_model(model_path)
    pm = get_pothole_model()

    # Convert Path objects to string path if needed
    source = str(image_path_or_array) if isinstance(image_path_or_array, Path) else image_path_or_array

    # Run primary YOLO model inference
    results = model.predict(source, conf=conf_threshold, verbose=False)[0]

    # Get original image dimensions
    image_height, image_width = results.orig_shape

    raw_detections: List[Dict[str, Any]] = []

    # 1. Primary RDD2022 detections
    if results.boxes is not None and len(results.boxes) > 0:
        for box in results.boxes:
            cls_idx = int(box.cls[0].item())
            conf = round(float(box.conf[0].item()), 2)
            xyxy = [int(v) for v in box.xyxy[0].tolist()]

            cls_info = CLASS_MAP.get(
                cls_idx,
                {"class_code": f"D{cls_idx}", "class_name": "Defect"},
            )

            raw_detections.append({
                "class_code": cls_info["class_code"],
                "class_name": cls_info["class_name"],
                "confidence": conf,
                "bbox": xyxy,
            })

    # 2. Supplementary specialized pothole/puddle detection
    if pm is not None:
        try:
            presults = pm.predict(source, conf=conf_threshold, verbose=False)[0]
            if presults.boxes is not None and len(presults.boxes) > 0:
                for box in presults.boxes:
                    conf = round(float(box.conf[0].item()), 2)
                    xyxy = [int(v) for v in box.xyxy[0].tolist()]

                    # Ignore boxes located in extreme top sky area
                    if xyxy[1] > int(image_height * 0.10):
                        raw_detections.append({
                            "class_code": "D40",
                            "class_name": "Pothole",
                            "confidence": conf,
                            "bbox": xyxy,
                        })
        except Exception:
            pass

    # 3. Non-Maximum Suppression (NMS) & Box Merging
    # Sort detections prioritizing higher confidence
    raw_detections.sort(
        key=lambda d: (d["class_code"] == "D40", d["confidence"]),
        reverse=True,
    )

    final_detections: List[Dict[str, Any]] = []
    for d in raw_detections:
        keep = True
        for f in final_detections:
            x1 = max(d["bbox"][0], f["bbox"][0])
            y1 = max(d["bbox"][1], f["bbox"][1])
            x2 = min(d["bbox"][2], f["bbox"][2])
            y2 = min(d["bbox"][3], f["bbox"][3])
            w_int = max(0, x2 - x1)
            h_int = max(0, y2 - y1)
            inter = w_int * h_int
            area_d = (d["bbox"][2] - d["bbox"][0]) * (d["bbox"][3] - d["bbox"][1])
            area_f = (f["bbox"][2] - f["bbox"][0]) * (f["bbox"][3] - f["bbox"][1])

            if area_d > 0 and area_f > 0:
                iou = inter / float(area_d + area_f - inter)
                containment = inter / float(min(area_d, area_f))

                if iou > 0.35 or containment > 0.60:
                    keep = False
                    # If current box is a pothole, upgrade existing box to pothole
                    if d["class_code"] == "D40" and f["class_code"] != "D40":
                        f["class_code"] = "D40"
                        f["class_name"] = "Pothole"
                        f["confidence"] = max(f["confidence"], d["confidence"])
                    break
        if keep:
            final_detections.append(d)

    return {
        "detections": final_detections,
        "image_width": int(image_width),
        "image_height": int(image_height),
        "is_road_surface": True,
    }
