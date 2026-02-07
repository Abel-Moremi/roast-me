"""
Animation Prompt Templates
Manages prompt generation for Gemini animation script creation.
"""

from .animation_constants import AVAILABLE_ANIMATIONS, AVAILABLE_EXPRESSIONS


def format_available_animations():
    """
    Format available animations for prompt inclusion.
    
    Returns:
        str: Formatted animation options
    """
    return "\n".join([
        f"- {key}: {config['description']}"
        for key, config in AVAILABLE_ANIMATIONS.items()
    ])


def format_available_expressions():
    """
    Format available expressions for prompt inclusion.
    
    Returns:
        str: Formatted expression options
    """
    return "\n".join([
        f"- {key}: {config['description']}"
        for key, config in AVAILABLE_EXPRESSIONS.items()
    ])


def build_animation_generation_prompt(transcript, duration):
    """
    Build the full prompt for animation script generation.
    
    Args:
        transcript (str): The narration/speech text
        duration (float): Duration of audio in seconds
        
    Returns:
        str: Complete prompt for Gemini
    """
    animations_str = format_available_animations()
    expressions_str = format_available_expressions()
    
    prompt = f"""You are an expert animation director for 3D character comedy performance.
Analyze the following transcript and generate a detailed animation script that brings the performance to life.

TRANSCRIPT DURATION: {duration} seconds
TRANSCRIPT TEXT:
{transcript}

AVAILABLE BODY ANIMATIONS:
{animations_str}

AVAILABLE FACIAL EXPRESSIONS:
{expressions_str}

YOUR TASK:
Generate a JSON animation script with precise timing and movement choices that:
1. Synchronize with the speech rhythm and emotional beats
2. Emphasize punchlines with appropriate animations and expressions
3. Build energy throughout the performance
4. Use varied animations to maintain visual interest
5. Match expression intensity to the delivery tone

RESPONSE FORMAT:
Return ONLY valid JSON (no markdown, no extra text). Structure:
{{
  "metadata": {{
    "duration": <total_duration_in_seconds>,
    "transcript": "<first 100 chars of transcript>...",
    "intensity": "<low|medium|high>",
    "style": "<comedic style assessment>",
    "notes": "<brief analysis>"
  }},
  "timeline": [
    {{
      "startTime": <seconds>,
      "endTime": <seconds>,
      "animation": "<animation_name>",
      "expression": "<expression_name>",
      "intensity": <0.0-1.0>,
      "notes": "<what's happening here>"
    }}
  ]
}}

REQUIREMENTS:
- Timeline must span 0 to {duration} seconds
- Minimum 3 keyframes, maximum 10
- All animation names must be from the AVAILABLE list
- All expression names must be from the AVAILABLE list
- Intensity values between 0.0 and 1.0
- Smooth transitions between keyframes
- Include at least 3 different animations
- Vary expressions to match emotional content"""
    
    return prompt
