"""
visualizer.py - Image Annotation & Bounding Box Rendering
Draws damage bounding boxes, class labels, confidence percentages,
and condition banners onto images.
"""

from pathlib import Path
from typing import List, Dict, Any, Tuple
from PIL import Image, ImageDraw, ImageFont

# Distinct color palette per damage class (RGB)
CLASS_COLORS: Dict[str, Tuple[int, int, int]] = {
    "D00": (0, 150, 255),    # Cyan/Blue - Longitudinal Crack
    "D10": (255, 165, 0),    # Orange - Transverse Crack
    "D20": (180, 50, 240),   # Purple/Magenta - Alligator Crack
    "D40": (235, 45, 45),    # Crimson Red - Pothole
}
DEFAULT_COLOR = (255, 200, 0)


def annotate_image(
    image_path: Path,
    detections: List[Dict[str, Any]],
    output_path: Path,
    road_health_score: float = 100.0,
    condition_label: str = "Good",
) -> Path:
    """
    Annotate image with bounding boxes, class badges, and overall health indicator.

    Args:
        image_path: Path to the original input image.
        detections: List of detection dicts with 'class_code', 'class_name',
                    'confidence', and 'bbox' [xmin, ymin, xmax, ymax].
        output_path: Destination path for the annotated image.
        road_health_score: Computed road score.
        condition_label: Condition label ("Good", "Fair", "Poor", "Critical").

    Returns:
        Path: output_path where annotated image was saved.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(image_path) as img:
        annotated = img.convert("RGB")
        draw = ImageDraw.Draw(annotated)
        width, height = annotated.size

        # Choose font size proportional to image resolution
        font_size = max(13, int(min(width, height) * 0.024))
        try:
            # Standard Windows Arial or fallback
            font = ImageFont.truetype("arial.ttf", font_size)
            banner_font = ImageFont.truetype("arialbd.ttf", max(15, int(font_size * 1.1)))
        except Exception:
            try:
                font = ImageFont.truetype("DejaVuSans.ttf", font_size)
                banner_font = font
            except Exception:
                font = ImageFont.load_default()
                banner_font = font

        # 1. Draw detections
        for det in detections:
            bbox = det.get("bbox")
            if not bbox or len(bbox) != 4:
                continue

            xmin, ymin, xmax, ymax = bbox

            # Handle normalized coordinates if needed
            if max(xmax, ymax) <= 1.0 and width > 1:
                xmin = int(xmin * width)
                xmax = int(xmax * width)
                ymin = int(ymin * height)
                ymax = int(ymax * height)
            else:
                xmin, ymin, xmax, ymax = int(xmin), int(ymin), int(xmax), int(ymax)

            # Clamp coordinates
            xmin = max(0, min(xmin, width - 1))
            ymin = max(0, min(ymin, height - 1))
            xmax = max(xmin + 1, min(xmax, width))
            ymax = max(ymin + 1, min(ymax, height))

            code = det.get("class_code", "D00")
            name = det.get("class_name", code)
            conf = det.get("confidence", 0.0)
            color = CLASS_COLORS.get(code, DEFAULT_COLOR)

            # Draw box with outline thickness proportional to resolution
            line_width = max(2, int(min(width, height) * 0.005))
            draw.rectangle([xmin, ymin, xmax, ymax], outline=color, width=line_width)

            # Draw badge background and label text
            label_text = f"{code} {name} {int(conf * 100)}%"
            # Get text bounding box
            text_bbox = draw.textbbox((0, 0), label_text, font=font)
            text_w = text_bbox[2] - text_bbox[0]
            text_h = text_bbox[3] - text_bbox[1]

            badge_padding = 4
            # Position badge above box if space permits, else inside top
            if ymin - text_h - (badge_padding * 2) >= 0:
                badge_ymin = ymin - text_h - (badge_padding * 2)
                badge_ymax = ymin
            else:
                badge_ymin = ymin
                badge_ymax = ymin + text_h + (badge_padding * 2)

            badge_xmin = xmin
            badge_xmax = min(width, xmin + text_w + (badge_padding * 2))

            draw.rectangle([badge_xmin, badge_ymin, badge_xmax, badge_ymax], fill=color)
            draw.text(
                (badge_xmin + badge_padding, badge_ymin + badge_padding),
                label_text,
                fill=(255, 255, 255),
                font=font,
            )

        # 2. Top Banner with Overall Health Score
        banner_h = max(28, int(height * 0.045))
        if condition_label == "Good":
            banner_color = (34, 160, 88)     # Emerald Green
        elif condition_label == "Fair":
            banner_color = (230, 150, 20)    # Amber
        elif condition_label == "Poor":
            banner_color = (220, 95, 30)     # Orange
        else:
            banner_color = (215, 38, 56)     # Red

        # Semi-transparent style bar at top
        draw.rectangle([0, 0, width, banner_h], fill=banner_color)
        banner_text = f"Road Health Score: {road_health_score:.1f}/100 | Condition: {condition_label} | Detections: {len(detections)}"
        draw.text((12, int(banner_h * 0.15)), banner_text, fill=(255, 255, 255), font=banner_font)

        annotated.save(output_path, quality=92)

    return output_path
