import functions_framework
from flask import jsonify
from google import genai
from google.genai import types
import os
import base64
from io import BytesIO
from PIL import Image
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Gemini API
api_key = os.environ.get('GEMINI_API_KEY')
if not api_key:
    logger.warning("GEMINI_API_KEY not set!")

# Initialize client
client = genai.Client(api_key=api_key)


@functions_framework.http
def roast_image(request):
    """HTTP Cloud Function to roast images using Gemini.
    Args:
        request (flask.Request): The request object.
    Returns:
        JSON response with the roast.
    """
    # Enable CORS
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    headers = {
        'Access-Control-Allow-Origin': '*'
    }

    try:
        logger.info("Received request")
        
        # Check API key
        if not os.environ.get('GEMINI_API_KEY'):
            return jsonify({
                'error': 'GEMINI_API_KEY not configured'
            }), 500, headers
        
        # Get the image from request
        image_data = None
        
        # Check if image is in JSON as base64
        request_json = request.get_json(silent=True)
        if request_json and 'image' in request_json:
            logger.info("Processing base64 image")
            # Decode base64 image
            image_base64 = request_json['image']
            # Remove data URL prefix if present
            if ',' in image_base64:
                image_base64 = image_base64.split(',')[1]
            image_bytes = base64.b64decode(image_base64)
            image_data = Image.open(BytesIO(image_bytes))
        
        # Check if image is uploaded as multipart/form-data
        elif 'image' in request.files:
            logger.info("Processing uploaded file")
            file = request.files['image']
            image_data = Image.open(file.stream)
        
        if not image_data:
            return jsonify({
                'error': 'No image provided. Send as base64 in JSON or as multipart/form-data'
            }), 400, headers

        # Resize image if too large (for faster processing)
        logger.info(f"Image size: {image_data.width}x{image_data.height}")
        max_dimension = 1024
        if image_data.width > max_dimension or image_data.height > max_dimension:
            ratio = min(max_dimension / image_data.width, max_dimension / image_data.height)
            new_size = (int(image_data.width * ratio), int(image_data.height * ratio))
            image_data = image_data.resize(new_size, Image.Resampling.LANCZOS)
            logger.info(f"Resized to: {new_size}")

        # Create the roast prompt
        prompt = """You are a hilarious roast comedian. Look at this image and roast it mercilessly. 
        Be creative, funny, and savage but keep it lighthearted and not genuinely mean-spirited. 
        Focus on funny observations about what you see. Keep the roast to 2-3 sentences."""
        
        # Convert PIL Image to bytes
        img_byte_arr = BytesIO()
        image_data.save(img_byte_arr, format='PNG')
        img_byte_arr = img_byte_arr.getvalue()
        
        # Generate roast with new API
        logger.info("Calling Gemini API")
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                prompt,
                types.Part.from_bytes(data=img_byte_arr, mime_type='image/png')
            ],
            config=types.GenerateContentConfig(
                temperature=0.9,
                max_output_tokens=200,
            )
        )
        logger.info("Received response from Gemini")
        roast = response.text
        
        logger.info(f"Returning roast: {roast[:50]}...")
        return jsonify({
            'roast': roast,
            'success': True
        }), 200, headers
        
    except Exception as e:
        logger.error(f"Error: {str(e)}", exc_info=True)
        return jsonify({
            'error': str(e),
            'success': False
        }), 500, headers
