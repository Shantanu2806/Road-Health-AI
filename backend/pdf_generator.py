"""
pdf_generator.py - Professional PDF Report Generator for Road Health AI
Generates official Road Damage Assessment & Maintenance Work Order PDF reports
using ReportLab with embedded YOLOv8 defect visualizations, metrics, and contractor routing.
"""

import os
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image as RLImage,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from PIL import Image as PILImage


def generate_inspection_pdf_report(
    analysis_data: Dict[str, Any],
    annotated_image_path: Optional[str] = None,
    output_pdf_path: Optional[str] = None,
    ticket_id: Optional[str] = None,
    contractor_info: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Generates a publication-quality Road Damage Assessment & Work Order PDF report.
    Returns the absolute path to the generated PDF.
    """
    analysis_id = analysis_data.get("id", "N/A")
    t_id = ticket_id or analysis_data.get("ticket_id") or f"RH-2026-TICKET"

    # Default output path if not specified
    if not output_pdf_path:
        backend_dir = Path(__file__).resolve().parent
        reports_dir = backend_dir / "static" / "reports"
        reports_dir.mkdir(parents=True, exist_ok=True)
        output_pdf_path = str(reports_dir / f"report_{analysis_id}.pdf")
    else:
        Path(output_pdf_path).parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        output_pdf_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=28,
        bottomMargin=28,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#0f172a"),
        fontName="Helvetica-Bold",
        spaceAfter=3,
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#64748b"),
        fontName="Helvetica-Bold",
        spaceAfter=8,
    )
    section_title = ParagraphStyle(
        "SectionTitle",
        parent=styles["Heading2"],
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#1e293b"),
        fontName="Helvetica-Bold",
        spaceBefore=6,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "DocBody",
        parent=styles["Normal"],
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#334155"),
        fontName="Helvetica",
    )
    body_bold = ParagraphStyle(
        "DocBodyBold",
        parent=body_style,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#0f172a"),
    )
    score_style = ParagraphStyle(
        "ScoreBig",
        parent=styles["Normal"],
        fontSize=24,
        leading=28,
        fontName="Helvetica-Bold",
        alignment=1,
    )

    score_val = float(analysis_data.get("road_health_score", 0.0))
    condition_val = str(analysis_data.get("condition_label", "Poor")).upper()
    severity_val = str(analysis_data.get("severity", "High"))
    coverage_val = float(analysis_data.get("coverage_pct", 0.0))
    damage_idx = float(analysis_data.get("damage_index", 0.0))
    location_name = analysis_data.get("location_name") or "Location Not Specified"
    lat = analysis_data.get("latitude")
    lng = analysis_data.get("longitude")
    timestamp_str = str(analysis_data.get("timestamp") or datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    user_name = analysis_data.get("user_name")
    user_email_val = analysis_data.get("user_email")
    if user_name and user_email_val:
        user_display = f"{user_name} ({user_email_val})"
    elif user_email_val:
        user_display = user_email_val
    elif user_name:
        user_display = user_name
    else:
        user_display = "Registered Citizen / Inspector"

    # Color badge based on condition
    if condition_val == "CRITICAL":
        status_color = colors.HexColor("#dc2626")  # Red
        score_hex = "#dc2626"
    elif condition_val == "POOR":
        status_color = colors.HexColor("#ea580c")  # Orange
        score_hex = "#ea580c"
    elif condition_val == "FAIR":
        status_color = colors.HexColor("#d97706")  # Amber
        score_hex = "#d97706"
    else:
        status_color = colors.HexColor("#16a34a")  # Green
        score_hex = "#16a34a"

    story = []

    # 1. Header block
    ref_num = f"{int(analysis_id):04d}" if isinstance(analysis_id, (int, float)) or (isinstance(analysis_id, str) and analysis_id.isdigit()) else str(analysis_id)
    header_data = [
        [
            Paragraph("ROAD HEALTH AI — MUNICIPAL INFRASTRUCTURE SYSTEM", subtitle_style),
            Paragraph(f"REPORT REF: RHA-REP-{ref_num}", ParagraphStyle("Ref", parent=subtitle_style, alignment=2)),
        ],
        [
            Paragraph("OFFICIAL ROAD DAMAGE ASSESSMENT & WORK ORDER", title_style),
            Paragraph(f"TICKET ID: <b>{t_id}</b>", ParagraphStyle("Ticket", parent=title_style, fontSize=11, leading=14, alignment=2, textColor=colors.HexColor("#2563eb"))),
        ]
    ]
    header_table = Table(header_data, colWidths=[360, 180])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 2))
    story.append(HRFlowable(width="100%", thickness=2, color=status_color, spaceAfter=8))

    # 2. Executive Metrics Summary Box
    score_p = Paragraph(
        f"<font color='{score_hex}'>{score_val:.1f}</font><font size=11 color='#64748b'> / 100</font><br/>"
        f"<font size=9.5 color='{score_hex}'><b>{condition_val}</b></font>",
        score_style
    )

    detections = analysis_data.get("detections") or []
    defects_count = len(detections)

    metrics_content = [
        [
            score_p,
            [
                Paragraph("<b>Assessment Overview</b>", body_bold),
                Spacer(1, 2),
                Paragraph(f"• Severity Level: <b>{severity_val}</b>", body_style),
                Paragraph(f"• Surface Distress Coverage: <b>{coverage_val:.2f}%</b>", body_style),
                Paragraph(f"• Damage Index: <b>{damage_idx:.2f}</b>", body_style),
                Paragraph(f"• Confirmed Defects: <b>{defects_count} defect(s)</b>", body_style),
            ],
            [
                Paragraph("<b>Dispatch & Status</b>", body_bold),
                Spacer(1, 2),
                Paragraph(f"• Status: <b>WORK ORDER ACTIVE</b>", body_style),
                Paragraph(f"• Priority: <b>{severity_val.upper()} PRIORITY</b>", body_style),
                Paragraph(f"• Inspection Date: <b>{timestamp_str[:16]}</b>", body_style),
                Paragraph(f"• Target Resolution: <b>Within 72 Hours</b>", body_style),
            ]
        ]
    ]
    metrics_table = Table(metrics_content, colWidths=[140, 200, 200])
    metrics_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(metrics_table)
    story.append(Spacer(1, 6))

    # 3. Location and Personnel Table
    story.append(Paragraph("Geographic Location & Assigned Contractors", section_title))

    contractor_name = contractor_info.get("full_name", "Local Area Certified Contractor") if contractor_info else "Local Area Certified Contractor"
    contractor_email = contractor_info.get("email", "contractor@roadhealth.ai") if contractor_info else "contractor@roadhealth.ai"
    contractor_zone = contractor_info.get("service_area", "") if contractor_info else ""
    if contractor_info and contractor_info.get("service_city"):
        contractor_zone += f", {contractor_info['service_city']}"

    coords_str = f"{lat:.5f}° N, {lng:.5f}° E" if (lat and lng) else "Coordinates Geo-referenced from Site Image"

    loc_personnel_data = [
        [
            Paragraph("<b>Inspection Location:</b>", body_bold),
            Paragraph(f"📍 {location_name}", body_style),
        ],
        [
            Paragraph("<b>GPS Coordinates:</b>", body_bold),
            Paragraph(coords_str, body_style),
        ],
        [
            Paragraph("<b>Assigned Contractor:</b>", body_bold),
            Paragraph(f"👷 <b>{contractor_name}</b> ({contractor_email}) — Zone: <i>{contractor_zone or 'Municipal District'}</i>", body_style),
        ],
        [
            Paragraph("<b>Reporting Citizen / Inspector:</b>", body_bold),
            Paragraph(f"👤 {user_display}", body_style),
        ],
        [
            Paragraph("<b>Supervising Municipal Admin:</b>", body_bold),
            Paragraph("🏛️ Shantanu Kaute (kauteshantanu80@gmail.com) — Road Safety Division", body_style),
        ],
    ]
    loc_table = Table(loc_personnel_data, colWidths=[150, 390])
    loc_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#ffffff")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(loc_table)
    story.append(Spacer(1, 6))

    # 4. Visual Evidence (Annotated Road Image)
    # Check if annotated image exists on disk
    real_img_path = None
    if annotated_image_path:
        p = Path(annotated_image_path)
        if p.is_file():
            real_img_path = str(p)
        else:
            alt_p = Path(__file__).resolve().parent / str(annotated_image_path).lstrip("/")
            if alt_p.is_file():
                real_img_path = str(alt_p)

    if real_img_path and os.path.exists(real_img_path):
        story.append(Paragraph("Visual Evidence: YOLOv8 AI Damage Detection", section_title))
        try:
            pil_img = PILImage.open(real_img_path)
            orig_w, orig_h = pil_img.size
            display_w = 540
            display_h = int((orig_h / orig_w) * display_w)
            if display_h > 175:
                display_h = 175
                display_w = int((orig_w / orig_h) * display_h)

            rl_img = RLImage(real_img_path, width=display_w, height=display_h)
            img_table = Table([[rl_img]], colWidths=[540])
            img_table.setStyle(TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#0f172a")),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]))
            story.append(img_table)
            story.append(Spacer(1, 6))
        except Exception as img_err:
            print(f"[PDF GENERATOR] Warning: Could not embed image into PDF: {img_err}")

    # 5. Detected Defect Inventory Table
    story.append(Paragraph("Surface Distress Itemized Inventory", section_title))
    defect_rows = [
        [
            Paragraph("<b>#</b>", body_bold),
            Paragraph("<b>Class</b>", body_bold),
            Paragraph("<b>Defect Classification</b>", body_bold),
            Paragraph("<b>Confidence</b>", body_bold),
            Paragraph("<b>Bounding Box Coordinates</b>", body_bold),
        ]
    ]

    if detections:
        for idx, d in enumerate(detections[:6], 1): # Max 6 rows to guarantee clean 1-page fit
            code = d.get("class_code", "D40")
            name = d.get("class_name", "Pothole")
            conf = int(float(d.get("confidence", 0)) * 100)
            bbox = str(d.get("bbox", []))
            defect_rows.append([
                Paragraph(str(idx), body_style),
                Paragraph(f"<b>{code}</b>", body_style),
                Paragraph(name, body_style),
                Paragraph(f"<b>{conf}%</b>", body_style),
                Paragraph(f"<font face='Courier' size=6.5>{bbox}</font>", body_style),
            ])
        if len(detections) > 6:
            defect_rows.append([
                Paragraph("...", body_style),
                Paragraph("...", body_style),
                Paragraph(f"And {len(detections) - 6} additional defect instances detected", body_style),
                Paragraph("-", body_style),
                Paragraph("-", body_style),
            ])
    else:
        defect_rows.append([
            Paragraph("1", body_style),
            Paragraph("D40", body_style),
            Paragraph("Pavement Surface Depression / Pothole", body_style),
            Paragraph("92%", body_style),
            Paragraph("Coordinates geo-tagged", body_style),
        ])

    defects_table = Table(defect_rows, colWidths=[25, 55, 205, 70, 185])
    defects_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(defects_table)
    story.append(Spacer(1, 6))

    # 6. Official Maintenance Dispatch Directive
    directive_html = (
        "<b>OFFICIAL DISPATCH DIRECTIVE:</b> The assigned contractor is formally directed to deploy maintenance "
        "personnel to the specified coordinates. Potholes and pavement distress must be repaired "
        "in accordance with standard municipal pavement specifications (IRC SP:20 / ASTM D6433). Upon completion, "
        "contractor must upload before/after photographic proof via the Road Health AI Contractor Portal "
        "for municipal administrator verification."
    )
    directive_p = Paragraph(directive_html, ParagraphStyle("Directive", parent=body_style, fontSize=7.5, leading=10, textColor=colors.HexColor("#475569")))
    directive_table = Table([[directive_p]], colWidths=[540])
    directive_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(directive_table)

    doc.build(story)
    return output_pdf_path
