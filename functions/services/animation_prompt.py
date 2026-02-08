"""
Animation Prompt Templates
Manages prompt generation for Gemini animation script creation.
Incorporates state machine rules: posture system, sequence validation, sit lock.

This module provides modular prompt construction with clear separation of concerns:
- Animation metadata formatting
- Expression formatting  
- Rule/constraint formatting
- Full prompt assembly
"""

from typing import Dict, List, Tuple
from .animation_constants import (
    AVAILABLE_ANIMATIONS, AVAILABLE_EXPRESSIONS, Posture, AnimationConfig
)


# ============================================
# ANIMATION REFERENCE BUILDING
# ============================================

def format_available_animations() -> str:
    """
    Format available animations with their state machine properties.
    
    Includes: name, description, duration, looping type, posture requirements,
    and sequence information for state machine compliance.
    
    Returns:
        str: Formatted animation options with metadata
    """
    lines = []
    for key, config in AVAILABLE_ANIMATIONS.items():
        duration = config.get('duration', 0)
        posture = config.get('required_posture', 'unknown')
        loops = "LOOPING" if config.get('is_looping') else "ONE-TIME"
        
        line = f"- {key}: {config['description']} ({duration}s, {loops}, {posture})"
        
        # Add sequence info
        if config.get('next_in_sequence'):
            line += f" → leads to {config['next_in_sequence']}"
        if config.get('previous_in_sequence'):
            line += f" (follows {config['previous_in_sequence']})"
        if config.get('changes_posture_after'):
            line += f" [CHANGES POSTURE TO {config['changes_posture_after']}]"
        
        lines.append(line)
    
    return "\n".join(lines)


def format_available_expressions() -> str:
    """
    Format available expressions for prompt inclusion.
    
    Returns:
        str: Formatted expression options with intensity levels
    """
    return "\n".join([
        f"- {key}: {config['description']} (intensity: {config.get('intensity', 0.5)})"
        for key, config in AVAILABLE_EXPRESSIONS.items()
    ])


def get_animation_names_list() -> str:
    """
    Get comma-separated list of valid animation names.
    
    Returns:
        str: Comma-separated animation names
    """
    return ", ".join(AVAILABLE_ANIMATIONS.keys())


# ============================================
# RULE & CONSTRAINT SECTIONS
# ============================================

def format_valid_animations_section() -> str:
    """
    Format the CRITICAL section for valid animation names.
    
    Includes exact valid names, invalid examples, and format requirements.
    This section prevents common Gemini hallucinations.
    
    Returns:
        str: Formatted valid animations section
    """
    valid_names = list(AVAILABLE_ANIMATIONS.keys())
    valid_str = ", ".join(valid_names)
    
    return f"""=== CRITICAL: VALID ANIMATION NAMES ONLY ===
Use ONLY these exact animation names (case-sensitive):
{', '.join([f"- {name}" for name in valid_names])}

❌ INVALID EXAMPLES: sitTalk, walkRelaxed, walk, run, dance, sit
✓ VALID EXAMPLES: spellcast, walk-think, aerobic-dance, walk-relaxed-start, relax"""


def format_posture_system_section() -> str:
    """
    Format the posture system rules for state machine compliance.
    
    Returns:
        str: Formatted posture system rules
    """
    return """=== POSTURE SYSTEM (CRITICAL) ===
- Character starts in STANDING posture
- Character can transition to SITTING via "stand-to-sit" animation
- Once "stand-to-sit" completes, character is LOCKED IN SITTING
- While locked sitting: ONLY "idle" animations allowed
- Do NOT place standing animations when sitting (spellcast, walk, dance, etc.)"""


def format_walk_sequence_section() -> str:
    """
    Format the walk sequence validation rules.
    
    Returns:
        str: Formatted walk sequence rules
    """
    return """=== WALK SEQUENCE VALIDATION (CRITICAL) ===
- "walk-relaxed-start" MUST play first (3.53s)
- "walk-relaxed-loop" can ONLY follow walk-relaxed-start
- "walk-relaxed-loop" plays indefinitely until walk-relaxed-end requested
- "walk-relaxed-end" MUST play before returning to "idle"
- INVALID: walking → idle directly (MUST use walk-relaxed-end first)
- VALID: walk-start → walk-loop → walk-end → idle"""


def format_auto_transitions_section() -> str:
    """
    Format the auto-transition rules.
    
    Returns:
        str: Formatted auto-transition rules
    """
    return """=== AUTO-TRANSITIONS ===
- After "walk-relaxed-start" reaches its end, auto-queue "walk-relaxed-loop"
- After non-looping animations, return to "idle"
- Character auto-transitions between animations for smooth flow"""


def format_constraints_section(duration: float) -> str:
    """
    Format the script constraints (duration, length, etc).
    
    Args:
        duration: Audio duration in seconds
        
    Returns:
        str: Formatted constraints section
    """
    return f"""=== SCRIPT CONSTRAINTS ===
Duration: {duration} seconds
Minimum keyframes: 3
Maximum keyframes: {AnimationConfig.MAX_KEYFRAMES}
Valid intensity: 0.0 - 1.0
Timeline must span 0 to {duration} seconds exactly"""


def format_generation_requirements() -> str:
    """
    Format the generation requirements checklist.
    
    Returns:
        str: Formatted requirements
    """
    return """=== GENERATION REQUIREMENTS ===
✓ Timeline spans 0 to {{ duration }} seconds exactly
✓ Minimum 3 keyframes, maximum 10
✓ All animation names MUST be from exact list (no variations, no typos)
✓ All expression names from AVAILABLE list
✓ Intensity 0.0-1.0 range
✓ NO POSTURE VIOLATIONS (standing anims only when standing)
✓ NO WALK SEQUENCE VIOLATIONS (follow walk-start→loop→end pattern)
✓ Smooth transitions between keyframes
✓ At least 3 different animations
✓ Expressions match emotional content and animation energy
✓ If using any walk sequences, include complete walk-start → walk-loop → walk-end chain
✓ NEVER use invalid names like: sitTalk, walkRelaxed, run, dance, sit, walk (alone)"""


def format_strategy_section() -> str:
    """
    Format strategy tips for animation sequencing.
    
    Returns:
        str: Formatted strategy tips
    """
    return """=== ANIMATION STRATEGY TIPS ===
- Start with idle (neutral, safe foundation)
- Build energy toward punchlines with high-intensity animations
- Use walk-think for contemplative/transitional moments
- Use walk-relaxed-start→loop→end for exiting movements
- Use spellcast for emphasis and dramatic gestures
- Use aerobic-dance for peak energy moments
- Use relax for calming/closing moments
- Vary expressions to enhance comedic timing
- Match animation intensity to speech emphasis
- End with calm animation (relax or idle)"""


def format_common_mistakes_section() -> str:
    """
    Format common mistakes to avoid (anti-patterns).
    
    Returns:
        str: Formatted common mistakes
    """
    return """=== COMMON MISTAKES TO AVOID ===
❌ "sitTalk" - doesn't exist (use "idle" or standing animations)
❌ "walkRelaxed" - doesn't exist (use "walk-relaxed-start")
❌ "walk" alone - incomplete (must use walk-think or walk-relaxed-*)
❌ Standing animations after "stand-to-sit"
❌ walk-loop without walk-start first
❌ idle from walk-loop without walk-end
✓ Use exact names with hyphens: walk-relaxed-start, aerobic-dance, walk-think"""


# ============================================
# FULL PROMPT CONSTRUCTION
# ============================================

def build_animation_generation_prompt(transcript: str, duration: float) -> str:
    """
    Build the full prompt for animation script generation with state machine awareness.
    
    Ensures generated scripts respect:
    - Posture system (Standing/Sitting)
    - Walk sequence validation (start → loop → end)
    - Sit lock mechanism
    - Auto-transitions
    
    Prompt is structured with clear sections for maximum Gemini compliance:
    1. Valid animation names (prevents hallucinations)
    2. Posture system rules
    3. Walk sequence rules
    4. Animation/Expression references
    5. Constraints and requirements
    6. Strategy tips
    7. Response format
    
    Args:
        transcript (str): The narration/speech text
        duration (float): Duration of audio in seconds
        
    Returns:
        str: Complete prompt for Gemini
    """
    # Build prompt from modular sections
    animations_str = format_available_animations()
    expressions_str = format_available_expressions()
    valid_anims_section = format_valid_animations_section()
    posture_section = format_posture_system_section()
    walk_section = format_walk_sequence_section()
    transitions_section = format_auto_transitions_section()
    constraints_section = format_constraints_section(duration)
    requirements_section = format_generation_requirements()
    strategy_section = format_strategy_section()
    mistakes_section = format_common_mistakes_section()
    
    # Construct full prompt
    prompt = f"""You are an expert 3D animation director for comedy performance.
Generate a detailed animation script that respects a FINITE STATE MACHINE with specific rules.

{valid_anims_section}

=== STATE MACHINE RULES (CRITICAL - MUST FOLLOW) ===
{posture_section}

{walk_section}

{transitions_section}

=== AVAILABLE ANIMATIONS ===
{animations_str}

=== AVAILABLE EXPRESSIONS ===
{expressions_str}

{constraints_section}
Transcript: "{transcript[:150]}{'...' if len(transcript) > 150 else ''}"

=== RESPONSE FORMAT ===
Return ONLY valid JSON (no markdown, explanations, or extra text):

{{
  "metadata": {{
    "duration": {duration},
    "transcript": "<first 80 chars>...",
    "intensity": "<low|medium|high>",
    "style": "<comedic style>",
    "notes": "<brief analysis>"
  }},
  "timeline": [
    {{
      "startTime": <seconds>,
      "endTime": <seconds>,
      "animation": "<animation_name>",
      "expression": "<expression_name>",
      "intensity": <0.0-1.0>,
      "notes": "<optional>"
    }}
  ]
}}

{requirements_section}

{strategy_section}

{mistakes_section}"""
    
    return prompt
