"""Tests for utils/rate_limit.py. Run: python -m unittest discover -s tests"""

import pathlib
import sys
import unittest
from types import SimpleNamespace

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from utils.rate_limit import RateLimiter, client_ip  # noqa: E402


class FakeClock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


class RateLimiterTests(unittest.TestCase):
    def test_blocks_after_limit_and_recovers_after_window(self):
        clock = FakeClock()
        limiter = RateLimiter(2, window_seconds=60, clock=clock)
        self.assertTrue(limiter.check("a")[0])
        self.assertTrue(limiter.check("a")[0])

        allowed, retry_after = limiter.check("a")
        self.assertFalse(allowed)
        self.assertGreater(retry_after, 0)

        clock.now += 61
        self.assertTrue(limiter.check("a")[0])

    def test_clients_are_counted_separately(self):
        limiter = RateLimiter(1, clock=FakeClock())
        self.assertTrue(limiter.check("a")[0])
        self.assertTrue(limiter.check("b")[0])
        self.assertFalse(limiter.check("a")[0])

    def test_zero_disables(self):
        limiter = RateLimiter(0, clock=FakeClock())
        for _ in range(100):
            self.assertTrue(limiter.check("a")[0])


class ClientIpTests(unittest.TestCase):
    def test_uses_first_forwarded_address(self):
        req = SimpleNamespace(headers={"X-Forwarded-For": "1.2.3.4, 10.0.0.1"}, remote_addr="10.0.0.2")
        self.assertEqual(client_ip(req), "1.2.3.4")

    def test_falls_back_to_remote_addr(self):
        req = SimpleNamespace(headers={}, remote_addr="5.6.7.8")
        self.assertEqual(client_ip(req), "5.6.7.8")


if __name__ == "__main__":
    unittest.main()
