# AI Road Damage Assessment System - Backend API

FastAPI backend for automated road inspection, damage classification (RDD2022 dataset: D00, D10, D20, D40), and quantitative road health scoring.

---

## Architecture Overview

```
backend/
├── scoring.py          # Pure Python scoring engine (DI, Coverage %, Score, Severity, Condition)
├── test_scoring.py     # Unit tests verifying scoring formulas against edge cases
├── inference_stub.py   # YOLOv8 mock inference stub (easily swappable for trained model)
├── visualizer.py       # Bounding box rendering, class badges, and health score banner
├── database.py         # SQLAlchemy engine & SQLite configuration
├── models.py           # Database ORM model (Analysis table)
├── schemas.py          # Pydantic schemas for request & response validation
├── main.py             # FastAPI app, API routes, CORS, and static file serving
├── requirements.txt    # Minimal dependencies
└── static/
    ├── uploads/        # Original user-uploaded images
    └── annotated/      # Rendered output images with bounding boxes
```

---

## Scoring Formulas (For Viva Explanation)

The scoring formulas quantitatively evaluate road quality based on detected damage types, model confidence, and visual damage footprint:

### 1. Damage Class Weights
Different damages pose varying risks to vehicles and structural integrity:
- **D00 (Longitudinal Crack)**: `1.0` (Surface level, least severe)
- **D10 (Transverse Crack)**: `1.5` (Perpendicular to traffic flow)
- **D20 (Alligator Crack)**: `2.5` (Structural base failure)
- **D40 (Pothole)**: `3.0` (Immediate road hazard)

### 2. Damage Index (DI)
$$\text{DI} = \sum_{\text{detections}} (\text{class\_weight} \times \text{confidence})$$
Reflects the weighted density and certainty of damage on the road.

### 3. Coverage Percentage
$$\text{Coverage \%} = \min\left(100, \frac{\sum \text{Bounding Box Areas}}{\text{Total Image Area}} \times 100\right)$$
Represents how much of the photographed road surface is affected by damage.

### 4. Severity Level
- **Low**: $\text{DI} < 5$
- **Medium**: $5 \le \text{DI} \le 12$
- **High**: $\text{DI} > 12$

### 5. Road Health Score ($0 - 100$)
$$\text{Score} = \text{clip}\Big(100 - (\text{DI} \times 3) - (\text{Coverage \%} \times 1.2),\, 0,\, 100\Big)$$
- A clean road with no defects scores **100**.
- Higher damage density and coverage progressively penalize the score.

### 6. Condition Label
- **81 – 100**: `"Good"`
- **61 – 80**: `"Fair"`
- **31 – 60**: `"Poor"`
- **0 – 30**: `"Critical"`

---

## Quickstart

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Run Unit Tests
Verify the scoring formulas independently:
```bash
python test_scoring.py
```

### 3. Start the Server
Run the FastAPI development server with auto-reload:
```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
- API is accessible at: `http://127.0.0.1:8000`
- Interactive Swagger UI Docs: `http://127.0.0.1:8000/docs`
- Interactive Redoc: `http://127.0.0.1:8000/redoc`

---

## API Endpoints

### 1. `POST /analyze`
Upload an image to perform detection, scoring, and visualization.
- **Form Data**: `file` (image file: JPG, PNG), `conf_threshold` (optional, default: `0.40`)
- **Response**:
```json
{
  "id": 1,
  "timestamp": "2026-09-21T11:20:00",
  "damage_index": 4.85,
  "coverage_pct": 14.20,
  "severity": "Low",
  "road_health_score": 68.41,
  "condition_label": "Fair",
  "image_width": 640,
  "image_height": 640,
  "detections": [
    {
      "class_code": "D40",
      "class_name": "Pothole",
      "confidence": 0.85,
      "bbox": [120, 200, 310, 380]
    }
  ],
  "original_image_url": "/static/uploads/uuid_image.jpg",
  "annotated_image_url": "/static/annotated/annotated_uuid_image.jpg",
  "annotated_image_path": "static/annotated/annotated_uuid_image.jpg"
}
```

### 2. `GET /history`
Returns past road assessments, ordered from newest to oldest.
- **Query Params**: `limit` (optional, default: `50`)

### 3. `GET /analyses/{id}`
Returns details for a specific analysis by its database ID.

### 4. `GET /health`
Returns system operational status (`{"status": "healthy"}`).

---

## Swapping the Stub for Real YOLOv8 Model

When your YOLOv8 model finishes training on Colab, copy `best.pt` to the `backend/` folder and update `inference_stub.py`:

```python
# In backend/inference_stub.py:
from ultralytics import YOLO

# Load model weights once
_model = None

def get_model(model_path="best.pt"):
    global _model
    if _model is None:
        _model = YOLO(model_path)
    return _model

def run_inference(image_path_or_array, model_path=None, conf_threshold=0.4):
    model = get_model(model_path or "best.pt")
    results = model.predict(image_path_or_array, conf=conf_threshold)[0]
    
    detections = []
    for box in results.boxes:
        cls_id = int(box.cls[0])
        code = model.names[cls_id]       # e.g. "D40"
        conf = float(box.conf[0])
        xyxy = [int(v) for v in box.xyxy[0].tolist()]
        
        detections.append({
            "class_code": code,
            "class_name": DAMAGE_NAMES.get(code, code),
            "confidence": round(conf, 2),
            "bbox": xyxy,
        })
        
    img_h, img_w = results.orig_shape
    return {
        "detections": detections,
        "image_width": img_w,
        "image_height": img_h,
    }
```
*No other files (API, database, scoring, or frontend) need to be changed!*
