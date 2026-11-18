"""
schemas.py - Pydantic Schemas for Authentication, Analyses, Map Markers, and Dashboards
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------
# AUTHENTICATION SCHEMAS
# ---------------------------------------------------------
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password with minimum 6 characters")
    full_name: str = Field(..., min_length=2)
    role: str = Field("user", description="user | contractor | admin")
    service_state: Optional[str] = None
    service_city: Optional[str] = None
    service_area: Optional[str] = None


class ContractorProfileUpdate(BaseModel):
    service_state: Optional[str] = None
    service_city: Optional[str] = None
    service_area: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyResetOTPRequest(BaseModel):
    email: EmailStr
    otp: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    is_approved: bool = True
    otp_verified: bool = False
    service_state: Optional[str] = None
    service_city: Optional[str] = None
    service_area: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ---------------------------------------------------------
# DETECTION & ANALYSIS SCHEMAS
# ---------------------------------------------------------
class DetectionItem(BaseModel):
    class_code: str
    class_name: str
    confidence: float
    bbox: List[int]  # [xmin, ymin, xmax, ymax] in pixel coordinates

    class Config:
        from_attributes = True


class AnalysisResponse(BaseModel):
    id: int
    timestamp: str
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    damage_index: float
    coverage_pct: float
    severity: str
    road_health_score: float
    condition_label: str
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    detections: List[DetectionItem] = []
    original_image_url: str
    annotated_image_url: str
    annotated_image_path: str
    ticket_id: Optional[str] = None
    ticket_priority: Optional[str] = None
    ticket_status: Optional[str] = None
    possible_duplicate: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------
# MAP FEATURE SCHEMAS
# ---------------------------------------------------------
class MapMarkerResponse(BaseModel):
    id: int
    latitude: float
    longitude: float
    road_health_score: float
    condition_label: str
    severity: str
    timestamp: str
    location_name: Optional[str] = None
    defect_count: int = 0

    class Config:
        from_attributes = True


# ---------------------------------------------------------
# EMAIL LOG & ADMIN SCHEMAS
# ---------------------------------------------------------
class EmailLogResponse(BaseModel):
    id: int
    timestamp: str
    recipient: str
    subject: str
    status: str
    error_message: Optional[str] = None
    road_health_score: Optional[float] = None
    analysis_id: Optional[int] = None

    class Config:
        from_attributes = True


class AdminStatsResponse(BaseModel):
    total_users: int
    total_analyses: int
    analyses_by_role: Dict[str, int]
    analyses_by_condition: Dict[str, int]
    average_score: float
    active_users: int
    database_size_bytes: int
    system_status: str
    model_info: str
    pending_contractors: int = 0
    contractors: Optional[List[Dict[str, Any]]] = None
    overdue_tickets: Optional[int] = 0
    ticket_summary: Optional[Dict[str, Any]] = None


class ContractorDashboardResponse(BaseModel):
    total_analyses: int
    average_score: float
    condition_counts: Dict[str, int]
    recent_critical_or_poor: List[AnalysisResponse]
    priority_queue: List[Dict[str, Any]] = []
    contractor_info: Optional[Dict[str, Any]] = None


class HealthStatus(BaseModel):
    status: str
    system: str
    version: str


# ---------------------------------------------------------
# MAINTENANCE TICKET SCHEMAS
# ---------------------------------------------------------
class TicketResponse(BaseModel):
    id: int
    ticket_id: str
    analysis_id: int
    created_at: str
    updated_at: str
    title: str
    status: str
    priority: str
    priority_reason: Optional[str] = None
    assigned_contractor_id: Optional[int] = None
    assigned_contractor_name: Optional[str] = None
    assigned_contractor_email: Optional[str] = None
    assigned_contractor_area: Optional[str] = None
    assigned_contractor_city: Optional[str] = None
    assigned_contractor_state: Optional[str] = None
    deadline: Optional[str] = None
    is_overdue: bool = False
    complaint_age_hours: float = 0.0
    duplicate_of: Optional[int] = None
    duplicate_of_ticket_id: Optional[str] = None
    road_importance: Optional[str] = "Unknown"
    is_overdue_notified: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    road_health_score: Optional[float] = None
    condition_label: Optional[str] = None
    severity: Optional[str] = None
    analysis_summary: Optional[Dict[str, Any]] = None
    repair_submission_status: Optional[str] = None

    class Config:
        from_attributes = True


class TicketAssignRequest(BaseModel):
    contractor_id: int
    deadline: Optional[str] = None
    deadline_days: Optional[int] = None
    road_importance: Optional[str] = "Unknown"
    notes: Optional[str] = None


class TicketStatusUpdate(BaseModel):
    notes: Optional[str] = None
    comment: Optional[str] = None


class TicketReopenRequest(BaseModel):
    notes: Optional[str] = None


class RepairSubmissionCreate(BaseModel):
    notes: Optional[str] = None
    materials_used: Optional[str] = None
    cost_estimate: Optional[float] = None


class RepairSubmissionResponse(BaseModel):
    id: int
    ticket_id: int
    submitted_by: int
    submitted_by_name: Optional[str] = None
    submitted_by_email: Optional[str] = None
    submitted_at: str
    after_image_path: Optional[str] = None
    notes: Optional[str] = None
    status: str
    reviewed_by: Optional[int] = None
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[str] = None
    rejection_reason: Optional[str] = None

    class Config:
        from_attributes = True


class TicketStatusHistoryResponse(BaseModel):
    id: int
    ticket_id: int
    changed_by: Optional[int] = None
    changed_by_name: Optional[str] = None
    changed_at: str
    old_status: Optional[str] = None
    new_status: str
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class TicketDetailResponse(BaseModel):
    ticket: TicketResponse
    status_history: List[TicketStatusHistoryResponse] = []
    repair_submissions: List[RepairSubmissionResponse] = []
    analysis: Optional[AnalysisResponse] = None
    before_image_url: Optional[str] = None
    after_image_url: Optional[str] = None


class MaintenanceSummaryResponse(BaseModel):
    total_tickets: int
    open_tickets: int
    resolved_tickets: int
    overdue_tickets: int
    high_priority_tickets: int
    tickets_by_status: Dict[str, int]
    tickets_by_priority: Dict[str, int]
    tickets_created_vs_resolved: List[Dict[str, Any]] = []
    top_locations: List[Dict[str, Any]] = []
    avg_resolution_time_hours: Optional[float] = None


class TicketMergeRequest(BaseModel):
    merge_into_ticket_id: str
    reason: Optional[str] = None


class RepairRejectRequest(BaseModel):
    rejection_reason: str


class RepairVerificationRequest(BaseModel):
    approved: bool
    rejection_reason: Optional[str] = None

