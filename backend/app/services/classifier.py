"""
Skin lesion classification service using EfficientNetB4
"""
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
from pathlib import Path
from typing import Dict, Optional
import asyncio
from functools import lru_cache
from google import generativeai as genai
from app.core.config import settings

# Model path - relative to backend directory
_BACKEND_DIR = Path(__file__).parent.parent.parent
MODEL_PATH = _BACKEND_DIR / "CNN Models" / "efficientnetb4_classifier.pth"

# Class labels for the 7 skin lesion types
CLASS_LABELS = ["AKIEC", "BCC", "BKL", "DF", "MEL", "NV", "VASC"]

# Disease information mapping
DISEASE_INFO = {
    "NV": {
        "name": "Melanocytic Nevi",
        "description": "Common moles. Benign growths of melanocytes that appear as brown or black spots on the skin.",
        "severity": "benign",
        "recommendation": "Monitor for changes in size, shape, or color using the ABCDE rule."
    },
    "MEL": {
        "name": "Melanoma",
        "description": "The most serious type of skin cancer. Develops from pigment-producing cells (melanocytes).",
        "severity": "serious-cancer",
        "recommendation": "Seek immediate medical attention. Early detection is critical for successful treatment."
    },
    "BKL": {
        "name": "Benign Keratosis",
        "description": "Non-cancerous skin growths including seborrheic keratoses, solar lentigines, and lichen planus-like keratoses.",
        "severity": "benign",
        "recommendation": "Generally harmless. Monitor for any changes."
    },
    "BCC": {
        "name": "Basal Cell Carcinoma",
        "description": "The most common type of skin cancer. Usually appears as a pearly or waxy bump, or a flat flesh-colored lesion.",
        "severity": "cancer",
        "recommendation": "Seek medical attention. Early treatment is highly effective."
    },
    "AKIEC": {
        "name": "Actinic Keratoses / Intraepithelial Carcinoma",
        "description": "Pre-cancerous scaly patches caused by sun damage. Can develop into squamous cell carcinoma if untreated.",
        "severity": "pre-cancerous",
        "recommendation": "Consult a dermatologist for evaluation and treatment options."
    },
    "VASC": {
        "name": "Vascular Lesions",
        "description": "Lesions related to blood vessels, including cherry angiomas, angiokeratomas, and pyogenic granulomas.",
        "severity": "benign",
        "recommendation": "Usually benign. Consult if bleeding or changing."
    },
    "DF": {
        "name": "Dermatofibroma",
        "description": "A common benign skin growth that usually appears on the legs. Feels like a hard lump under the skin.",
        "severity": "benign",
        "recommendation": "Typically no treatment needed unless bothersome."
    }
}

# Image preprocessing transforms (EfficientNetB4 expects 224x224 input)
_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],  # ImageNet normalization
        std=[0.229, 0.224, 0.225]
    )
])


class SkinLesionClassifier:
    """Classifier for skin lesion images using EfficientNetB4"""
    
    _instance: Optional['SkinLesionClassifier'] = None
    _model: Optional[nn.Module] = None
    _device: Optional[torch.device] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._model is None:
            self._load_model()
    
    def _load_model(self):
        """Load the EfficientNetB4 model"""
        print(f"Loading classification model from {MODEL_PATH}")
        
        # Set device (prefer CUDA if available)
        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Using device: {self._device}")
        
        # Create EfficientNetB4 model using torchvision
        # Use weights=None to create model without pretrained weights
        self._model = models.efficientnet_b4(weights=None)
        
        # Modify the classifier head for our 7 classes
        # EfficientNetB4 has classifier[1] as the final Linear layer
        num_features = self._model.classifier[1].in_features
        self._model.classifier[1] = nn.Linear(num_features, len(CLASS_LABELS))
        
        # Load trained weights
        if MODEL_PATH.exists():
            checkpoint = torch.load(MODEL_PATH, map_location=self._device, weights_only=False)
            
            # Extract state_dict matching the test script pattern
            if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
                state_dict = checkpoint["model_state_dict"]
                print(f"Loaded checkpoint from epoch {checkpoint.get('epoch', 'unknown')}")
                if 'val_acc' in checkpoint:
                    print(f"Validation accuracy: {checkpoint['val_acc']:.4f}")
            else:
                # Fallback: assume it's the raw state dict
                state_dict = checkpoint
            
            self._model.load_state_dict(state_dict)
            print("Model weights loaded successfully")
        else:
            raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")
        
        # Set to evaluation mode
        self._model.to(self._device)
        self._model.eval()
    
    def preprocess_image(self, image_path: Path) -> torch.Tensor:
        """Preprocess an image for classification"""
        image = Image.open(image_path).convert("RGB")
        tensor = _transform(image)
        return tensor.unsqueeze(0)  # Add batch dimension
    
    def predict(self, image_path: Path) -> Dict:
        """
        Classify a skin lesion image
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Dictionary containing:
            - disease_type: Predicted class label
            - confidence: Confidence score for the prediction
            - predictions: Dict of all class probabilities
            - disease_info: Additional information about the predicted disease
        """
        # Preprocess the image
        input_tensor = self.preprocess_image(image_path)
        input_tensor = input_tensor.to(self._device)
        
        # Run inference (matching test script pattern)
        with torch.no_grad():
            outputs = self._model(input_tensor)
            probabilities = torch.softmax(outputs, dim=1)[0]
        
        # Get top prediction (matching test script: torch.max(probs, dim=0))
        confidence, pred_idx = torch.max(probabilities, dim=0)
        disease_type = CLASS_LABELS[pred_idx.item()]
        confidence = float(confidence.item())
        
        # Get all predictions
        probs_numpy = probabilities.cpu().numpy()
        predictions = {label: float(probs_numpy[i]) for i, label in enumerate(CLASS_LABELS)}
        
        return {
            "disease_type": disease_type,
            "confidence": confidence,
            "predictions": predictions,
            "disease_info": DISEASE_INFO[disease_type]
        }
    
    async def predict_async(self, image_path: Path) -> Dict:
        """Async wrapper for predict method to avoid blocking the event loop"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.predict, image_path)


# Singleton instance getter
@lru_cache(maxsize=1)
def get_classifier() -> SkinLesionClassifier:
    """Get the singleton classifier instance"""
    return SkinLesionClassifier()


def get_disease_info(disease_type: str) -> Dict:
    """Get information about a disease type"""
    return DISEASE_INFO.get(disease_type, {
        "name": "Unknown",
        "description": "Unknown condition",
        "severity": "unknown",
        "recommendation": "Consult a dermatologist for proper evaluation."
    })


async def generate_personalized_disease_info(
    disease_type: str,
    confidence: float,
    predictions: Dict[str, float],
    base_info: Dict
) -> Dict[str, str]:
    """
    Generate personalized recommendation and description using Gemini 2.5 Flash Lite
    based on the classification results.
    
    Args:
        disease_type: Predicted disease type
        confidence: Confidence score (0-1)
        predictions: Dictionary of all class probabilities
        base_info: Base disease information from DISEASE_INFO
        
    Returns:
        Dictionary with 'recommendation' and 'description' keys containing generated text
    """
    try:
        # Check if Gemini API key is configured
        api_key = (settings.GEMINI_API_KEY or "").strip()
        if not api_key:
            print("Gemini API key not configured, using base disease info")
            return {
                "recommendation": base_info.get("recommendation", "Consult a dermatologist for proper evaluation."),
                "description": base_info.get("description", "Unknown condition")
            }
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash-lite")
        
        # Format all predictions, separating high (>30%) and low (<=30%) confidence
        all_predictions = sorted(
            predictions.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        high_confidence = [(label, prob) for label, prob in all_predictions if prob > 0.30]
        low_confidence = [(label, prob) for label, prob in all_predictions if prob <= 0.30]
        
        high_conf_text = ", ".join([
            f"{label}: {prob*100:.1f}%" 
            for label, prob in high_confidence
        ]) if high_confidence else "None"
        
        # Create prompt for Gemini
        prompt = f"""You are a dermatology AI assistant. Generate concise analysis of skin lesion classification results.

Predictions:
- Significant (>30%): {high_conf_text}
- All other classes are below 30% and should NOT be detailed

Primary Prediction: {base_info.get('name', disease_type)} ({confidence*100:.1f}%)
Severity: {base_info.get('severity', 'unknown')}

CRITICAL INSTRUCTIONS:
- ONLY provide detailed descriptions for classes with probability >30%
- DO NOT list or detail any classes below 30%
- DO NOT mention "all 7 classes" or enumerate low-probability classes
- Focus ONLY on the significant findings (>30%)
- Keep response very concise (2-3 sentences total)

Generate TWO concise responses:

1. RECOMMENDATION: One brief sentence with actionable advice based on the primary prediction.

2. DESCRIPTION: 2-3 sentences describing ONLY the classes above 30%. Do not mention classes below 30% at all.

Format EXACTLY as:
RECOMMENDATION: [one sentence]
DESCRIPTION: [2-3 sentences, ONLY about classes >30%]"""

        # Run blocking Gemini API call in executor to avoid blocking the event loop
        def _call_gemini():
            """Synchronous Gemini API call"""
            return model.generate_content(
                prompt,
                generation_config={
                    "max_output_tokens": 200,  # Reduced for more concise responses
                    "temperature": 0.7,
                }
            )
        
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, _call_gemini)
        
        # Parse the response
        response_text = response.text.strip()
        
        # Extract recommendation and description
        recommendation = base_info.get("recommendation", "Consult a dermatologist for proper evaluation.")
        description = base_info.get("description", "Unknown condition")
        
        if "RECOMMENDATION:" in response_text:
            rec_part = response_text.split("RECOMMENDATION:")[1]
            if "DESCRIPTION:" in rec_part:
                recommendation = rec_part.split("DESCRIPTION:")[0].strip()
            else:
                recommendation = rec_part.strip()
        
        if "DESCRIPTION:" in response_text:
            desc_part = response_text.split("DESCRIPTION:")[1]
            description = desc_part.strip()
        
        print(f"Generated personalized info for {disease_type} (confidence: {confidence:.2%})")
        
        return {
            "recommendation": recommendation,
            "description": description
        }
        
    except Exception as e:
        print(f"Error generating personalized disease info with Gemini: {e}")
        # Fallback to base info if Gemini fails
        return {
            "recommendation": base_info.get("recommendation", "Consult a dermatologist for proper evaluation."),
            "description": base_info.get("description", "Unknown condition")
        }
