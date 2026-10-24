import re
import json
import logging
from typing import List, Dict, Any, Optional
from backend.app.schemas.ai import RawGeneratedTest, TestGenerationResult
from backend.app.services.ai.code_gen import generate_pytest_module_code
from backend.app.services.ai.provider import ai_provider

logger = logging.getLogger(__name__)

def generate_test_cases_deterministic(
    req_id: str,
    title: str,
    criteria: List[Dict[str, Any]],
    target_url: str = "http://127.0.0.1:8000/demo-target"
) -> List[RawGeneratedTest]:
    """
    Deterministic rule-based test case generation covering 6 distinct test categories:
    Positive, Negative, Boundary, Edge Case, Performance, Security.
    """
    if not criteria:
        return []
    tests: List[RawGeneratedTest] = []
    crit_ids = [c["criterion_id"] for c in criteria]
    slug = re.sub(r'[^a-zA-Z0-9]', '_', title.lower()).strip('_')[:25]

    # 1. Positive Test Case
    tc1_id = f"TC-{req_id.replace('REQ-', '').replace('R-', '')}-01"
    tests.append(RawGeneratedTest(
        test_id=tc1_id,
        title=f"Valid execution for {title}",
        description=f"Verifies happy path execution with valid input and schema matching for {req_id}.",
        test_type="Positive",
        priority="High",
        preconditions="Valid test credentials and accessible service endpoint.",
        steps=[
            "1. Prepare valid payload and authentication headers",
            "2. Send HTTP request to target endpoint",
            "3. Verify HTTP 200/201 response status code",
            "4. Verify response body matches expected schema"
        ],
        expected_outcome="Operation succeeds with HTTP 200/201 and validated payload.",
        linked_criterion_ids=crit_ids[:2],
        python_test_code=generate_pytest_module_code(
            module_name=f"test_{slug}_positive.py",
            test_func_name=f"test_{slug}_valid",
            test_id=tc1_id,
            req_id=req_id,
            criterion_ids=crit_ids[:2],
            test_type="Positive",
            title=f"Valid execution for {title}",
            target_url=target_url,
            expected_outcome="Operation succeeds with HTTP 200/201",
            steps=["Send valid request", "Assert 200 OK"]
        )
    ))

    # 2. Negative Test Case
    tc2_id = f"TC-{req_id.replace('REQ-', '').replace('R-', '')}-02"
    tests.append(RawGeneratedTest(
        test_id=tc2_id,
        title=f"Invalid parameter handling for {title}",
        description=f"Verifies proper error rejection and error code when invalid parameters are supplied.",
        test_type="Negative",
        priority="High",
        preconditions="Service is reachable.",
        steps=[
            "1. Prepare payload with invalid or missing required fields",
            "2. Send HTTP request to target endpoint",
            "3. Verify HTTP 400 Bad Request or 401 Unauthorized",
            "4. Verify error payload contains descriptive message"
        ],
        expected_outcome="Operation is rejected with HTTP 400/401 and structured error response.",
        linked_criterion_ids=crit_ids[:1],
        python_test_code=generate_pytest_module_code(
            module_name=f"test_{slug}_negative.py",
            test_func_name=f"test_{slug}_invalid",
            test_id=tc2_id,
            req_id=req_id,
            criterion_ids=crit_ids[:1],
            test_type="Negative",
            title=f"Invalid parameter rejection for {title}",
            target_url=target_url,
            expected_outcome="Operation rejected with 400/401",
            steps=["Send invalid payload", "Assert rejection"]
        )
    ))

    # 3. Boundary Test Case
    tc3_id = f"TC-{req_id.replace('REQ-', '').replace('R-', '')}-03"
    tests.append(RawGeneratedTest(
        test_id=tc3_id,
        title=f"Boundary values and empty input validation for {title}",
        description=f"Verifies system limits when boundary values, empty strings, or maximum lengths are submitted.",
        test_type="Boundary",
        priority="Medium",
        preconditions="Service is reachable.",
        steps=[
            "1. Submit request with empty strings or maximum boundary values",
            "2. Check validation failure without 500 server crash",
            "3. Assert HTTP 400 or 422 Unprocessable Entity"
        ],
        expected_outcome="Rejection with HTTP 400/422 without unhandled server exception.",
        linked_criterion_ids=crit_ids[:2],
        python_test_code=generate_pytest_module_code(
            module_name=f"test_{slug}_boundary.py",
            test_func_name=f"test_{slug}_boundary_empty",
            test_id=tc3_id,
            req_id=req_id,
            criterion_ids=crit_ids[:2],
            test_type="Boundary",
            title=f"Boundary limits for {title}",
            target_url=target_url,
            expected_outcome="Boundary values properly validated",
            steps=["Submit boundary payload", "Assert 400 or 422"]
        )
    ))

    # 4. Edge Case or Security/Performance Test Case
    if "payment" in title.lower() or "cart" in title.lower() or "order" in title.lower():
        tc4_id = f"TC-{req_id.replace('REQ-', '').replace('R-', '')}-04"
        tests.append(RawGeneratedTest(
            test_id=tc4_id,
            title=f"Duplicate submission prevention for {title}",
            description="Verifies idempotency and duplicate transaction prevention under concurrent or repeated calls.",
            test_type="Edge Case",
            priority="High",
            preconditions="Active account with payment capability.",
            steps=[
                "1. Submit payment request with idempotency key",
                "2. Immediately resubmit identical request",
                "3. Assert second request is rejected with 409 or deduplicated without double charge"
            ],
            expected_outcome="Duplicate transaction blocked or deduplicated safely.",
            linked_criterion_ids=crit_ids,
            python_test_code=generate_pytest_module_code(
                module_name=f"test_{slug}_duplicate.py",
                test_func_name=f"test_{slug}_duplicate_payment",
                test_id=tc4_id,
                req_id=req_id,
                criterion_ids=crit_ids,
                test_type="Edge Case",
                title=f"Duplicate payment prevention for {title}",
                target_url=target_url,
                expected_outcome="Prevent duplicate charge",
                steps=["Send duplicate requests", "Assert 409 or deduplication"]
            )
        ))
    elif "lock" in title.lower() or "auth" in title.lower() or "login" in title.lower():
        tc4_id = f"TC-{req_id.replace('REQ-', '').replace('R-', '')}-04"
        tests.append(RawGeneratedTest(
            test_id=tc4_id,
            title=f"Account lockout threshold check for {title}",
            description="Verifies account is safely locked out after repeated failed attempts.",
            test_type="Security",
            priority="High",
            preconditions="Existing test user account.",
            steps=[
                "1. Send successive invalid login requests",
                "2. Verify final attempt triggers account lockout with HTTP 429/403"
            ],
            expected_outcome="Account locked out after threshold exceeded.",
            linked_criterion_ids=crit_ids,
            python_test_code=generate_pytest_module_code(
                module_name=f"test_{slug}_lockout.py",
                test_func_name=f"test_{slug}_lockout_threshold",
                test_id=tc4_id,
                req_id=req_id,
                criterion_ids=crit_ids,
                test_type="Security",
                title=f"Account lockout threshold for {title}",
                target_url=target_url,
                expected_outcome="Lockout enforced with 429/403",
                steps=["Send repeated invalid attempts", "Assert lockout"]
            )
        ))
    else:
        tc4_id = f"TC-{req_id.replace('REQ-', '').replace('R-', '')}-04"
        tests.append(RawGeneratedTest(
            test_id=tc4_id,
            title=f"Response SLA verification for {title}",
            description="Measures response latency to ensure latency is below 2000ms SLA.",
            test_type="Performance",
            priority="Medium",
            preconditions="Endpoint is operational.",
            steps=[
                "1. Send HTTP GET request to endpoint",
                "2. Measure roundtrip response latency",
                "3. Assert elapsed time is < 2000ms"
            ],
            expected_outcome="Response time strictly under 2000ms threshold.",
            linked_criterion_ids=crit_ids,
            python_test_code=generate_pytest_module_code(
                module_name=f"test_{slug}_perf.py",
                test_func_name=f"test_{slug}_latency_sla",
                test_id=tc4_id,
                req_id=req_id,
                criterion_ids=crit_ids,
                test_type="Performance",
                title=f"Latency SLA for {title}",
                target_url=target_url,
                expected_outcome="Latency < 2000ms",
                steps=["Measure request time", "Assert latency < 2000ms"]
            )
        ))

    return tests

async def generate_tests_for_requirement(
    req_id: str,
    title: str,
    criteria: List[Dict[str, Any]],
    target_url: str = "http://127.0.0.1:8000/demo-target"
) -> List[RawGeneratedTest]:
    # AI provider option if configured
    if ai_provider.is_configured:
        try:
            system_prompt = (
                "You are an automated software test architect. Generate structured executable test cases "
                "for the given requirement and approved acceptance criteria. "
                "Return valid JSON matching: "
                "{"
                "  \"test_cases\": ["
                "    {"
                "      \"test_id\": \"TC-001\","
                "      \"title\": \"...\","
                "      \"description\": \"...\","
                "      \"test_type\": \"Positive|Negative|Boundary|Edge Case|Performance|Security\","
                "      \"priority\": \"High|Medium|Low\","
                "      \"preconditions\": \"...\","
                "      \"steps\": [\"1...\", \"2...\"],"
                "      \"expected_outcome\": \"...\","
                "      \"linked_criterion_ids\": [\"AC-01\"],"
                "      \"python_test_code\": \"...\""
                "    }"
                "  ]"
                "}"
            )
            user_prompt = f"Requirement: {req_id} - {title}\nCriteria: {json.dumps(criteria)}\nTarget URL: {target_url}"
            resp = await ai_provider.complete_chat(system_prompt, user_prompt, response_format={"type": "json_object"})
            if resp:
                data = json.loads(resp)
                raw_list = data.get("test_cases", [])
                tests = []
                for item in raw_list:
                    # Ensure python test code is populated and safe
                    if not item.get("python_test_code"):
                        item["python_test_code"] = generate_pytest_module_code(
                            module_name=f"test_{req_id.lower()}_{item.get('test_id', 'tc')}.py",
                            test_func_name=f"test_{req_id.lower()}_{item.get('test_id', 'tc')}",
                            test_id=item.get("test_id", "TC-001"),
                            req_id=req_id,
                            criterion_ids=item.get("linked_criterion_ids", []),
                            test_type=item.get("test_type", "Positive"),
                            title=item.get("title", ""),
                            target_url=target_url,
                            expected_outcome=item.get("expected_outcome", ""),
                            steps=item.get("steps", [])
                        )
                    tests.append(RawGeneratedTest(**item))
                if tests:
                    return tests
        except Exception as e:
            logger.warning(f"AI test generation error: {e}")

    # Fallback deterministic generation
    return generate_test_cases_deterministic(req_id, title, criteria, target_url)
