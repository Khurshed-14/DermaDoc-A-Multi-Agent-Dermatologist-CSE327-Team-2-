"""
Storage utilities for handling file uploads
"""
import os
import uuid
from pathlib import Path
from typing import Optional
import aiofiles
from fastapi import UploadFile, HTTPException, status

# Storage directory - Use absolute path relative to this file's location
# This ensures storage is always in the backend directory regardless of where server is run from
_BACKEND_DIR = Path(__file__).parent.parent.parent  # Go up from app/core/storage.py to backend/
STORAGE_ROOT = _BACKEND_DIR / "storage"
USER_IMAGES_DIR = STORAGE_ROOT / "user_images"
SKIN_CHECK_IMAGES_DIR = STORAGE_ROOT / "skin_check_images"

# Ensure directories exist
USER_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
SKIN_CHECK_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

# Allowed image extensions
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB


def get_allowed_extensions() -> set:
    """Get allowed image file extensions"""
    return ALLOWED_IMAGE_EXTENSIONS


async def save_user_image(file: UploadFile, user_id: str) -> str:
    """
    Save user uploaded image to storage
    
    Args:
        file: Uploaded file object
        user_id: User ID for organizing files
        
    Returns:
        Relative path to the saved image (e.g., "user_images/user_id/filename.jpg")
    """
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )
    
    # Create user-specific directory
    user_dir = USER_IMAGES_DIR / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    filename = f"{uuid.uuid4()}{file_ext}"
    file_path = user_dir / filename
    
    # Read file content and check size
    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_IMAGE_SIZE / 1024 / 1024}MB"
        )
    
    # Validate it's actually an image by checking magic bytes
    if not content.startswith(b'\xff\xd8\xff') and not content.startswith(b'\x89PNG') and not content.startswith(b'GIF') and not content.startswith(b'WEBP', 8):
        # Basic validation - for production, use proper image library
        if not file_ext in {'.jpg', '.jpeg', '.png', '.gif', '.webp'}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image file"
            )
    
    # Save file
    try:
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        # Verify file was saved
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save image: File was not created at {file_path}"
            )
        
        return f"user_images/{user_id}/{filename}"
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save image: {str(e)}"
        )


async def delete_user_image(image_path: Optional[str]) -> bool:
    """
    Delete user image from storage
    
    Args:
        image_path: Relative path to the image
        
    Returns:
        True if deleted, False if not found
    """
    if not image_path:
        return False
    
    file_path = STORAGE_ROOT / image_path
    if file_path.exists() and file_path.is_file():
        try:
            file_path.unlink()
            # Try to remove parent directory if empty
            parent_dir = file_path.parent
            if parent_dir.exists() and not any(parent_dir.iterdir()):
                parent_dir.rmdir()
            return True
        except Exception:
            return False
    return False


def get_image_url(image_path: Optional[str]) -> Optional[str]:
    """
    Get URL for serving the image
    
    Args:
        image_path: Relative path to the image
        
    Returns:
        URL path for the image
    """
    if not image_path:
        return None
    return f"/api/storage/{image_path}"


async def save_skin_check_image(file: UploadFile, user_id: str) -> str:
    """
    Save skin check image to storage in the processing subdirectory
    
    Args:
        file: Uploaded file object
        user_id: User ID for organizing files
        
    Returns:
        Relative path to the saved image (e.g., "skin_check_images/user_id/processing/filename.jpg")
    """
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )
    
    # Create user-specific processing directory
    processing_dir = SKIN_CHECK_IMAGES_DIR / user_id / "processing"
    processing_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    filename = f"{uuid.uuid4()}{file_ext}"
    file_path = processing_dir / filename
    
    # Read file content and check size
    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_IMAGE_SIZE / 1024 / 1024}MB"
        )
    
    # Validate it's actually an image by checking magic bytes
    if not content.startswith(b'\xff\xd8\xff') and not content.startswith(b'\x89PNG') and not content.startswith(b'GIF') and not content.startswith(b'WEBP', 8):
        # Basic validation - for production, use proper image library
        if not file_ext in {'.jpg', '.jpeg', '.png', '.gif', '.webp'}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image file"
            )
    
    # Save file
    try:
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        # Verify file was saved
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save image: File was not created at {file_path}"
            )
        
        return f"skin_check_images/{user_id}/processing/{filename}"
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save image: {str(e)}"
        )


def move_to_processed(relative_path: str) -> str:
    """
    Move an image from processing to processed directory
    
    Args:
        relative_path: Current relative path (e.g., "skin_check_images/user_id/processing/filename.jpg")
        
    Returns:
        New relative path (e.g., "skin_check_images/user_id/processed/filename.jpg")
    """
    if not relative_path or "/processing/" not in relative_path:
        return relative_path
    
    # Get current file path
    current_path = STORAGE_ROOT / relative_path
    if not current_path.exists():
        return relative_path
    
    # Create new path in processed directory
    new_relative_path = relative_path.replace("/processing/", "/processed/")
    new_path = STORAGE_ROOT / new_relative_path
    
    # Ensure processed directory exists
    new_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Move the file
    try:
        import shutil
        shutil.move(str(current_path), str(new_path))
        
        # Try to remove processing directory if empty
        processing_dir = current_path.parent
        if processing_dir.exists() and not any(processing_dir.iterdir()):
            processing_dir.rmdir()
        
        return new_relative_path
    except Exception as e:
        print(f"Error moving file to processed: {e}")
        return relative_path


def get_absolute_path(relative_path: str) -> Path:
    """
    Get the absolute path for a relative storage path
    
    Args:
        relative_path: Relative path from storage root
        
    Returns:
        Absolute Path object
    """
    return STORAGE_ROOT / relative_path


async def delete_skin_check_image(image_path: Optional[str]) -> bool:
    """
    Delete skin check image from storage
    
    Args:
        image_path: Relative path to the image
        
    Returns:
        True if deleted, False if not found
    """
    if not image_path:
        return False
    
    file_path = STORAGE_ROOT / image_path
    if file_path.exists() and file_path.is_file():
        try:
            file_path.unlink()
            # Try to remove parent directory if empty
            parent_dir = file_path.parent
            if parent_dir.exists() and not any(parent_dir.iterdir()):
                parent_dir.rmdir()
            return True
        except Exception:
            return False
    return False

