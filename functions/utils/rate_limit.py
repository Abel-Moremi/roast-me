"""Simple per-IP rate limiting, kept in memory."""

import threading
import time
from collections import defaultdict, deque

WINDOW_SECONDS = 3600


class RateLimiter:
    """
    Sliding-window counter per client key (an IP address).

    Memory only: each function instance counts on its own and forgets on
    restart. That is enough to stop one person from hammering the paid
    Gemini calls, without adding a database.
    """

    def __init__(self, max_requests, window_seconds=WINDOW_SECONDS, clock=time.monotonic):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._clock = clock
        self._hits = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key):
        """
        Record a request for `key` if it is allowed.

        Returns:
            (allowed: bool, retry_after_seconds: int)
        """
        if self.max_requests <= 0:
            return True, 0

        now = self._clock()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] >= self.window_seconds:
                hits.popleft()

            if len(hits) >= self.max_requests:
                retry_after = int(self.window_seconds - (now - hits[0])) + 1
                return False, retry_after

            hits.append(now)
            self._prune(now)
            return True, 0

    def _prune(self, now):
        # Drop clients with no recent requests so memory doesn't grow forever
        if len(self._hits) < 1000:
            return
        stale = [k for k, h in self._hits.items() if not h or now - h[-1] >= self.window_seconds]
        for k in stale:
            del self._hits[k]


def client_ip(request):
    """The caller's IP. Cloud Functions sits behind a proxy, so use the first X-Forwarded-For entry."""
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "unknown"
