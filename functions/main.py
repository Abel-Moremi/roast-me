import functions_framework
from flask import jsonify
from google import genai
from google.genai import types
import os
import base64
from io import BytesIO
from PIL import Image
import logging

# -----------------------
# Logging
# -----------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# -----------------------
# Gemini setup
# -----------------------
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    logger.warning("GEMINI_API_KEY not set")

client = genai.Client(api_key=api_key)

# -----------------------
# CORS headers
# -----------------------
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
}

# -----------------------
# Roast output schema
# -----------------------
ROAST_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={
        "overall_vibe": types.Schema(
            type=types.Type.STRING,
            description="Overall impression or vibe of the person/image"
        ),
        "roast_lines": types.Schema(
            type=types.Type.ARRAY,
            items=types.Schema(type=types.Type.STRING),
            description="Individual roast jokes or observations"
        ),
        "confidence_rating": types.Schema(
            type=types.Type.INTEGER,
            description="Perceived confidence level from 0 to 10"
        ),
        "style_tags": types.Schema(
            type=types.Type.ARRAY,
            items=types.Schema(type=types.Type.STRING),
            description="Tone/style tags such as 'awkward', 'bold', 'chaotic'"
        ),
        "one_liner": types.Schema(
            type=types.Type.STRING,
            description="Best single-line roast"
        ),
    },
    required=[
        "overall_vibe",
        "roast_lines",
        "confidence_rating",
        "style_tags",
        "one_liner",
    ],
)

# -----------------------
# Cloud Function
# -----------------------
@functions_framework.http
def roast_image(request):
    if request.method == "OPTIONS":
        return ("", 204, CORS_HEADERS)

    try:
        logger.info("Roast request received")

        if not api_key:
            return jsonify({"error": "GEMINI_API_KEY not configured"}), 500, CORS_HEADERS

        # -----------------------
        # Parse image
        # -----------------------
        image = None
        request_json = request.get_json(silent=True)

        if request_json and "image" in request_json:
            logger.info("Image received as base64")
            image_base64 = request_json["image"]
            if "," in image_base64:
                image_base64 = image_base64.split(",")[1]
            image_bytes = base64.b64decode(image_base64)
            image = Image.open(BytesIO(image_bytes))

        elif "image" in request.files:
            logger.info("Image received as multipart upload")
            image = Image.open(request.files["image"].stream)

        if image is None:
            return jsonify(
                {"error": "No image provided (base64 JSON or multipart expected)"}
            ), 400, CORS_HEADERS

        # -----------------------
        # Resize for performance
        # -----------------------
        max_dim = 1024
        if image.width > max_dim or image.height > max_dim:
            ratio = min(max_dim / image.width, max_dim / image.height)
            image = image.resize(
                (int(image.width * ratio), int(image.height * ratio)),
                Image.Resampling.LANCZOS,
            )

        # -----------------------
        # Convert image to bytes
        # -----------------------
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        img_bytes = buffer.getvalue()

        # -----------------------
        # Prompt (schema-enforced)
        # -----------------------
        prompt = """
You are a high-energy stand-up comedian doing a playful roast.

Analyze the image and produce a structured roast.

RULES:
- Output must strictly follow the provided JSON schema
- No extra text, no markdown, no explanations
- Be funny, observational, and animated
- Keep it playful and lighthearted, not hateful
"""

        # -----------------------
        # Gemini call
        # -----------------------
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                prompt,
                types.Part.from_bytes(data=img_bytes, mime_type="image/png"),
            ],
            config=types.GenerateContentConfig(
                temperature=0.8,
                max_output_tokens=800,
                response_schema=ROAST_SCHEMA,
                response_mime_type="application/json",
            ),
        )

        if not response.candidates:
            return jsonify(
                {"error": "Response blocked by safety filters"}
            ), 400, CORS_HEADERS

        # -----------------------
        # Structured output
        # -----------------------
        roast_data = response.parsed

        return jsonify(
            {
                "success": True,
                "data": roast_data,
            }
        ), 200, CORS_HEADERS

    except Exception as e:
        logger.exception("Roast failed")
        return jsonify(
            {
                "success": False,
                "error": str(e),
            }
        ), 500, CORS_HEADERS