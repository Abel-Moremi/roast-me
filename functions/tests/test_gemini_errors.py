"""Tests for utils/gemini_errors.py. Run: python -m unittest discover -s tests"""

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from utils.gemini_errors import QuotaExceededError, as_quota_error, is_quota_error, quota_period  # noqa: E402


class FakeAPIError(Exception):
    """Shaped like google.genai.errors.ClientError."""

    def __init__(self, code, status, details=None):
        self.code = code
        self.status = status
        self.details = details or {}
        super().__init__(f"{code} {status}. {self.details}")


DAILY = FakeAPIError(429, "RESOURCE_EXHAUSTED", {
    "error": {"details": [{"violations": [{"quotaId": "GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}]}
})
PER_MINUTE = FakeAPIError(429, "RESOURCE_EXHAUSTED", {
    "error": {"details": [{"violations": [{"quotaId": "GenerateRequestsPerMinutePerProjectPerModel"}]}]}
})


class QuotaDetectionTests(unittest.TestCase):
    def test_429_is_quota(self):
        self.assertTrue(is_quota_error(DAILY))
        self.assertTrue(is_quota_error(FakeAPIError(429, None)))

    def test_status_alone_is_quota(self):
        self.assertTrue(is_quota_error(FakeAPIError(None, "RESOURCE_EXHAUSTED")))

    def test_other_errors_are_not_quota(self):
        self.assertFalse(is_quota_error(FakeAPIError(400, "INVALID_ARGUMENT")))
        self.assertFalse(is_quota_error(FakeAPIError(500, "INTERNAL")))
        self.assertFalse(is_quota_error(ValueError("bad image")))

    def test_period_from_quota_id(self):
        self.assertEqual(quota_period(DAILY), "day")
        self.assertEqual(quota_period(PER_MINUTE), "minute")
        self.assertIsNone(quota_period(FakeAPIError(429, "RESOURCE_EXHAUSTED")))

    def test_as_quota_error(self):
        converted = as_quota_error(DAILY)
        self.assertIsInstance(converted, QuotaExceededError)
        self.assertEqual(converted.period, "day")
        self.assertIsNone(as_quota_error(ValueError("x")))
        already = QuotaExceededError("minute")
        self.assertIs(as_quota_error(already), already)


if __name__ == "__main__":
    unittest.main()
