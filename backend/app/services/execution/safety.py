import os
import re
from urllib.parse import urlparse
from backend.app.core.config import settings

def validate_target_url(url: str) -> bool:
    """
    Validates target URL scheme and protects against SSRF against cloud metadata endpoints.
    Allows localhost / 127.0.0.1 for local demo test target.
    """
    if not url:
        return False
    try:
        parsed = urlparse(url)
        if parsed.scheme.lower() not in settings.ALLOWED_TARGET_SCHEMES:
            return False
        hostname = (parsed.hostname or "").lower()
        # Block cloud metadata addresses
        if hostname in ["169.254.169.254", "metadata.google.internal"]:
            return False
        return True
    except Exception:
        return False

def sanitize_test_identifier(name: str) -> str:
    """
    Sanitizes file and function names to prevent path traversal or invalid identifiers.
    """
    cleaned = re.sub(r'[^a-zA-Z0-9_-]', '_', name)
    return cleaned[:64]

def get_isolated_env(target_url: str) -> dict:
    """
    Builds a minimal, sanitized environment for the pytest test subprocess.
    Strips out sensitive server credentials (AI API keys, DB passwords).
    """
    safe_keys = ["PATH", "SYSTEMROOT", "WINDIR", "PYTHONPATH", "TEMP", "TMP"]
    env = {k: os.environ[k] for k in safe_keys if k in os.environ}
    env["TEST_TARGET_URL"] = target_url
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    return env
