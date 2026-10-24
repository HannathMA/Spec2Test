import os
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.main import app
from backend.app.db.base import Base
from backend.app.db.session import get_db
from backend.app.demo.seed_data import seed_demo_data
from backend.app.models.project import Project
from backend.app.models.requirement import Requirement
from backend.app.models.test_case import TestCase as DbTestCase
from backend.app.models.execution import TestResult as DbTestResult
from backend.app.services.ai.analyzer import analyze_requirement_deterministic
from backend.app.services.ai.impact_analyzer import analyze_impact_deterministic
from backend.app.services.execution.safety import validate_target_url
from backend.app.services.traceability.service import compute_traceability_matrix

# Ensure data dir exists
data_dir = Path(__file__).resolve().parent.parent / "data"
data_dir.mkdir(parents=True, exist_ok=True)
test_db_path = data_dir / "test_spec2test.db"

TEST_DATABASE_URL = f"sqlite:///{test_db_path.as_posix()}"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_demo_data(db, force_reset=True)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)
    if test_db_path.exists():
        try:
            test_db_path.unlink()
        except Exception:
            pass

@pytest.fixture
def client():
    return TestClient(app)

def test_health_check(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "version" in data

def test_demo_project_seeded(client):
    res = client.get("/api/v1/projects")
    assert res.status_code == 200
    projects = res.json()
    assert len(projects) >= 1
    demo = next((p for p in projects if p["name"] == "Commerce API Verification"), None)
    assert demo is not None
    assert demo["environment"] == "Staging"

def test_deterministic_ambiguity_analysis():
    text = "The service must respond quickly and be user-friendly."
    res = analyze_requirement_deterministic("Speed requirement", text)
    assert len(res.findings) >= 2
    types = [f.finding_type for f in res.findings]
    assert "ambiguity" in types
    assert len(res.suggested_criteria) >= 2
    assert res.suggested_criteria[0].format == "given_when_then"

def test_create_and_version_requirement(client):
    db = TestingSessionLocal()
    proj = db.query(Project).first()
    db.close()

    payload = {
        "project_id": proj.id,
        "title": "Refund Processing SLA",
        "original_text": "Refunds should be issued quickly upon return confirmation.",
        "priority": "High"
    }
    res = client.post("/api/v1/requirements", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["req_id"].startswith("REQ-")
    assert data["current_version"] == 1
    assert len(data["findings"]) > 0
    assert len(data["acceptance_criteria"]) > 0

    req_id = data["id"]

    # Update requirement text -> triggers version increment and invalidates tests
    update_payload = {
        "original_text": "Refunds must be processed within 48 hours of return receipt.",
        "change_summary": "Quantified SLA threshold to 48 hours."
    }
    up_res = client.put(f"/api/v1/requirements/{req_id}", json=update_payload)
    assert up_res.status_code == 200
    up_data = up_res.json()
    assert up_data["current_version"] == 2
    assert len(up_data["versions"]) >= 2

def test_test_case_generation_and_coverage(client):
    db = TestingSessionLocal()
    proj = db.query(Project).first()
    db.close()

    # Generate test cases
    gen_payload = {
        "project_id": proj.id,
        "overwrite_existing": False
    }
    res = client.post("/api/v1/test-cases/generate", json=gen_payload)
    assert res.status_code == 200
    tests = res.json()
    assert len(tests) >= 5

    types = {t["test_type"] for t in tests}
    assert "Positive" in types
    assert "Negative" in types

def test_traceability_matrix_strict_rules(client):
    db = TestingSessionLocal()
    proj = db.query(Project).first()
    db.close()

    res = client.get(f"/api/v1/traceability/matrix?project_id={proj.id}")
    assert res.status_code == 200
    matrix = res.json()
    assert matrix["total_requirements"] > 0
    assert "verification_rate" in matrix

    # Verify that a requirement with a failing test is classified as Failed
    failed_rows = [r for r in matrix["rows"] if r["verification_state"] == "Failed"]
    assert len(failed_rows) >= 1
    for fr in failed_rows:
        # Must have at least one failed test in linked tests
        assert any(t["latest_status"] == "Failed" for t in fr["linked_tests"])

def test_traceability_export(client):
    db = TestingSessionLocal()
    proj = db.query(Project).first()
    db.close()

    csv_res = client.get(f"/api/v1/traceability/export/csv?project_id={proj.id}")
    assert csv_res.status_code == 200
    assert "Requirement ID" in csv_res.text

    html_res = client.get(f"/api/v1/traceability/export/html?project_id={proj.id}")
    assert html_res.status_code == 200
    assert "SPEC2TEST AI" in html_res.text

def test_change_impact_detection_and_approval(client):
    db = TestingSessionLocal()
    proj = db.query(Project).first()
    req = db.query(Requirement).filter(Requirement.project_id == proj.id, Requirement.req_id == "REQ-003").first()
    db.close()

    analyze_payload = {
        "requirement_id": req.id,
        "new_text": "Users must be locked out after five failed attempts within 10 minutes."
    }
    res = client.post("/api/v1/change-impact/analyze", json=analyze_payload)
    assert res.status_code == 200
    impact = res.json()
    assert impact["affected_test_cases_count"] >= 1
    assert impact["new_test_cases_needed"] >= 1
    assert impact["stale_results_count"] >= 1

    # Approve the change
    approve_payload = {
        "impact_record_id": impact["record_id"],
        "requirement_id": req.id,
        "new_text": analyze_payload["new_text"],
        "auto_regenerate_tests": True
    }
    appr_res = client.post("/api/v1/change-impact/approve", json=approve_payload)
    assert appr_res.status_code == 200
    appr_data = appr_res.json()
    assert appr_data["status"] == "Applied"

def test_execution_safety_validation():
    assert validate_target_url("http://127.0.0.1:8000/demo-target") is True
    assert validate_target_url("https://api.example.com") is True
    # Disallow cloud metadata endpoints
    assert validate_target_url("http://169.254.169.254/latest/meta-data/") is False
    assert validate_target_url("ftp://malicious.com") is False
    assert validate_target_url("") is False

def test_developer_review_workflow_and_persistence(client):
    db = TestingSessionLocal()
    proj = db.query(Project).first()
    db.close()

    # 1. Create requirement with AI criteria
    payload = {
        "project_id": proj.id,
        "title": "Two-Factor Auth Verification",
        "original_text": "Users must enter a 6-digit OTP sent via SMS to verify their session within 5 minutes.",
        "priority": "High"
    }
    res = client.post("/api/v1/requirements", json=payload)
    assert res.status_code == 201
    req = res.json()
    req_id = req["id"]
    criteria = req["acceptance_criteria"]
    assert len(criteria) >= 2

    # All criteria start in "pending" status
    for c in criteria:
        assert c["review_status"] == "pending"
        assert c["is_approved"] is False

    crit_1 = criteria[0]
    crit_2 = criteria[1]

    # 2. Approve crit_1
    appr_res = client.put(f"/api/v1/requirements/criteria/{crit_1['id']}", json={"review_status": "approved"})
    assert appr_res.status_code == 200
    appr_data = appr_res.json()
    assert appr_data["review_status"] == "approved"
    assert appr_data["is_approved"] is True

    # 3. Reject crit_2
    rej_res = client.put(f"/api/v1/requirements/criteria/{crit_2['id']}", json={"review_status": "rejected"})
    assert rej_res.status_code == 200
    rej_data = rej_res.json()
    assert rej_data["review_status"] == "rejected"
    assert rej_data["is_approved"] is False

    # 4. Edit crit_1 text
    edited_text = "Given an active OTP session, When the user enters the verified 6-digit OTP within 300 seconds, Then session is authenticated."
    edit_res = client.put(f"/api/v1/requirements/criteria/{crit_1['id']}", json={"criterion_text": edited_text})
    assert edit_res.status_code == 200
    assert edit_res.json()["criterion_text"] == edited_text
    assert edit_res.json()["review_status"] == "approved"

    # 5. Regenerate crit_2 -> text changes and status resets to pending
    regen_res = client.post(f"/api/v1/requirements/criteria/{crit_2['id']}/regenerate")
    assert regen_res.status_code == 200
    regen_data = regen_res.json()
    assert regen_data["review_status"] == "pending"
    assert regen_data["is_approved"] is False
    assert len(regen_data["criterion_text"]) > 10

    # 6. Add custom criterion
    new_crit_res = client.post(
        f"/api/v1/requirements/{req_id}/criteria",
        json={"criterion_text": "Given expired OTP, When submitted, Then system rejects with HTTP 401."}
    )
    assert new_crit_res.status_code == 201
    new_crit = new_crit_res.json()
    assert new_crit["review_status"] == "pending"

    # 7. Verify persistence by re-fetching requirement from DB
    get_res = client.get(f"/api/v1/requirements/{req_id}")
    assert get_res.status_code == 200
    fetched_req = get_res.json()
    fetched_crits = fetched_req["acceptance_criteria"]
    c1_fetched = next(c for c in fetched_crits if c["id"] == crit_1["id"])
    assert c1_fetched["review_status"] == "approved"
    assert c1_fetched["criterion_text"] == edited_text

def test_only_approved_criteria_generate_tests(client):
    db = TestingSessionLocal()
    proj = db.query(Project).first()
    db.close()

    # Create requirement with unapproved criteria
    payload = {
        "project_id": proj.id,
        "title": "Strict Developer Gate Requirement",
        "original_text": "System must prevent brute force guessing on account passwords.",
        "priority": "High"
    }
    res = client.post("/api/v1/requirements", json=payload)
    assert res.status_code == 201
    req = res.json()
    req_id = req["id"]
    req_code = req["req_id"]

    # Reject all criteria
    for c in req["acceptance_criteria"]:
        client.put(f"/api/v1/requirements/criteria/{c['id']}", json={"review_status": "rejected"})

    # Attempt test generation with overwrite
    gen_res = client.post(
        "/api/v1/test-cases/generate",
        json={"project_id": proj.id, "overwrite_existing": False}
    )
    assert gen_res.status_code == 200
    all_tests = gen_res.json()

    # NO tests should exist for this requirement because 0 criteria were approved!
    req_tests = [t for t in all_tests if t.get("requirement_id") == req_id or t.get("linked_req_id") == req_code]
    assert len(req_tests) == 0, f"Expected 0 tests for requirement with no approved criteria, got {len(req_tests)}"

    # Now approve ONE criterion
    first_crit = req["acceptance_criteria"][0]
    client.put(f"/api/v1/requirements/criteria/{first_crit['id']}", json={"review_status": "approved"})

    # Regenerate tests
    gen_res_2 = client.post(
        "/api/v1/test-cases/generate",
        json={"project_id": proj.id, "overwrite_existing": False}
    )
    assert gen_res_2.status_code == 200
    updated_tests = gen_res_2.json()

    req_tests_after = [t for t in updated_tests if t.get("requirement_id") == req_id or t.get("linked_req_id") == req_code]
    assert len(req_tests_after) > 0, "Expected tests to be generated after approving criterion"

    # Verify that linked_criterion_ids only includes the approved criterion
    for tc in req_tests_after:
        for cid in tc["linked_criterion_ids"]:
            assert cid == first_crit["criterion_id"]

