"""
Custom DRF throttle classes for submission endpoints.

Rates (per authenticated user):
  - SubmissionThrottle : 30 submit/hour  — prevents spam flooding
  - RunCodeThrottle    : 60 run/hour     — "Run" is cheaper, allow 2x
  - BurstThrottle      :  5 req/10s      — prevents rapid-fire bursts

Anonymous users hit the default AnonRateThrottle (30/hour) from settings.
"""
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle


class SubmissionThrottle(UserRateThrottle):
    """POST /api/submissions/ — 30 per hour per user."""
    scope = 'submission'


class RunCodeThrottle(UserRateThrottle):
    """POST /api/problems/:slug/run/ — 60 per hour per user."""
    scope = 'run_code'


class BurstThrottle(UserRateThrottle):
    """Any endpoint — max 5 requests per 10 seconds (burst protection)."""
    scope = 'burst'
