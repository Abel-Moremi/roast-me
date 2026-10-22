"""Recognising Gemini quota errors (the API key's request limit)."""


class QuotaExceededError(Exception):
    """The Gemini API key has used up its request quota."""

    def __init__(self, period=None):
        # "day", "minute" or None when Gemini doesn't say
        self.period = period
        super().__init__(f"Gemini quota exceeded ({period or 'unknown period'})")


def is_quota_error(error):
    """
    True if `error` is Gemini saying the quota is used up.

    google-genai raises errors.ClientError with code 429 and status
    RESOURCE_EXHAUSTED. Checked by attribute so this module doesn't need
    the SDK (and can be tested without it).
    """
    if getattr(error, "code", None) == 429:
        return True
    if getattr(error, "status", None) == "RESOURCE_EXHAUSTED":
        return True
    return "RESOURCE_EXHAUSTED" in str(error)


def quota_period(error):
    """Which limit was hit, from the quota id in the error details (e.g. ...PerDay...)."""
    text = f"{getattr(error, 'details', '')} {error}"
    if "PerDay" in text:
        return "day"
    if "PerMinute" in text:
        return "minute"
    return None


def as_quota_error(error):
    """Return a QuotaExceededError for a Gemini quota error, else None."""
    if isinstance(error, QuotaExceededError):
        return error
    if is_quota_error(error):
        return QuotaExceededError(quota_period(error))
    return None
