"""Text-to-speech service using Gemini TTS."""

import base64
import logging
import os
import subprocess
import sys

# Ensure parent directory is in path for config import
if __name__ != "__main__":
    parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)

from google.genai import types
import config

logger = logging.getLogger(__name__)


def generate_tts_audio(client, text):
    """
    Generate TTS audio from text using Gemini.
    
    Args:
        client: Gemini client instance
        text: Text to convert to speech
        
    Returns:
        str or None: Base64-encoded audio data, or None if generation fails
    """
    try:
        logger.info("Generating TTS audio")

        # Create TTS prompt optimized for natural delivery
        tts_prompt = (
            f"You're a stand-up comedian performing this roast live on stage. "
            f"Speak naturally like you're having fun with someone in the crowd - "
            f"confident, loose, playful energy. Let your voice smile. "
            f"Honor every ellipsis (...) with a real pause for comic timing. "
            f"Lean into the punchlines with emphasis but keep it smooth and conversational. "
            f"Sound like you're genuinely enjoying this, not reading a script. "
            f"Vary your pace and rhythm naturally - speed up for energy, slow down for effect. "
            f"\n\nPerform this: {text}"
        )

        response = client.models.generate_content(
            model=config.TTS_MODEL,
            contents=tts_prompt,
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name=config.TTS_VOICE
                        )
                    )
                )
            ),
        )

        # Extract audio from response
        audio_base64 = _extract_audio_from_response(response)
        
        if audio_base64:
            logger.info(f"TTS audio generated successfully, size: {len(audio_base64)} bytes")
            
            # Save test files if enabled
            if config.ENABLE_AUDIO_TEST:
                _save_test_audio_files(audio_base64)
        else:
            logger.warning("TTS returned no audio data")
            
        return audio_base64

    except Exception as e:
        logger.exception(f"TTS generation failed: {e}")
        return None


def _extract_audio_from_response(response):
    """
    Extract base64 audio data from Gemini TTS response.
    
    Args:
        response: Gemini API response
        
    Returns:
        str or None: Base64-encoded audio data
    """
    if not response.candidates:
        return None
        
    for candidate in response.candidates:
        if not (candidate.content and candidate.content.parts):
            continue
            
        for part in candidate.content.parts:
            if hasattr(part, "inline_data") and part.inline_data:
                return base64.b64encode(part.inline_data.data).decode("utf-8")
    
    return None


def _save_test_audio_files(audio_base64):
    """
    Save test audio files for local development/testing.
    
    Args:
        audio_base64: Base64-encoded audio data
    """
    try:
        # Get the functions directory (parent of services)
        services_dir = os.path.dirname(os.path.abspath(__file__))
        functions_dir = os.path.dirname(services_dir)
        temp_dir = os.path.join(functions_dir, "temp")
        base64_file = os.path.join(temp_dir, "audio_base64.txt")
        wav_file = os.path.join(temp_dir, "roast_audio.wav")
        
        # Create temp directory if it doesn't exist
        os.makedirs(temp_dir, exist_ok=True)
        
        # Save base64
        with open(base64_file, "w") as f:
            f.write(audio_base64)
        logger.info(f"Base64 audio saved to {base64_file}")
        
        # Decode to WAV using Python script
        decode_script = os.path.join(functions_dir, "utils", "decode_audio.py")
        
        if os.path.exists(decode_script):
            result = subprocess.run(
                ["python", decode_script, base64_file, wav_file],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                logger.info(f"WAV file created at {wav_file}")
            else:
                logger.warning(f"Failed to create WAV file: {result.stderr}")
        else:
            logger.warning(f"Decode script not found at {decode_script}")
            
    except Exception as e:
        logger.warning(f"Failed to save/decode audio file: {e}")


def get_audio_mime_type():
    """Get the MIME type for audio output."""
    return config.TTS_AUDIO_MIME_TYPE
