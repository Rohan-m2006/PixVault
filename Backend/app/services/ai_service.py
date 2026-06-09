# backend/app/services/ai_service.py
from transformers import pipeline
from PIL import Image
import io

print("Loading AI Model... (This will take a moment the first time)")
# Load a lightweight image classification AI model
image_classifier = pipeline("image-classification", model="google/vit-base-patch16-224")

def generate_tags_from_image(file_bytes: bytes) -> list:
    """Takes image bytes, shows them to the AI, and returns a list of text tags."""
    try:
        # 1. Convert the raw computer bytes into an Image format the AI can read
        image = Image.open(io.BytesIO(file_bytes))
        
        # 2. Ask the AI to classify the image
        results = image_classifier(image)
        
        # 3. The AI returns complex data with confidence scores. 
        # We just want to extract the top 3 labels as simple text.
        tags = [result['label'] for result in results[:3]]
        
        return tags
    except Exception as e:
        print(f"AI Tagging Error: {str(e)}")
        # If the AI fails, return a safe default so the upload doesn't crash
        return ["untagged"]