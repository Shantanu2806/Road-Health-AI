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
