from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form
from fastapi.responses import JSONResponse
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional, List
import json
from app.models.skin_check import (
    SkinCheckImage,
    SkinCheckImageCreate,
    SkinCheckImageUpdate,
    ImageStatus
)
from app.models.user import User
from app.routers.auth import get_current_user
from app.core.database import db
from app.core.storage import save_skin_check_image, delete_skin_check_image, get_image_url

router = APIRouter()


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_skin_check_image(
    file: UploadFile = File(...),
    body_part: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a skin check image
    
    Args:
        file: Image file to upload
        body_part: Optional body part where the image was taken
        current_user: Current authenticated user
        
    Returns:
        Created skin check image document
    """
    try:
        # Save image to storage
        image_path = await save_skin_check_image(file, current_user.id)
        
        # Create image document
        now = datetime.now(timezone.utc)
        image_doc = {
            "relative_path": image_path,
            "user_id": ObjectId(current_user.id),
            "status": ImageStatus.PENDING.value,
            "disease_type": None,
            "body_part": body_part,
            "created_at": now,
            "updated_at": now,
        }
        
        # Insert into database
        result = await db.database.SkinCheckImages.insert_one(image_doc)
        image_id = str(result.inserted_id)
        
        # Return created image
        image_obj = SkinCheckImage(
            id=image_id,
            relative_path=image_path,
            user_id=current_user.id,
            status=ImageStatus.PENDING,
            disease_type=None,
            body_part=body_part,
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
        
        image_list = []
        for img in images:
            image_obj = SkinCheckImage(
                id=str(img["_id"]),
                relative_path=img["relative_path"],
                user_id=str(img["user_id"]),
                status=ImageStatus(img["status"]),
                disease_type=img.get("disease_type"),
                body_part=img.get("body_part"),
                created_at=img["created_at"],
                updated_at=img["updated_at"],
            )
            image_list.append(image_obj)
        
        return image_list
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
        
        image_obj = SkinCheckImage(
            id=str(image["_id"]),
            relative_path=image["relative_path"],
            user_id=str(image["user_id"]),
            status=ImageStatus(image["status"]),
            disease_type=image.get("disease_type"),
            body_part=image.get("body_part"),
            created_at=image["created_at"],
            updated_at=image["updated_at"],
        )
        
        return image_obj
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
        update_doc = {"updated_at": datetime.now(timezone.utc)}
        if image_update.status is not None:
            update_doc["status"] = image_update.status.value
        if image_update.disease_type is not None:
            update_doc["disease_type"] = image_update.disease_type
        
        # Update image
        await db.database.SkinCheckImages.update_one(
            {"_id": ObjectId(image_id)},
            {"$set": update_doc}
        )
        
        # Fetch updated image
        updated_image = await db.database.SkinCheckImages.find_one({
            "_id": ObjectId(image_id)
        })
        
        image_obj = SkinCheckImage(
            id=str(updated_image["_id"]),
            relative_path=updated_image["relative_path"],
            user_id=str(updated_image["user_id"]),
            status=ImageStatus(updated_image["status"]),
            disease_type=updated_image.get("disease_type"),
            body_part=updated_image.get("body_part"),
            created_at=updated_image["created_at"],
            updated_at=updated_image["updated_at"],
        )
        
        return image_obj
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
async def delete_skin_check_image(
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
        from app.core.storage import delete_skin_check_image as delete_image_file
        await delete_image_file(image["relative_path"])
        
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

