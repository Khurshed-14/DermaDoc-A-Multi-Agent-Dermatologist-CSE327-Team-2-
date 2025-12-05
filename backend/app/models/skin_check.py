from datetime import datetime
from typing import Optional, Dict
from pydantic import BaseModel, Field
from enum import Enum


class ImageStatus(str, Enum):
    """Status of image processing"""
    PENDING = "pending"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"


class DiseaseInfo(BaseModel):
    """Information about a disease classification"""
    name: str
    description: str
    severity: str
    recommendation: str


class SkinCheckImageBase(BaseModel):
    """Base model for skin check image"""
    relative_path: str
    user_id: str
    status: ImageStatus = ImageStatus.PENDING
    disease_type: Optional[str] = None
    body_part: Optional[str] = None
    confidence: Optional[float] = None
    predictions: Optional[Dict[str, float]] = None
    gemini_recommendation: Optional[str] = None
    gemini_description: Optional[str] = None


class SkinCheckImageCreate(SkinCheckImageBase):
    """Model for creating a new skin check image"""
    pass


class SkinCheckImageUpdate(BaseModel):
    """Model for updating a skin check image"""
    status: Optional[ImageStatus] = None
    disease_type: Optional[str] = None
    confidence: Optional[float] = None
    predictions: Optional[Dict[str, float]] = None


class SkinCheckImage(SkinCheckImageBase):
    """Model for skin check image response"""
    id: str
    created_at: datetime
    updated_at: datetime
    body_part: Optional[str] = None
    disease_info: Optional[DiseaseInfo] = None

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "id": "123",
                "relative_path": "skin_check_images/user_id/processing/filename.jpg",
                "user_id": "user123",
                "status": "pending",
                "disease_type": None,
                "body_part": "head",
                "confidence": None,
                "predictions": None,
                "disease_info": None,
                "created_at": "2025-01-01T00:00:00",
                "updated_at": "2025-01-01T00:00:00",
            }
        }
    }

