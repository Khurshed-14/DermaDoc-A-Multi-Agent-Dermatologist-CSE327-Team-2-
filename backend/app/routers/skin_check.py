from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from datetime import datetime
from bson import ObjectId
from typing import Optional, List
import json
from app.models.skin_check import (
    SkinCheckImage,
    SkinCheckImageCreate,
    SkinCheckImageUpdate,
    ImageStatus,
    DiseaseInfo
)
from app.models.user import User
from app.routers.auth import get_current_user
from app.core.database import db
from app.core.storage import save_skin_check_image, delete_skin_check_image, get_image_url
from app.services.background_tasks import process_skin_check_image
from app.services.classifier import get_disease_info

router = APIRouter()


def _build_skin_check_image(img: dict) -> SkinCheckImage:
    """Helper function to build SkinCheckImage from database document"""
    disease_info = None
    if img.get("disease_type"):
        info = get_disease_info(img["disease_type"])
        disease_info = DiseaseInfo(
            name=info["name"],
            description=info["description"],
            severity=info["severity"],
            recommendation=info["recommendation"]
        )
    
    return SkinCheckImage(
        id=str(img["_id"]),
        relative_path=img["relative_path"],
        user_id=str(img["user_id"]),
        status=ImageStatus(img["status"]),
        disease_type=img.get("disease_type"),
        body_part=img.get("body_part"),
        confidence=img.get("confidence"),
        predictions=img.get("predictions"),
        disease_info=disease_info,
        created_at=img["created_at"],
        updated_at=img["updated_at"],
    )


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_skin_check_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    body_part: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a skin check image and trigger background classification
    
    Args:
        background_tasks: FastAPI BackgroundTasks for async processing
        file: Image file to upload
        body_part: Optional body part where the image was taken
        current_user: Current authenticated user
        
    Returns:
        Created skin check image document with image ID for polling
    """
    try:
        # Save image to storage (will be in processing directory)
        image_path = await save_skin_check_image(file, current_user.id)
        
        # Create image document
        now = datetime.utcnow()
        image_doc = {
            "relative_path": image_path,
            "user_id": ObjectId(current_user.id),
            "status": ImageStatus.PENDING.value,
            "disease_type": None,
            "body_part": body_part,
            "confidence": None,
            "predictions": None,
            "created_at": now,
            "updated_at": now,
        }
        
        # Insert into database
        result = await db.database.SkinCheckImages.insert_one(image_doc)
        image_id = str(result.inserted_id)
        
        # Trigger background classification task
        background_tasks.add_task(process_skin_check_image, image_id)
        
        # Return created image
        image_obj = SkinCheckImage(
            id=image_id,
            relative_path=image_path,
            user_id=current_user.id,
            status=ImageStatus.PENDING,
            disease_type=None,
            body_part=body_part,
            confidence=None,
            predictions=None,
            disease_info=None,
            created_at=now,
            updated_at=now,
        )
        
        image_json = image_obj.model_dump_json(exclude_none=False, exclude_unset=False)
        image_dict = json.loads(image_json)
        return JSONResponse(content=image_dict, status_code=status.HTTP_201_CREATED)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/images", response_model=List[SkinCheckImage])
async def get_user_skin_check_images(
    current_user: User = Depends(get_current_user)
):
    """
    Get all skin check images for the current user
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        List of skin check images
    """
    try:
        images = await db.database.SkinCheckImages.find(
            {"user_id": ObjectId(current_user.id)}
        ).sort("created_at", -1).to_list(length=None)
        
        return [_build_skin_check_image(img) for img in images]
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/results", response_model=List[SkinCheckImage])
async def get_user_results(
    current_user: User = Depends(get_current_user)
):
    """
    Get all processed skin check results for the current user
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        List of processed skin check images with results
    """
    try:
        # Get processed and processing images (exclude pending)
        images = await db.database.SkinCheckImages.find({
            "user_id": ObjectId(current_user.id),
            "status": {"$in": [ImageStatus.PROCESSED.value, ImageStatus.PROCESSING.value, ImageStatus.FAILED.value]}
        }).sort("created_at", -1).to_list(length=None)
        
        return [_build_skin_check_image(img) for img in images]
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/results/{image_id}", response_model=SkinCheckImage)
async def get_result(
    image_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific skin check result with full details
    
    Args:
        image_id: ID of the image
        current_user: Current authenticated user
        
    Returns:
        Skin check image with classification results
    """
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(image_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image ID"
            )
        
        image = await db.database.SkinCheckImages.find_one({
            "_id": ObjectId(image_id),
            "user_id": ObjectId(current_user.id)
        })
        
        if not image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Image not found"
            )
        
        return _build_skin_check_image(image)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/images/{image_id}", response_model=SkinCheckImage)
async def get_skin_check_image(
    image_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific skin check image
    
    Args:
        image_id: ID of the image
        current_user: Current authenticated user
        
    Returns:
        Skin check image document
    """
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(image_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image ID"
            )
        
        image = await db.database.SkinCheckImages.find_one({
            "_id": ObjectId(image_id),
            "user_id": ObjectId(current_user.id)
        })
        
        if not image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Image not found"
            )
        
        return _build_skin_check_image(image)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.put("/images/{image_id}", response_model=SkinCheckImage)
async def update_skin_check_image(
    image_id: str,
    image_update: SkinCheckImageUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Update a skin check image (status and disease_type)
    
    Args:
        image_id: ID of the image
        image_update: Update data
        current_user: Current authenticated user
        
    Returns:
        Updated skin check image document
    """
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(image_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image ID"
            )
        
        # Check if image exists and belongs to user
        image = await db.database.SkinCheckImages.find_one({
            "_id": ObjectId(image_id),
            "user_id": ObjectId(current_user.id)
        })
        
        if not image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Image not found"
            )
        
        # Build update document
        update_doc = {"updated_at": datetime.utcnow()}
        if image_update.status is not None:
            update_doc["status"] = image_update.status.value
        if image_update.disease_type is not None:
            update_doc["disease_type"] = image_update.disease_type
        if image_update.confidence is not None:
            update_doc["confidence"] = image_update.confidence
        if image_update.predictions is not None:
            update_doc["predictions"] = image_update.predictions
        
        # Update image
        await db.database.SkinCheckImages.update_one(
            {"_id": ObjectId(image_id)},
            {"$set": update_doc}
        )
        
        # Fetch updated image
        updated_image = await db.database.SkinCheckImages.find_one({
            "_id": ObjectId(image_id)
        })
        
        return _build_skin_check_image(updated_image)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.delete("/images/{image_id}")
async def delete_skin_check_image_endpoint(
    image_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a skin check image
    
    Args:
        image_id: ID of the image
        current_user: Current authenticated user
        
    Returns:
        Success message
    """
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(image_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image ID"
            )
        
        # Check if image exists and belongs to user
        image = await db.database.SkinCheckImages.find_one({
            "_id": ObjectId(image_id),
            "user_id": ObjectId(current_user.id)
        })
        
        if not image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Image not found"
            )
        
        # Delete file from storage
        await delete_skin_check_image(image["relative_path"])
        
        # Delete from database
        await db.database.SkinCheckImages.delete_one({"_id": ObjectId(image_id)})
        
        return {"message": "Image deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )
