import os
import sys
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

PDF_FILENAME = "Road_Health_AI_Project_Code_Explanation_Guide.pdf"

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages 2+)
        if self._pageNumber > 1:
            self.drawString(36, 11 * inch - 28, "Road Health AI — Project Architecture & Code Explanation Guide")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(36, 11 * inch - 32, 8.5 * inch - 36, 11 * inch - 32)
            
        # Footer
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 36, 22, page_str)
        self.drawString(36, 22, "Confidential — Prepared for Academic Project Presentation & Viva Defense")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 32, 8.5 * inch - 36, 32)
        self.restoreState()

def create_guide_pdf(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=42,
        bottomMargin=42
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=4,
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#0369A1'),
        spaceAfter=12,
    )

    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor('#0284C7'),
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#334155'),
        spaceAfter=5,
    )

    bold_body = ParagraphStyle(
        'BoldBody',
        parent=body_style,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#0F172A'),
    )

    code_pill = ParagraphStyle(
        'CodePill',
        parent=body_style,
        fontName='Courier-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#0369A1'),
    )

    callout_text = ParagraphStyle(
        'CalloutText',
        parent=body_style,
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11.5,
        textColor=colors.HexColor('#1E293B'),
    )

    story = []

    # Title Banner Block
    banner_data = [
        [
            Paragraph("ROAD HEALTH AI — COMPLETE CODE & ARCHITECTURE GUIDE", title_style),
        ],
        [
            Paragraph("<b>Panel-by-Panel Code Walkthrough, File Structure, Core Algorithms & Viva Defense</b>", subtitle_style),
        ],
        [
            Paragraph("<b>Technology Stack:</b> FastAPI (Python 3.10) • PyTorch YOLOv8 • React 18 (Vite + Tailwind CSS) • ReportLab • SQLite", body_style),
        ]
    ]
    banner_table = Table(banner_data, colWidths=[7.5 * inch])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F0F9FF')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#BAE6FD')),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 8),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 10))

    # SECTION 1: ARCHITECTURE OVERVIEW
    story.append(Paragraph("1. System Architecture & High-Level Directory Tree", h1_style))
    story.append(Paragraph(
        "The project is structured into two clean tiers: an asynchronous <b>FastAPI + PyTorch</b> backend providing AI road damage detection, mathematical condition scoring, GIS location routing, and automated PDF/email dispatches; and a responsive <b>React (Vite)</b> frontend implementing distinct Role-Based Access Control (RBAC) views for Citizens, Contractors, and Municipal Administrators.",
        body_style
    ))

    arch_data = [
        ["Subsystem", "Directory Path", "Primary Technologies", "Core Responsibility"],
        ["AI Backend & Engine", "backend/", "FastAPI, PyTorch (YOLO), SQLAlchemy, ReportLab", "Image analysis, scoring, contractor auto-matching, PDF/email dispatches"],
        ["Citizen Panel", "frontend/src/pages/", "React, HTML5 Geolocation, Leaflet Maps", "Road defect reporting, GPS capture, before/after visual inspection"],
        ["Contractor Panel", "frontend/src/pages/", "React, Framer Motion, Axios Client", "Field repair tracking, Start Work status, After-repair photo verification"],
        ["Admin Panel", "frontend/src/pages/", "React, Tailwind CSS, Lucide Icons", "Contractor verification, Area ticket assignment, repair approval/rejection"]
    ]
    t_arch = Table([[Paragraph(c, bold_body if i == 0 else body_style) for c in row] for i, row in enumerate(arch_data)], colWidths=[1.3*inch, 1.4*inch, 2.1*inch, 2.7*inch])
    t_arch.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E2E8F0')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_arch)
    story.append(Spacer(1, 10))

    # SECTION 2: CITIZEN / USER PANEL
    story.append(Paragraph("2. Citizen / User Panel (Defect Reporting & Tracking)", h1_style))
    story.append(Paragraph("Empowers public citizens to report road distress with automated camera and GPS capture.", body_style))

    user_files = [
        ["File Name", "Relative Path", "Importance", "What to Explain to Mam"],
        [
            "UploadPage.jsx",
            "frontend/src/pages/UploadPage.jsx",
            "CRITICAL",
            "1. Auto-GPS capture via navigator.geolocation.getCurrentPosition.<br/>"
            "2. OpenStreetMap reverse-geocoding (converts GPS coordinates to Indian street address).<br/>"
            "3. Drag-and-drop / mobile camera image upload sending multipart POST to /analyze."
        ],
        [
            "ResultsPage.jsx",
            "frontend/src/pages/ResultsPage.jsx",
            "CRITICAL",
            "1. Interactive Before/After slider comparing raw road photo vs. YOLO bounding boxes.<br/>"
            "2. SVG Radial Road Health Gauge rendering 0-100 score and condition label.<br/>"
            "3. Auto-ticket notification banner if score <= 60 with one-click link to view ticket.<br/>"
            "4. Official PDF report download button."
        ],
        [
            "RoadMapPage.jsx",
            "frontend/src/pages/RoadMapPage.jsx",
            "HIGH",
            "1. Leaflet & OpenStreetMap interactive GIS visualization of defects.<br/>"
            "2. Strict color coding: Red (<=30 Critical), Orange (<=60 Poor), Yellow (<=80 Fair).<br/>"
            "3. Clickable popups showing defect image thumbnail and health score."
        ],
        [
            "HistoryPage.jsx",
            "frontend/src/pages/HistoryPage.jsx",
            "MEDIUM",
            "1. Lists citizen's historical uploads with date, location, condition, and status."
        ]
    ]
    t_user = Table([[Paragraph(c, bold_body if i == 0 else body_style) for c in row] for i, row in enumerate(user_files)], colWidths=[1.3*inch, 1.8*inch, 0.9*inch, 3.5*inch])
    t_user.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E0F2FE')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#BAE6FD')),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_user)
    story.append(Spacer(1, 10))

    # SECTION 3: CONTRACTOR PANEL
    story.append(Paragraph("3. Contractor Panel (Field Work Orders & Repair Proofs)", h1_style))
    story.append(Paragraph("Used by verified area contractors (e.g. Tanvi for Thane/Mumbai, Shyamal for Katraj/Pune) to execute repairs.", body_style))

    cont_files = [
        ["File Name", "Relative Path", "Importance", "What to Explain to Mam"],
        [
            "ContractorDashboardPage.jsx",
            "frontend/src/pages/ContractorDashboardPage.jsx",
            "CRITICAL",
            "1. KPI Metrics: Assigned Tickets, Work in Progress, Pending Reviews, Resolved.<br/>"
            "2. Overdue/Urgent Ticket Highlights with deadline countdowns.<br/>"
            "3. Restricts ticket view strictly to contractor's assigned municipal jurisdiction."
        ],
        [
            "TicketDetailPage.jsx\n(Contractor Mode)",
            "frontend/src/pages/TicketDetailPage.jsx",
            "CRITICAL",
            "1. 'Start Work' action: Changes status to 'In Progress' notifying municipal admin.<br/>"
            "2. 'Submit Repair' Form: Contractor attaches after-repair photo verification proof.<br/>"
            "3. Submits repair notes (e.g. asphalt compaction details) for administrator audit."
        ],
        [
            "ContractorProfilePage.jsx",
            "frontend/src/pages/ContractorProfilePage.jsx",
            "MEDIUM",
            "1. Displays contractor's service state, city, and primary area (e.g., Thane, Katraj)."
        ]
    ]
    t_cont = Table([[Paragraph(c, bold_body if i == 0 else body_style) for c in row] for i, row in enumerate(cont_files)], colWidths=[1.4*inch, 1.8*inch, 0.9*inch, 3.4*inch])
    t_cont.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FEF3C7')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#FDE68A')),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_cont)
    story.append(Spacer(1, 10))

    # SECTION 4: ADMINISTRATOR PANEL
    story.append(Paragraph("4. Administrator Panel (Governance, Auto-Assignment & Approvals)", h1_style))
    story.append(Paragraph("Central control room for municipal engineers and executive administrators.", body_style))

    admin_files = [
        ["File Name", "Relative Path", "Importance", "What to Explain to Mam"],
        [
            "TicketDetailPage.jsx\n(Admin Mode)",
            "frontend/src/pages/TicketDetailPage.jsx",
            "CRITICAL",
            "1. Zero-Manual Contractor Assignment: Detects defect location and automatically pre-selects the registered area contractor (e.g. Tanvi for Thane, Shyamal for Katraj).<br/>"
            "2. Target Deadline Picker with quick-select buttons (+3d Urgent, +7d Normal, +14d).<br/>"
            "3. Assignment Instructions/Notes input.<br/>"
            "4. 'Assign & Dispatch': Transitions status to 'Assigned', triggers live SMTP work-order email with official PDF.<br/>"
            "5. Before vs After Photographic Comparison: Admin approves repair (marking ticket 'Resolved') or rejects it with rework notes."
        ],
        [
            "AdminDashboardPage.jsx",
            "frontend/src/pages/AdminDashboardPage.jsx",
            "CRITICAL",
            "1. System-wide analytics: Total Inspections, Severe Hotspots, Active Contractors.<br/>"
            "2. Contractor Management Table: Admin can review, approve, or deactivate contractors.<br/>"
            "3. Email Logs Table: Live audit trail of all automated SMTP dispatches."
        ],
        [
            "TicketsPage.jsx",
            "frontend/src/pages/TicketsPage.jsx",
            "HIGH",
            "1. Master registry of all tickets across all states with multi-facet filters.<br/>"
            "2. Export CSV button for municipal records and spreadsheet audits."
        ]
    ]
    t_admin = Table([[Paragraph(c, bold_body if i == 0 else body_style) for c in row] for i, row in enumerate(admin_files)], colWidths=[1.4*inch, 1.8*inch, 0.9*inch, 3.4*inch])
    t_admin.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#DCFCE7')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#BBF7D0')),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_admin)
    story.append(Spacer(1, 10))

    # SECTION 5: BACKEND & AI CORE
    story.append(Paragraph("5. Backend Core & AI Pipeline (Key Files & Formulas)", h1_style))
    story.append(Paragraph("The 6 Python files powering AI model inference, condition scoring, database ORM, and reporting:", body_style))

    be_files = [
        ["Module File", "Key Function / Class", "Core Logic & Mathematical Formulation"],
        [
            "backend/scoring.py",
            "calculate_road_health_score()",
            "Calculates Damage Index and Road Health Score (0-100):<br/>"
            "• Weights: D40 Pothole (1.0), D20 Alligator (0.8), D10 Transverse (0.6), D00 Longitudinal (0.5).<br/>"
            "• Formula: <i>Damage Index = sum(bbox_area_i * weight_i) * scale</i><br/>"
            "• <b>Road Health Score = max(0, 100 - (Damage Index * 3.0))</b><br/>"
            "• Classification: Critical (<=30), Poor (<=60), Fair (<=80), Good (>80)."
        ],
        [
            "backend/main.py",
            "/analyze, /tickets/{id}/assign,\n_auto_create_ticket()",
            "• Executes YOLO inference and invokes scoring algorithm.<br/>"
            "• Auto-creates ticket in 'Reported' status if score <= 60.<br/>"
            "• <i>find_contractor_for_location()</i> matches location tokens against contractor service zones.<br/>"
            "• Enforces strict Role-Based Access Control (Admin, Contractor, User)."
        ],
        [
            "backend/models.py",
            "User, Analysis, MaintenanceTicket,\nRepairSubmission, TicketStatusHistory",
            "• SQLAlchemy ORM schema with foreign key relationships.<br/>"
            "• Stores GPS coordinates, road health score, assigned/suggested contractors.<br/>"
            "• Self-healing SQLite migrations via <i>run_db_migrations()</i>."
        ],
        [
            "backend/email_service.py",
            "send_ticket_assigned_email(),\nsend_damage_alert_sync()",
            "• Asynchronous daemon threads connecting to smtp.gmail.com (port 587).<br/>"
            "• Attaches official PDF report automatically to emails.<br/>"
            "• Logs every dispatch status in the 'email_logs' database table."
        ],
        [
            "backend/pdf_generator.py",
            "generate_inspection_pdf(),\ngenerate_ticket_work_order_pdf()",
            "• Uses ReportLab to generate official government-styled inspection reports.<br/>"
            "• Embeds raw vs annotated photos, defect tables, severity meters, and QR codes."
        ],
        [
            "backend/visualizer.py",
            "draw_detections_cv2()",
            "• OpenCV bounding-box drawing with class labels, confidence scores, and custom colors."
        ]
    ]
    t_be = Table([[Paragraph(c, bold_body if i == 0 else body_style) for c in row] for i, row in enumerate(be_files)], colWidths=[1.4*inch, 1.8*inch, 4.3*inch])
    t_be.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_be)
    story.append(Spacer(1, 10))

    # SECTION 6: VIVA DEFENSE & CHEAT SHEET
    story.append(Paragraph("6. Viva Defense Cheat Sheet (Top Questions & Answers for Mam)", h1_style))
    
    qa_list = [
        (
            "Q1: How does the AI model detect road defects and calculate the Road Health Score?",
            "<b>Answer:</b> We trained a YOLOv8 convolutional neural network on road damage datasets to detect four defect classes: D40 (Potholes), D20 (Alligator Cracking), D10 (Transverse), and D00 (Longitudinal). In <b>scoring.py</b>, each defect is weighted by severity (potholes have weight 1.0; longitudinal cracks 0.5). We calculate the percentage of pixel area affected and compute the <b>Damage Index</b>. The final <b>Road Health Score = 100 - (Damage Index * 3.0)</b>, bounded between 0 and 100. A score of 30 or below is classified as Critical, triggering immediate emergency ticket creation."
        ),
        (
            "Q2: How does the automatic contractor assignment work without manual searching?",
            "<b>Answer:</b> In <b>main.py</b> (<i>find_contractor_for_location</i>), when a citizen reports an inspection, the location string is normalized and tokenized. The system executes a two-tier match against active, approved contractors in the database: Tier 1 checks the contractor's <i>service_area</i> (e.g. 'Thane' matches Tanvi; 'Katraj' matches Shyamal). Tier 2 checks <i>service_city</i> (e.g. 'Mumbai', 'Pune'). When the Admin opens the ticket, that area contractor is <b>automatically pre-selected</b> by default. The Admin simply sets the deadline date and instructions, and confirms assignment."
        ),
        (
            "Q3: What is the complete lifecycle of a maintenance ticket?",
            "<b>Answer:</b> The ticket progresses through six formal states: <b>Reported</b> (auto-created by AI inspection) &rarr; <b>Verified</b> (validated by Admin) &rarr; <b>Assigned</b> (Admin assigns to area contractor with deadline & note; work order PDF emailed) &rarr; <b>In Progress</b> (contractor clicks Start Work) &rarr; <b>Repair Submitted</b> (contractor uploads after-repair photographic proof) &rarr; <b>Resolved</b> (Admin verifies Before vs After photos and approves completion)."
        ),
        (
            "Q4: How does the application ensure security and Role-Based Access Control (RBAC)?",
            "<b>Answer:</b> We use JSON Web Tokens (JWT) signed with HMAC-SHA256 and passwords hashed with bcrypt in <b>auth.py</b>. FastAPI route dependencies (<i>get_current_user</i>, <i>get_current_admin</i>) inspect the JWT claims. Citizens can only view their own historical reports; contractors can only access tickets assigned to their jurisdiction; and only the Administrator has access to contractor approval, re-assignment, and repair verification endpoints."
        ),
        (
            "Q5: How are official PDF reports and email notifications generated?",
            "<b>Answer:</b> In <b>pdf_generator.py</b>, ReportLab dynamically renders government-standard PDF work orders containing defect coordinates, raw/annotated before photos, severity badges, and municipal disclaimers. In <b>email_service.py</b>, asynchronous daemon threads connect via Gmail SMTP (TLS port 587) using an App Password to dispatch the email and attach the generated PDF without blocking the user interface."
        )
    ]

    for q, a in qa_list:
        qa_data = [
            [Paragraph(f"<b>{q}</b>", h2_style)],
            [Paragraph(a, body_style)]
        ]
        qa_table = Table(qa_data, colWidths=[7.5 * inch])
        qa_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, 0), 6),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 6),
        ]))
        story.append(qa_table)
        story.append(Spacer(1, 6))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF: {output_path}")

if __name__ == "__main__":
    out_file = os.path.join(os.getcwd(), PDF_FILENAME)
    create_guide_pdf(out_file)
