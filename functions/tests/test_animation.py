"""
Tests for the animation pipeline (no Gemini or API key needed).

Run from functions/:
    python -m unittest discover -s tests -v
"""

import pathlib
import re
import sys
import unittest

FUNCTIONS_DIR = pathlib.Path(__file__).resolve().parents[1]
REPO_ROOT = FUNCTIONS_DIR.parent
sys.path.insert(0, str(FUNCTIONS_DIR))

from services.animation_constants import AVAILABLE_ANIMATIONS, AVAILABLE_EXPRESSIONS  # noqa: E402
from services.animation_utils import (  # noqa: E402
    clamp_intensity,
    fix_invalid_animation_name,
    generate_default_animation_script,
    sanitize_animation_script,
)
from services.animation_validator import validate_animation_script  # noqa: E402


def frame(start, end, animation, expression="neutral", intensity=0.5):
    return {
        "startTime": start,
        "endTime": end,
        "animation": animation,
        "expression": expression,
        "intensity": intensity,
    }


def script(timeline):
    duration = timeline[-1]["endTime"]
    return {"metadata": {"duration": duration, "intensity": "medium"}, "timeline": timeline}, duration


class DefaultScriptTests(unittest.TestCase):
    def test_fallback_script_is_valid_for_many_lengths(self):
        for duration in (3, 10, 30, 60, 90, 120):
            with self.subTest(duration=duration):
                s = generate_default_animation_script(duration, "some words")
                ok, errors, _ = validate_animation_script(s, duration)
                self.assertTrue(ok, errors)
                self.assertAlmostEqual(s["timeline"][-1]["endTime"], duration, places=2)


class ValidatorRuleTests(unittest.TestCase):
    def test_idle_after_sitting_is_allowed(self):
        s, d = script([frame(0, 5, "stand-to-sit"), frame(5, 10, "idle")])
        ok, errors, _ = validate_animation_script(s, d)
        self.assertTrue(ok, errors)

    def test_anything_but_idle_after_sitting_is_rejected(self):
        s, d = script([frame(0, 5, "stand-to-sit"), frame(5, 10, "spellcast")])
        ok, errors, _ = validate_animation_script(s, d)
        self.assertFalse(ok)

    def test_full_walk_sequence_is_allowed(self):
        s, d = script([
            frame(0, 3, "walk-relaxed-start"),
            frame(3, 8, "walk-relaxed-loop"),
            frame(8, 11, "walk-relaxed-end"),
            frame(11, 15, "idle"),
        ])
        ok, errors, _ = validate_animation_script(s, d)
        self.assertTrue(ok, errors)

    def test_walk_loop_without_start_is_rejected(self):
        s, d = script([frame(0, 5, "idle"), frame(5, 10, "walk-relaxed-loop")])
        ok, _, _ = validate_animation_script(s, d)
        self.assertFalse(ok)

    def test_walk_end_without_loop_is_rejected(self):
        s, d = script([frame(0, 3, "walk-relaxed-start"), frame(3, 6, "walk-relaxed-end")])
        ok, _, _ = validate_animation_script(s, d)
        self.assertFalse(ok)

    def test_end_before_start_is_rejected(self):
        s, d = script([frame(0, 5, "idle"), frame(5, 4, "relax")])
        ok, _, _ = validate_animation_script(s, d)
        self.assertFalse(ok)

    def test_empty_timeline_is_rejected(self):
        ok, _, _ = validate_animation_script({"metadata": {}, "timeline": []}, 10)
        self.assertFalse(ok)


class SanitizeTests(unittest.TestCase):
    def test_camel_case_names_are_fixed(self):
        self.assertEqual(fix_invalid_animation_name("walkRelaxedStart"), "walk-relaxed-start")
        self.assertEqual(fix_invalid_animation_name("aerobicDance"), "aerobic-dance")

    def test_unknown_names_become_idle(self):
        self.assertEqual(fix_invalid_animation_name("moonwalk"), "idle")
        self.assertEqual(fix_invalid_animation_name(None), "idle")

    def test_valid_names_are_unchanged(self):
        for name in AVAILABLE_ANIMATIONS:
            self.assertEqual(fix_invalid_animation_name(name), name)

    def test_intensity_is_clamped(self):
        self.assertEqual(clamp_intensity(2), 1.0)
        self.assertEqual(clamp_intensity(-1), 0.0)
        self.assertEqual(clamp_intensity(0.3), 0.3)

    def test_sanitize_then_validate(self):
        raw = {
            "metadata": {"duration": 10},
            "timeline": [
                frame(0, 5, "spellCast", "smiling", 5),
                frame(5, 10, "relax", "laugh", 0.5),
            ],
        }
        clean = sanitize_animation_script(raw)
        self.assertIsNotNone(clean)
        for f in clean["timeline"]:
            self.assertIn(f["animation"], AVAILABLE_ANIMATIONS)
            self.assertIn(f["expression"], AVAILABLE_EXPRESSIONS)
            self.assertLessEqual(f["intensity"], 1.0)
        ok, errors, _ = validate_animation_script(clean, 10)
        self.assertTrue(ok, errors)


class FrontendAgreementTests(unittest.TestCase):
    """Names must match the frontend, or the character silently ignores them."""

    def test_every_backend_animation_has_a_frontend_state(self):
        js = (REPO_ROOT / "composables/animation/animationConstants.js").read_text(encoding="utf-8")
        states = dict(re.findall(r"^\s{2}(\w+): \{ clipName: '([^']+)'", js, re.MULTILINE))
        self.assertTrue(states, "Could not parse ANIMATION_STATES")

        for name in AVAILABLE_ANIMATIONS:
            # Same conversion as useAnimationAudioSync.js
            key = re.sub(r"-([a-z])", lambda m: m.group(1).upper(), name)
            with self.subTest(animation=name):
                self.assertIn(key, states, f"No ANIMATION_STATES.{key} in the frontend")
                self.assertEqual(states[key], name, f"ANIMATION_STATES.{key} plays a different clip")

    def test_every_backend_expression_exists_in_the_scene(self):
        vue = (REPO_ROOT / "components/ComedyClubScene.vue").read_text(encoding="utf-8")
        block = re.search(r"const EXPRESSIONS = \{(.*?)\}", vue, re.DOTALL)
        self.assertIsNotNone(block, "Could not find EXPRESSIONS in ComedyClubScene.vue")
        frontend = set(re.findall(r"'([a-z]+)'", block.group(1)))

        for name in AVAILABLE_EXPRESSIONS:
            with self.subTest(expression=name):
                self.assertIn(name, frontend)


if __name__ == "__main__":
    unittest.main()
