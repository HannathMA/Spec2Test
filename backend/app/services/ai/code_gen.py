import re
from typing import Dict, Any, List

def generate_pytest_module_code(
    module_name: str,
    test_func_name: str,
    test_id: str,
    req_id: str,
    criterion_ids: List[str],
    test_type: str,
    title: str,
    target_url: str,
    expected_outcome: str,
    steps: List[str]
) -> str:
    """
    Generates a production-grade, safe, executable pytest test function.
    Uses httpx to interact with target URL or safe validation assertions.
    """
    clean_func = re.sub(r'[^a-zA-Z0-9_]', '_', test_func_name.lower())
    if not clean_func.startswith("test_"):
        clean_func = f"test_{clean_func}"

    # Generate custom test body based on test_type and scenario
    is_failing_sample = "duplicate_payment" in clean_func or "expired_card" in clean_func or "unsupported_currency" in clean_func

    code_lines = [
        "import pytest",
        "import httpx",
        "import time",
        "import os",
        "",
        f"# Test Case: {test_id} ({test_type})",
        f"# Linked Requirement: {req_id}",
        f"# Linked Acceptance Criteria: {', '.join(criterion_ids)}",
        f"# Description: {title}",
        f"# Expected Outcome: {expected_outcome}",
        "",
        f"TARGET_URL = os.environ.get('TEST_TARGET_URL', '{target_url}')",
        "",
        f"def {clean_func}():",
        f'    """Verification test for {test_id} - {title}"""',
        "    with httpx.Client(base_url=TARGET_URL, timeout=10.0) as client:",
    ]

    if "login" in clean_func or "auth" in clean_func:
        if "invalid" in clean_func or "wrong" in clean_func:
            code_lines.extend([
                '        # Negative path: attempt login with invalid credentials',
                '        payload = {"username": "testuser", "password": "WrongPassword!999"}',
                '        response = client.post("/api/v1/auth/login", json=payload)',
                '        # Assert proper rejection status code',
                '        assert response.status_code == 401, f"Expected 401 Unauthorized, got {response.status_code}: {response.text}"',
                '        data = response.json()',
                '        assert "error" in data or "detail" in data, "Error message must be present in response payload"'
            ])
        elif "empty" in clean_func:
            code_lines.extend([
                '        # Boundary path: empty username/password validation',
                '        payload = {"username": "", "password": ""}',
                '        response = client.post("/api/v1/auth/login", json=payload)',
                '        assert response.status_code == 400 or response.status_code == 422, f"Expected 400 or 422, got {response.status_code}"'
            ])
        elif "lockout" in clean_func:
            code_lines.extend([
                '        # Edge case / Security: check lockout after successive failed attempts',
                '        payload = {"username": "locked_user", "password": "BadPassword"}',
                '        status_codes = []',
                '        for _ in range(4):',
                '            r = client.post("/api/v1/auth/login", json=payload)',
                '            status_codes.append(r.status_code)',
                '        # Final attempt must be locked out (429 or 403)',
                '        assert status_codes[-1] in [403, 429], f"Account should be locked out, got {status_codes[-1]}"'
            ])
        else:
            code_lines.extend([
                '        # Positive path: valid login credentials',
                '        payload = {"username": "hanna", "password": "ValidPassword123!"}',
                '        response = client.post("/api/v1/auth/login", json=payload)',
                '        assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}: {response.text}"',
                '        data = response.json()',
                '        assert "access_token" in data, "Response must contain access_token"',
                '        assert data.get("token_type") == "bearer", "Token type must be bearer"'
            ])
    elif "payment" in clean_func or "checkout" in clean_func:
        if "duplicate" in clean_func:
            # Deliberately failing scenario to demonstrate genuine assertion failures
            code_lines.extend([
                '        # Security / Integrity: duplicate payment idempotency verification',
                '        payment_payload = {"order_id": "ORD-9912", "amount": 149.99, "idempotency_key": "IDEMP-KEY-9912"}',
                '        res1 = client.post("/api/v1/payment/charge", json=payment_payload)',
                '        assert res1.status_code in [200, 201], f"First charge failed: {res1.text}"',
                '        # Immediate duplicate submission with identical idempotency key',
                '        res2 = client.post("/api/v1/payment/charge", json=payment_payload)',
                '        # Requirement states duplicate payment must be rejected or deduplicated safely',
                '        # TARGET BUG IN DEMO APP: Demo API deliberately returns duplicate charge (HTTP 200 without deduplication)',
                '        assert res2.status_code == 409 or (res2.status_code == 200 and res2.json().get("duplicate") is True), \\',
                '            f"Duplicate payment verification failed! Expected 409 Conflict or duplicate detection, got {res2.status_code} with {res2.text}"'
            ])
        elif "expired" in clean_func:
            code_lines.extend([
                '        # Negative path: expired card payment',
                '        payment_payload = {"order_id": "ORD-1002", "amount": 50.00, "card_expiry": "01/20"}',
                '        res = client.post("/api/v1/payment/charge", json=payment_payload)',
                '        assert res.status_code == 400, f"Expected 400 Bad Request for expired card, got {res.status_code}"',
                '        assert "expired" in res.text.lower(), "Expected error message specifying expired card"'
            ])
        else:
            code_lines.extend([
                '        # Positive path: valid payment processing',
                '        payment_payload = {"order_id": "ORD-5501", "amount": 89.50, "currency": "USD"}',
                '        res = client.post("/api/v1/payment/charge", json=payment_payload)',
                '        assert res.status_code in [200, 201], f"Expected 200/201, got {res.status_code}"',
                '        data = res.json()',
                '        assert data.get("status") == "success", "Payment status must be success"'
            ])
    elif "performance" in clean_func or "response_time" in clean_func or "latency" in clean_func:
        code_lines.extend([
            '        # Performance SLA: verify response time is under threshold (2000ms)',
            '        start_time = time.perf_counter()',
            '        response = client.get("/api/v1/products")',
            '        elapsed_ms = (time.perf_counter() - start_time) * 1000',
            '        assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"',
            '        assert elapsed_ms < 2000, f"Latency SLA violated: took {elapsed_ms:.1f}ms, maximum allowable is 2000ms"'
        ])
    elif "cart" in clean_func or "boundary" in clean_func or "quantity" in clean_func:
        code_lines.extend([
            '        # Boundary check: maximum order quantity validation',
            '        payload = {"item_id": "ITEM-101", "quantity": 100}',
            '        response = client.post("/api/v1/cart/items", json=payload)',
            '        assert response.status_code == 400, f"Expected 400 for exceeding max quantity of 99, got {response.status_code}"',
            '        assert "quantity" in response.text.lower(), "Expected error mentioning quantity restriction"'
        ])
    else:
        code_lines.extend([
            f'        # Standard API verification for {test_id}',
            '        response = client.get("/api/v1/health")',
            '        assert response.status_code == 200, f"Expected 200, got {response.status_code}"',
            '        data = response.json()',
            '        assert data.get("status") in ["ok", "healthy"], "Service must report healthy status"'
        ])

    return "\n".join(code_lines) + "\n"
