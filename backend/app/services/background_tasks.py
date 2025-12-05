"""
Background task service for async skin lesion classification
"""
from datetime import datetime
from pathlib import Path
from bson import ObjectId
from app.core.database import db
from app.core.storage import get_absolute_path, move_to_processed
from app.services.classifier import get_classifier, get_disease_info, generate_personalized_disease_info
from app.models.skin_check import ImageStatus
import traceback


async def process_skin_check_image(image_id: str):
    """
    Background task to process a skin check image through the classifier
    
    Args:
        image_id: MongoDB ObjectId of the skin check image document
    """
    try:
        print(f"Starting classification for image: {image_id}")
        
        # Validate ObjectId
        if not ObjectId.is_valid(image_id):
            print(f"Invalid image ID: {image_id}")
            return
        
        # Get the image document from database
        image_doc = await db.database.SkinCheckImages.find_one({
            "_id": ObjectId(image_id)
        })
        
        if not image_doc:
            print(f"Image not found: {image_id}")
            return
        
        # Update status to PROCESSING
        await db.database.SkinCheckImages.update_one(
            {"_id": ObjectId(image_id)},
            {
                "$set": {
                    "status": ImageStatus.PROCESSING.value,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        print(f"Updated status to PROCESSING for image: {image_id}")
        
        # Get the absolute path to the image
        relative_path = image_doc["relative_path"]
        absolute_path = get_absolute_path(relative_path)
        
        if not absolute_path.exists():
            print(f"Image file not found at: {absolute_path}")
            await _mark_as_failed(image_id, "Image file not found")
            return
        
        # Run the classifier
        print(f"Running classification on: {absolute_path}")
        classifier = get_classifier()
        result = await classifier.predict_async(absolute_path)
        
        print(f"Classification result for {image_id}: {result['disease_type']} ({result['confidence']:.2%})")
        
        # Get base disease info
        base_info = get_disease_info(result["disease_type"])
        
        # Generate personalized recommendation and description using Gemini
        print(f"Generating personalized disease information with Gemini...")
        personalized_info = await generate_personalized_disease_info(
            disease_type=result["disease_type"],
            confidence=result["confidence"],
            predictions=result["predictions"],
            base_info=base_info
        )
        
        # Move image from processing to processed
        new_relative_path = await move_to_processed(relative_path)
        print(f"Moved image to: {new_relative_path}")
        
        # Update database with results (including personalized info)
        await db.database.SkinCheckImages.update_one(
            {"_id": ObjectId(image_id)},
            {
                "$set": {
                    "status": ImageStatus.PROCESSED.value,
                    "disease_type": result["disease_type"],
                    "confidence": result["confidence"],
                    "predictions": result["predictions"],
                    "relative_path": new_relative_path,
                    "gemini_recommendation": personalized_info["recommendation"],  # Store generated recommendation
                    "gemini_description": personalized_info["description"],  # Store generated description
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        print(f"Successfully processed image: {image_id}")
        
    except Exception as e:
        print(f"Error processing image {image_id}: {str(e)}")
        traceback.print_exc()
        await _mark_as_failed(image_id, str(e))


async def _mark_as_failed(image_id: str, error_message: str):
    """Mark an image as failed processing"""
    try:
        await db.database.SkinCheckImages.update_one(
            {"_id": ObjectId(image_id)},
            {
                "$set": {
                    "status": ImageStatus.FAILED.value,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        print(f"Marked image {image_id} as FAILED: {error_message}")
    except Exception as e:
        print(f"Error marking image as failed: {e}")


