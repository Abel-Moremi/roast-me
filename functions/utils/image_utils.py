"""Image processing utilities."""

import base64
from io import BytesIO
from PIL import Image
import logging

logger = logging.getLogger(__name__)


def parse_image_from_request(request):
    """
    Parse image from Flask request (either base64 JSON or multipart upload).
    
    Args:
        request: Flask request object
        
    Returns:
        PIL.Image or None if no image found
    """
    image = None
    request_json = request.get_json(silent=True)

    # Try base64 JSON format
    if request_json and "image" in request_json:
        logger.info("Image received as base64")
        image_base64 = request_json["image"]
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        image_bytes = base64.b64decode(image_base64)
        image = Image.open(BytesIO(image_bytes))

    # Try multipart upload
    elif "image" in request.files:
        logger.info("Image received as multipart upload")
        image = Image.open(request.files["image"].stream)

    return image


def resize_image(image, max_dimension=1024):
    """
    Resize image to maximum dimension while maintaining aspect ratio.
    
    Args:
        image: PIL.Image object
        max_dimension: Maximum width or height
        
    Returns:
        PIL.Image resized image
    """
    if image.width > max_dimension or image.height > max_dimension:
        ratio = min(max_dimension / image.width, max_dimension / image.height)
        new_size = (int(image.width * ratio), int(image.height * ratio))
        logger.info(f"Resizing image from {image.size} to {new_size}")
        return image.resize(new_size, Image.Resampling.LANCZOS)
    return image


def image_to_bytes(image, format="PNG"):
    """
    Convert PIL Image to bytes.
    
    Args:
        image: PIL.Image object
        format: Image format (e.g., "PNG", "JPEG")
        
    Returns:
        bytes: Image data
    """
    buffer = BytesIO()
    image.save(buffer, format=format)
    return buffer.getvalue()
