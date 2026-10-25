import os
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from backend.app.models.project import Project
from backend.app.models.requirement import Requirement, RequirementVersion, AcceptanceCriterion, AnalysisFinding
from backend.app.models.test_case import TestCase, TestCaseVersion
from backend.app.models.execution import TestRun, TestResult, EvidenceRecord
from backend.app.models.activity import ActivityEvent
from backend.app.models.change_impact import ChangeImpactRecord
from backend.app.services.ai.code_gen import generate_pytest_module_code

DEMO_PROJECT_NAME = "Commerce API Verification"

def seed_demo_data(db: Session, force_reset: bool = False) -> Project:
    """
    Seeds comprehensive demo project with requirements, criteria, test cases,
    test run results, evidence logs, and activities matching the visual design.
    """
    existing_project = db.query(Project).filter(Project.name == DEMO_PROJECT_NAME).first()
    if existing_project and not force_reset:
        current_target = f"http://127.0.0.1:{os.environ.get('PORT', '8000')}/demo-target"
        if existing_project.target_url != current_target:
            existing_project.target_url = current_target
            db.commit()
        return existing_project

    if existing_project and force_reset:
        db.delete(existing_project)
        db.commit()

    # 1. Create Project
    project = Project(
        name=DEMO_PROJECT_NAME,
        description="End-to-end verification suite for Commerce API core services: auth, cart boundaries, and payment idempotency.",
        target_url=f"http://127.0.0.1:{os.environ.get('PORT', '8000')}/demo-target",
        test_framework="pytest",
        environment="Staging",
        created_at=datetime.utcnow() - timedelta(hours=2)
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # 2. Seed Requirements
    req_specs = [
        {
            "req_id": "REQ-001",
            "title": "User Registration",
            "text": "The system shall allow new users to register with a unique username and valid email address. Passwords must meet basic security standards.",
            "priority": "High",
            "findings": [
                ("ambiguity", "medium", "Ambiguous term 'basic security standards'", "Lacks specific minimum length, special characters, and entropy requirements.", "Require at least 8 characters with 1 number and 1 special symbol.")
            ],
            "criteria": [
                ("AC-01", "Given valid username and email, When submitted, Then registration succeeds and account is created.", True),
                ("AC-02", "Given an already registered email, When submitted, Then system shows duplicate email error.", True)
            ]
        },
        {
            "req_id": "REQ-002",
            "title": "Authentication & Login",
            "text": "Users should be able to log in with valid credentials. The system must verify passwords and return an access token.",
            "priority": "High",
            "findings": [
                ("missing_detail", "medium", "Token format and expiration unspecified", "Does not specify whether token is Bearer JWT or cookie-based, nor session lifetime.", "Specify Bearer JWT token with 3600 second lifetime.")
            ],
            "criteria": [
                ("AC-01", "Given correct username and password, When logging in, Then login succeeds and user is authenticated.", True),
                ("AC-02", "Given wrong password, When logging in, Then system shows invalid password error.", True),
                ("AC-03", "Given empty username or password, When logging in, Then system shows required fields error.", True)
            ]
        },
        {
            "req_id": "REQ-003",
            "title": "Account Lockout",
            "text": "Users must be locked out after three failed login attempts.",
            "priority": "High",
            "findings": [
                ("ambiguity", "high", "Lockout duration and scope undefined", "Does not state whether lockout resets automatically after a time window or requires admin unlock.", "Lockout account for 10 minutes or until password reset is completed.")
            ],
            "criteria": [
                ("AC-01", "Given 3 consecutive wrong password attempts, When submitted, Then the account is temporarily locked.", True),
                ("AC-02", "Given a locked account, When login is attempted during lockout, Then login is blocked with lockout notice.", True)
            ]
        },
        {
            "req_id": "REQ-004",
            "title": "Product Availability",
            "text": "The product catalog must respond quickly and list all available items with stock status.",
            "priority": "Medium",
            "findings": [
                ("ambiguity", "high", "Ambiguous term 'respond quickly'", "No quantitative latency threshold specified for catalog listing.", "Specify 95% of catalog requests complete within 2000ms.")
            ],
            "criteria": [
                ("AC-01", "Given active items in catalog, When viewing products, Then list of available items is displayed.", True),
                ("AC-02", "Given normal user traffic, When browsing catalog, Then products load within 2 seconds.", True)
            ]
        },
        {
            "req_id": "REQ-005",
            "title": "Cart Quantity Boundaries",
            "text": "Cart items must allow positive integers up to reasonable maximum quantities.",
            "priority": "Medium",
            "findings": [
                ("ambiguity", "medium", "Ambiguous term 'reasonable maximum'", "Upper boundary threshold for order quantity is unspecified.", "Enforce maximum quantity limit of 99 items per line item.")
            ],
            "criteria": [
                ("AC-01", "Given item quantity between 1 and 99, When adding to cart, Then item is added successfully.", True),
                ("AC-02", "Given item quantity of 100 or higher, When adding to cart, Then system shows maximum quantity limit error.", True)
            ]
        },
        {
            "req_id": "REQ-006",
            "title": "Payment Card Validation",
            "text": "Payments with expired credit cards must be rejected immediately without charging.",
            "priority": "High",
            "findings": [
                ("missing_precondition", "low", "Missing card brand validation", "Does not specify accepted payment networks (Visa, MC, Amex).", "Accept major credit cards with standard Luhn checksum validation.")
            ],
            "criteria": [
                ("AC-01", "Given an expired card date, When submitting payment, Then card is rejected with expiration error.", True),
                ("AC-02", "Given valid card details and amount, When submitting payment, Then payment succeeds and confirmation is shown.", True)
            ]
        },
        {
            "req_id": "REQ-007",
            "title": "Duplicate Payment Prevention",
            "text": "The payment gateway must prevent duplicate payments when the customer clicks twice or network retries occur.",
            "priority": "High",
            "findings": [
                ("missing_detail", "high", "Idempotency key mechanism not formally defined", "Does not define idempotency key header or payload deduplication window.", "Enforce Idempotency-Key header and deduplicate identical submissions within 60 seconds.")
            ],
            "criteria": [
                ("AC-01", "Given a payment request, When submitted once, Then charge is processed successfully.", True),
                ("AC-02", "Given user clicks pay twice quickly, When duplicate request is detected, Then second charge is blocked safely.", True)
            ]
        },
        {
            "req_id": "REQ-008",
            "title": "System Response SLA",
            "text": "All public endpoints must respond quickly under agreed test load.",
            "priority": "Medium",
            "findings": [
                ("missing_threshold", "high", "Missing quantitative SLA metric", "Does not define 95th/99th percentile response time or load capacity.", "Define 95% of requests complete under 2000ms under 50 RPS load.")
            ],
            "criteria": [
                ("AC-01", "Given normal user traffic, When any public page or action is loaded, Then system responds in under 2 seconds.", True)
            ]
        }
    ]

    all_test_cases = []
    
    for r_idx, spec in enumerate(req_specs):
        req = Requirement(
            project_id=project.id,
            req_id=spec["req_id"],
            title=spec["title"],
            original_text=spec["text"],
            description=f"Formal specification for {spec['title']}.",
            priority=spec["priority"],
            status="Approved",
            current_version=1,
            created_at=datetime.utcnow() - timedelta(hours=1, minutes=30 - r_idx*5)
        )
        db.add(req)
        db.flush()

        # Add Version 1
        db.add(RequirementVersion(
            requirement_id=req.id,
            version_number=1,
            title=spec["title"],
            original_text=spec["text"],
            priority=spec["priority"],
            status="Approved",
            change_summary="Initial approved specification baseline.",
            created_at=req.created_at
        ))

        # Add Findings
        for finding_tuple in spec["findings"]:
            db.add(AnalysisFinding(
                requirement_id=req.id,
                finding_type=str(finding_tuple[0]),
                severity=str(finding_tuple[1]),
                title=str(finding_tuple[2]),
                explanation=str(finding_tuple[3]),
                suggested_clarification=str(finding_tuple[4]),
                created_at=req.created_at
            ))

        # Add Criteria
        crit_ids = []
        for crit_tuple in spec["criteria"]:
            c_id = str(crit_tuple[0])
            c_text = str(crit_tuple[1])
            c_app = bool(crit_tuple[2])
            ac = AcceptanceCriterion(
                requirement_id=req.id,
                criterion_id=c_id,
                criterion_text=c_text,
                format="given_when_then",
                review_status="approved" if c_app else "pending",
                is_approved=c_app,
                version_number=1,
                created_at=req.created_at
            )
            db.add(ac)
            crit_ids.append(c_id)
        db.flush()

        # Generate Test Cases for this requirement
        # Match the IDs from the screenshot: TC-001 through TC-008
        if spec["req_id"] == "REQ-002":
            # Login tests
            tc1 = TestCase(
                project_id=project.id,
                requirement_id=req.id,
                test_id="TC-001",
                title="Valid login with correct credentials",
                description="Verifies user receives 200 OK and valid JWT token.",
                linked_req_id=spec["req_id"],
                linked_criterion_ids=["AC-01"],
                test_type="Positive",
                priority="High",
                preconditions="User hanna is registered in the database.",
                steps=["1. POST /api/v1/auth/login with valid credentials", "2. Assert 200 OK", "3. Assert access_token present"],
                expected_outcome="User receives access token and HTTP 200.",
                execution_method="pytest",
                generated_code=generate_pytest_module_code("test_auth_valid.py", "test_valid_login", "TC-001", "REQ-002", ["AC-01"], "Positive", "Valid login with correct credentials", project.target_url, "HTTP 200 OK and token", ["POST valid credentials", "Assert 200"]),
                review_status="Approved",
                req_version_at_generation=1
            )
            tc2 = TestCase(
                project_id=project.id,
                requirement_id=req.id,
                test_id="TC-002",
                title="Login with wrong password",
                description="Verifies invalid password returns HTTP 401 Unauthorized.",
                linked_req_id=spec["req_id"],
                linked_criterion_ids=["AC-02"],
                test_type="Negative",
                priority="High",
                preconditions="User exists.",
                steps=["1. POST /api/v1/auth/login with invalid password", "2. Assert 401 Unauthorized"],
                expected_outcome="System rejects with HTTP 401.",
                execution_method="pytest",
                generated_code=generate_pytest_module_code("test_auth_invalid.py", "test_invalid_password", "TC-002", "REQ-002", ["AC-02"], "Negative", "Login with wrong password", project.target_url, "HTTP 401 Unauthorized", ["POST wrong password", "Assert 401"]),
                review_status="Approved",
                req_version_at_generation=1
            )
            tc3 = TestCase(
                project_id=project.id,
                requirement_id=req.id,
                test_id="TC-003",
                title="Login with empty fields",
                description="Verifies empty credentials return HTTP 400 Bad Request.",
                linked_req_id=spec["req_id"],
                linked_criterion_ids=["AC-03"],
                test_type="Boundary",
                priority="Medium",
                preconditions="Endpoint available.",
                steps=["1. POST /api/v1/auth/login with empty strings", "2. Assert 400 Bad Request"],
                expected_outcome="System rejects with HTTP 400.",
                execution_method="pytest",
                generated_code=generate_pytest_module_code("test_auth_empty.py", "test_empty_fields", "TC-003", "REQ-002", ["AC-03"], "Boundary", "Login with empty fields", project.target_url, "HTTP 400 Bad Request", ["POST empty fields", "Assert 400"]),
                review_status="Approved",
                req_version_at_generation=1
            )
            all_test_cases.extend([tc1, tc2, tc3])

        elif spec["req_id"] == "REQ-003":
            tc4 = TestCase(
                project_id=project.id,
                requirement_id=req.id,
                test_id="TC-004",
                title="Account lock after 3 failed attempts",
                description="Verifies account is locked out after 3 consecutive failed logins.",
                linked_req_id=spec["req_id"],
                linked_criterion_ids=["AC-01", "AC-02"],
                test_type="Negative",
                priority="High",
                preconditions="Active account.",
                steps=["1. Send 3 failed login attempts", "2. Verify 4th attempt returns 429 Too Many Requests"],
                expected_outcome="Account is locked out with HTTP 429.",
                execution_method="pytest",
                generated_code=generate_pytest_module_code("test_lockout.py", "test_account_lockout", "TC-004", "REQ-003", ["AC-01"], "Negative", "Account lock after 3 failed attempts", project.target_url, "HTTP 429 Too Many Requests", ["Submit 3 failed logins", "Assert lockout"]),
                review_status="Approved",
                req_version_at_generation=1
            )
            all_test_cases.append(tc4)

        elif spec["req_id"] == "REQ-006":
            tc5 = TestCase(
                project_id=project.id,
                requirement_id=req.id,
                test_id="TC-005",
                title="Payment with valid card",
                description="Verifies valid card payment completes successfully.",
                linked_req_id=spec["req_id"],
                linked_criterion_ids=["AC-02"],
                test_type="Positive",
                priority="High",
                preconditions="Order created.",
                steps=["1. POST /api/v1/payment/charge with valid payload", "2. Assert 200 OK"],
                expected_outcome="Payment succeeds with HTTP 200.",
                execution_method="pytest",
                generated_code=generate_pytest_module_code("test_payment_valid.py", "test_valid_card", "TC-005", "REQ-006", ["AC-02"], "Positive", "Payment with valid card", project.target_url, "HTTP 200 OK", ["POST valid card", "Assert 200"]),
                review_status="Approved",
                req_version_at_generation=1
            )
            tc6 = TestCase(
                project_id=project.id,
                requirement_id=req.id,
                test_id="TC-006",
                title="Payment with expired card",
                description="Verifies expired card is rejected with 400 Bad Request.",
                linked_req_id=spec["req_id"],
                linked_criterion_ids=["AC-01"],
                test_type="Negative",
                priority="High",
                preconditions="Order created.",
                steps=["1. POST /api/v1/payment/charge with card_expiry 01/20", "2. Assert 400 Bad Request"],
                expected_outcome="Payment rejected with HTTP 400.",
                execution_method="pytest",
                generated_code=generate_pytest_module_code("test_payment_expired.py", "test_expired_card", "TC-006", "REQ-006", ["AC-01"], "Negative", "Payment with expired card", project.target_url, "HTTP 400 Bad Request", ["POST expired card", "Assert 400"]),
                review_status="Approved",
                req_version_at_generation=1
            )
            all_test_cases.extend([tc5, tc6])

        elif spec["req_id"] == "REQ-007":
            # Deliberately failing duplicate payment test case!
            tc7 = TestCase(
                project_id=project.id,
                requirement_id=req.id,
                test_id="TC-007",
                title="Duplicate payment idempotency enforcement",
                description="Verifies duplicate payment submissions with same idempotency key are rejected with 409.",
                linked_req_id=spec["req_id"],
                linked_criterion_ids=["AC-02"],
                test_type="Edge Case",
                priority="High",
                preconditions="Payment processing configured.",
                steps=["1. Submit charge for ORD-9912", "2. Immediately resubmit with same idempotency key", "3. Assert 409 Conflict"],
                expected_outcome="Duplicate payment rejected with HTTP 409 Conflict.",
                execution_method="pytest",
                generated_code=generate_pytest_module_code("test_payment_dup.py", "test_duplicate_payment", "TC-007", "REQ-007", ["AC-02"], "Edge Case", "Duplicate payment idempotency", project.target_url, "HTTP 409 Conflict", ["Send duplicate charge", "Assert 409"]),
                review_status="Approved",
                req_version_at_generation=1
            )
            all_test_cases.append(tc7)

        elif spec["req_id"] == "REQ-004":
            tc8 = TestCase(
                project_id=project.id,
                requirement_id=req.id,
                test_id="TC-008",
                title="API response time <= 2s",
                description="Verifies product catalog latency is under 2000ms threshold.",
                linked_req_id=spec["req_id"],
                linked_criterion_ids=["AC-02"],
                test_type="Performance",
                priority="Medium",
                preconditions="Catalog populated.",
                steps=["1. GET /api/v1/products", "2. Measure response time", "3. Assert elapsed time < 2000ms"],
                expected_outcome="Catalog responds in under 2000ms.",
                execution_method="pytest",
                generated_code=generate_pytest_module_code("test_perf.py", "test_response_time", "TC-008", "REQ-004", ["AC-02"], "Performance", "API response time <= 2s", project.target_url, "Latency < 2000ms", ["GET /products", "Assert time < 2000ms"]),
                review_status="Approved",
                req_version_at_generation=1
            )
            all_test_cases.append(tc8)

        elif spec["req_id"] == "REQ-005":
            tc9 = TestCase(
                project_id=project.id,
                requirement_id=req.id,
                test_id="TC-009",
                title="Cart maximum quantity limit of 99 items",
                description="Verifies quantity > 99 is rejected with 400 Bad Request.",
                linked_req_id=spec["req_id"],
                linked_criterion_ids=["AC-02"],
                test_type="Boundary",
                priority="Medium",
                preconditions="Cart created.",
                steps=["1. POST /api/v1/cart/items with quantity 100", "2. Assert 400 Bad Request"],
                expected_outcome="System rejects quantity over 99.",
                execution_method="pytest",
                generated_code=generate_pytest_module_code("test_cart.py", "test_cart_boundary", "TC-009", "REQ-005", ["AC-02"], "Boundary", "Cart max quantity limit", project.target_url, "HTTP 400 Bad Request", ["POST quantity 100", "Assert 400"]),
                review_status="Approved",
                req_version_at_generation=1
            )
            all_test_cases.append(tc9)

        else:
            # User registration test
            tc10 = TestCase(
                project_id=project.id,
                requirement_id=req.id,
                test_id="TC-010",
                title="Register new user with valid email",
                description="Verifies user registration creates active account.",
                linked_req_id=spec["req_id"],
                linked_criterion_ids=["AC-01"],
                test_type="Positive",
                priority="High",
                preconditions="Email not previously registered.",
                steps=["1. POST /api/v1/auth/register", "2. Assert 201 Created"],
                expected_outcome="User account created successfully.",
                execution_method="pytest",
                generated_code=generate_pytest_module_code("test_reg.py", "test_registration_valid", "TC-010", "REQ-001", ["AC-01"], "Positive", "Register new user with valid email", project.target_url, "HTTP 201 Created", ["POST /register", "Assert 201"]),
                review_status="Approved",
                req_version_at_generation=1
            )
            all_test_cases.append(tc10)

    for tc in all_test_cases:
        db.add(tc)
    db.commit()

    # 3. Create a seeded TestRun with genuine results matching the visual reference
    test_run = TestRun(
        project_id=project.id,
        run_number="RUN-2025-07-26-001",
        status="completed",
        environment="Staging",
        framework="pytest 8.3.2",
        target_url=project.target_url,
        total_tests=len(all_test_cases),
        passed_count=0,
        failed_count=0,
        skipped_count=0,
        error_count=0,
        started_at=datetime.utcnow() - timedelta(minutes=45),
        completed_at=datetime.utcnow() - timedelta(minutes=40, seconds=48),
        duration_ms=4120,
        raw_stdout=(
            "============================= test session starts =============================\n"
            "platform win32 -- Python 3.12.10, pytest-8.3.2, pluggy-1.6.0\n"
            "rootdir: C:\\temp\\spec2test_run_demo\n"
            "collected 10 items\n\n"
            "test_tc_001.py::test_valid_login PASSED                           [ 10%]\n"
            "test_tc_002.py::test_invalid_password PASSED                      [ 20%]\n"
            "test_tc_003.py::test_empty_fields PASSED                          [ 30%]\n"
            "test_tc_004.py::test_account_lockout PASSED                       [ 40%]\n"
            "test_tc_005.py::test_valid_card PASSED                            [ 50%]\n"
            "test_tc_006.py::test_expired_card PASSED                          [ 60%]\n"
            "test_tc_007.py::test_duplicate_payment FAILED                     [ 70%]\n"
            "test_tc_008.py::test_response_time PASSED                         [ 80%]\n"
            "test_tc_009.py::test_cart_boundary PASSED                         [ 90%]\n"
            "test_tc_010.py::test_registration_valid PASSED                    [100%]\n\n"
            "=================================== FAILURES ===================================\n"
            "____________________________ test_duplicate_payment ____________________________\n"
            "    def test_duplicate_payment():\n"
            ">       assert res2.status_code == 409 or (res2.status_code == 200 and res2.json().get('duplicate') is True)\n"
            "E       AssertionError: Duplicate payment verification failed! Expected 409 Conflict or duplicate detection, got 200 with {'charge_id': 'CHG-DUPLICATE-172199', 'status': 'success', 'duplicate': False, 'amount': 149.99}\n"
            "test_tc_007.py:27: AssertionError\n"
            "=========================== 1 failed, 9 passed in 4.12s =========================\n"
        ),
        raw_stderr="",
        exit_code=1
    )
    db.add(test_run)
    db.flush()

    # Add TestResults and EvidenceRecords
    passed = 0
    failed = 0
    for tc in all_test_cases:
        if tc.test_id == "TC-007":
            # Failed duplicate payment
            res = TestResult(
                run_id=test_run.id,
                test_case_id=tc.id,
                status="Failed",
                duration_ms=450,
                assertion_message="Duplicate payment verification failed! Expected 409 Conflict or duplicate detection, got 200 with {'charge_id': 'CHG-DUPLICATE-172199', 'status': 'success', 'duplicate': False, 'amount': 149.99}",
                failure_details="Demo API target processed a duplicate charge without idempotency conflict rejection.",
                stack_trace=(
                    "Traceback (most recent call last):\n"
                    "  File 'test_payment_dup.py', line 27, in test_duplicate_payment\n"
                    "    assert res2.status_code == 409 or (res2.status_code == 200 and res2.json().get('duplicate') is True)\n"
                    "AssertionError: Duplicate payment verification failed! Expected 409 Conflict, got 200"
                ),
                stdout="POST /api/v1/payment/charge HTTP/1.1 200 OK\nPOST /api/v1/payment/charge HTTP/1.1 200 OK (DUPLICATE DETECTED AS NON-IDEMPOTENT)",
                stderr="AssertionError in test_duplicate_payment",
                is_stale=False,
                created_at=test_run.completed_at
            )
            failed += 1
            db.add(res)
            db.flush()

            # Attach evidence records
            db.add(EvidenceRecord(
                test_result_id=res.id,
                evidence_type="assertion_diff",
                title="Idempotency Assertion Failure",
                content="Expected: HTTP 409 Conflict OR response['duplicate'] == True\nReceived: HTTP 200 OK with duplicate=False",
                metadata_json={"order_id": "ORD-9912", "charge_amount": 149.99}
            ))
            db.add(EvidenceRecord(
                test_result_id=res.id,
                evidence_type="stack_trace",
                title="Pytest Execution Stack Trace",
                content=res.stack_trace,
                metadata_json={"line_number": 27, "file": "test_payment_dup.py"}
            ))
        else:
            res = TestResult(
                run_id=test_run.id,
                test_case_id=tc.id,
                status="Passed",
                duration_ms=120,
                assertion_message=None,
                failure_details=None,
                stack_trace=None,
                stdout=f"✓ {tc.title} PASSED in 120ms against {project.target_url}",
                stderr=None,
                is_stale=False,
                created_at=test_run.completed_at
            )
            passed += 1
            db.add(res)
            db.flush()

            db.add(EvidenceRecord(
                test_result_id=res.id,
                evidence_type="stdout_log",
                title=f"Verification Log - {tc.test_id}",
                content=f"Test executed against {project.target_url}.\nAssertions validated in {res.duration_ms}ms.\nStatus: PASSED",
                metadata_json={"target_url": project.target_url, "duration_ms": res.duration_ms}
            ))

    test_run.passed_count = passed
    test_run.failed_count = failed

    # 4. Add Change Impact Record for REQ-003
    # Demonstrating the change shown in screenshot:
    # Old: "Users must be locked out after three failed login attempts."
    # New: "Users must be locked out after five failed attempts within 10 minutes."
    req3 = next((r for r in db.query(Requirement).filter(Requirement.project_id == project.id, Requirement.req_id == "REQ-003").all()), None)
    if req3:
        db.add(ChangeImpactRecord(
            project_id=project.id,
            requirement_id=req3.id,
            old_version=1,
            new_version=2,
            old_text="Users must be locked out after three failed login attempts.",
            new_text="Users must be locked out after five failed attempts within 10 minutes.",
            diff_summary="- Users must be locked out after three failed login attempts.\n+ Users must be locked out after five failed attempts within 10 minutes.",
            affected_test_case_ids=["TC-004"],
            new_test_cases_needed=2,
            tests_to_rerun_count=3,
            stale_results_count=1,
            status="Pending",
            created_at=datetime.utcnow() - timedelta(minutes=25)
        ))

    # 5. Add Activity Events
    activities = [
        ("test_execution", "Test execution completed", "10 tests • 9 passed • 1 failed", timedelta(minutes=2)),
        ("requirement_analyzed", "Requirements analyzed", "Added 8 acceptance criteria with Given/When/Then formulation", timedelta(minutes=12)),
        ("test_generated", "New test cases generated", "Generated executable test cases for REQ-001 through REQ-008", timedelta(minutes=25)),
        ("project_created", "Project created", f"Initialized '{DEMO_PROJECT_NAME}' with sample target endpoint", timedelta(hours=1))
    ]
    for e_type, title, desc, td in activities:
        db.add(ActivityEvent(
            project_id=project.id,
            event_type=e_type,
            title=title,
            description=desc,
            metadata_json={},
            created_at=datetime.utcnow() - td
        ))

    db.commit()
    return project
