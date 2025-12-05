"""
Skin lesion classification service using EfficientNetB4
"""
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
from pathlib import Path
from typing import Dict, Tuple, Optional
import asyncio
from functools import lru_cache

# Model path - relative to backend directory
_BACKEND_DIR = Path(__file__).parent.parent.parent
MODEL_PATH = _BACKEND_DIR / "CNN models" / "efficientnetb4_classifier.pth"

# Class labels for the 7 skin lesion types
CLASS_LABELS = ["AKIEC", "BCC", "BKL", "DF", "MEL", "NV", "VASC"]

# Disease information mapping
DISEASE_INFO = {
    "AKIEC": {
        "name": "Actinic Keratoses / Intraepithelial Carcinoma",
        "description": "Pre-cancerous scaly patches caused by sun damage. Can develop into squamous cell carcinoma if untreated.",
        "severity": "pre-cancerous",
        "recommendation": "Consult a dermatologist for evaluation and treatment options."
    },
    "BCC": {
        "name": "Basal Cell Carcinoma",
        "description": "The most common type of skin cancer. Usually appears as a pearly or waxy bump, or a flat flesh-colored lesion.",
        "severity": "cancer",
        "recommendation": "Seek medical attention. Early treatment is highly effective."
    },
    "BKL": {
        "name": "Benign Keratosis",
        "description": "Non-cancerous skin growths including seborrheic keratoses, solar lentigines, and lichen planus-like keratoses.",
        "severity": "benign",
        "recommendation": "Generally harmless. Monitor for any changes."
    },
    "DF": {
        "name": "Dermatofibroma",
        "description": "A common benign skin growth that usually appears on the legs. Feels like a hard lump under the skin.",
        "severity": "benign",
        "recommendation": "Typically no treatment needed unless bothersome."
    },
    "MEL": {
        "name": "Melanoma",
        "description": "The most serious type of skin cancer. Develops from pigment-producing cells (melanocytes).",
        "severity": "serious-cancer",
        "recommendation": "Seek immediate medical attention. Early detection is critical for successful treatment."
    },
    "NV": {
        "name": "Melanocytic Nevi",
        "description": "Common moles. Benign growths of melanocytes that appear as brown or black spots on the skin.",
        "severity": "benign",
        "recommendation": "Monitor for changes in size, shape, or color using the ABCDE rule."
    },
    "VASC": {
        "name": "Vascular Lesions",
        "description": "Lesions related to blood vessels, including cherry angiomas, angiokeratomas, and pyogenic granulomas.",
        "severity": "benign",
        "recommendation": "Usually benign. Consult if bleeding or changing."
    }
}

# Image preprocessing transforms (EfficientNetB4 expects 380x380 input)
_transform = transforms.Compose([
    transforms.Resize((380, 380)),
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
            
            # Handle different checkpoint formats
            if isinstance(checkpoint, dict):
                if 'model_state_dict' in checkpoint:
                    # Training checkpoint format with metadata
                    state_dict = checkpoint['model_state_dict']
                    print(f"Loaded checkpoint from epoch {checkpoint.get('epoch', 'unknown')}")
                    if 'val_acc' in checkpoint:
                        print(f"Validation accuracy: {checkpoint['val_acc']:.4f}")
                elif 'state_dict' in checkpoint:
                    # Alternative checkpoint format
                    state_dict = checkpoint['state_dict']
                else:
                    # Assume it's the raw state dict
                    state_dict = checkpoint
            else:
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
        
        # Run inference
        with torch.no_grad():
            outputs = self._model(input_tensor)
            probabilities = torch.softmax(outputs, dim=1)[0]
        
        # Get predictions
        probs_numpy = probabilities.cpu().numpy()
        predictions = {label: float(probs_numpy[i]) for i, label in enumerate(CLASS_LABELS)}
        
        # Get top prediction
        top_idx = probabilities.argmax().item()
        disease_type = CLASS_LABELS[top_idx]
        confidence = float(probabilities[top_idx])
        
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
