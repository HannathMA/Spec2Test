import csv
import io
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.models.requirement import Requirement, AcceptanceCriterion
from backend.app.models.test_case import TestCase
from backend.app.models.execution import TestResult, TestRun
from backend.app.schemas.traceability import (
    TraceabilityRow,
    TraceabilityMatrixResponse,
    TraceabilityLinkedCriterion,
    TraceabilityLinkedTest
)

def compute_traceability_matrix(db: Session, project_id: str) -> TraceabilityMatrixResponse:
    """
    Computes rigorous end-to-end traceability matrix:
    Requirement -> Acceptance Criteria -> Test Cases -> Execution Results -> Evidence.
    """
    requirements = db.query(Requirement).filter(Requirement.project_id == project_id).all()

    rows: List[TraceabilityRow] = []
    verified_count = 0
    failed_count = 0
    unverified_count = 0

    for req in requirements:
        # 1. Approved acceptance criteria (strictly approved criteria only)
        criteria = db.query(AcceptanceCriterion).filter(AcceptanceCriterion.requirement_id == req.id).all()
        approved_criteria = [
            c for c in criteria
            if (getattr(c, 'review_status', 'pending') == 'approved') or (c.is_approved and getattr(c, 'review_status', '') != 'rejected')
        ]
        
        linked_criteria_dto = [
            TraceabilityLinkedCriterion(
                criterion_id=c.criterion_id,
                criterion_text=c.criterion_text,
                is_approved=bool(getattr(c, 'review_status', '') == 'approved' or (c.is_approved and getattr(c, 'review_status', '') != 'rejected')),
                review_status=getattr(c, 'review_status', 'approved' if c.is_approved else 'pending')
            ) for c in criteria
        ]

        # 2. Linked test cases
        tests = db.query(TestCase).filter(
            TestCase.project_id == project_id,
            (TestCase.requirement_id == req.id) | (TestCase.linked_req_id == req.req_id)
        ).all()

        linked_tests_dto: List[TraceabilityLinkedTest] = []
        test_statuses = []
        has_stale_tests = False

        for t in tests:
            # Find latest result for this test case
            latest_result = (
                db.query(TestResult)
                .filter(TestResult.test_case_id == t.id)
                .order_by(desc(TestResult.created_at))
                .first()
            )

            status = "Unverified"
            evidence_url = None
            last_run_id = None
            is_stale = t.is_stale

            if latest_result:
                status = latest_result.status
                is_stale = is_stale or latest_result.is_stale
                last_run_id = latest_result.run_id
                evidence_url = f"/api/v1/execution/runs/{latest_result.run_id}/results/{latest_result.id}"

            if is_stale:
                has_stale_tests = True

            test_statuses.append(status)

            linked_tests_dto.append(TraceabilityLinkedTest(
                test_id=t.test_id,
                title=t.title,
                test_type=t.test_type,
                priority=t.priority,
                latest_status=status,
                is_stale=is_stale,
                evidence_url=evidence_url,
                last_run_id=last_run_id
            ))

        # Check coverage gaps
        has_missing_coverage = False
        missing_reason = None
        if len(approved_criteria) == 0:
            has_missing_coverage = True
            missing_reason = "No approved acceptance criteria exist for this requirement."
        elif len(tests) == 0:
            has_missing_coverage = True
            missing_reason = "No test cases have been generated or linked."
        elif len(tests) < len(approved_criteria):
            has_missing_coverage = True
            missing_reason = f"Partial coverage: {len(tests)} test(s) for {len(approved_criteria)} approved criteria."

        # Compute verification state strictly according to policy:
        # - "A requirement may be marked verified only when its required approved criteria have adequate linked test coverage
        #    and all required tests have valid passing evidence from the current relevant versions."
        # - "A requirement is failed when adequate execution evidence demonstrates a requirement violation."
        # - "A requirement remains unverified when no tests, not executed, blocked/errored, lacks coverage, or outdated."
        # - "A mix of passing and failing tests must never be shown as fully verified."

        if any(s == "Failed" for s in test_statuses):
            verification_state = "Failed"
            latest_exec_state = "Failed"
            failed_count += 1
        elif (
            len(tests) > 0
            and len(approved_criteria) > 0
            and not has_missing_coverage
            and not has_stale_tests
            and all(s == "Passed" for s in test_statuses)
        ):
            verification_state = "Verified"
            latest_exec_state = "Passed"
            verified_count += 1
        else:
            verification_state = "Unverified"
            if has_stale_tests:
                latest_exec_state = "Stale"
            elif any(s == "Passed" for s in test_statuses) and any(s in ["Unverified", "Skipped", "Error"] for s in test_statuses):
                latest_exec_state = "Partial"
            elif any(s == "Error" for s in test_statuses):
                latest_exec_state = "Error"
            else:
                latest_exec_state = "Unverified"
            unverified_count += 1

        rows.append(TraceabilityRow(
            requirement_id=req.id,
            req_id=req.req_id,
            title=req.title,
            priority=req.priority,
            approved_criteria_count=len(approved_criteria),
            linked_criteria=linked_criteria_dto,
            linked_test_count=len(tests),
            linked_tests=linked_tests_dto,
            latest_execution_state=latest_exec_state,
            verification_state=verification_state,
            has_missing_coverage=has_missing_coverage,
            missing_coverage_reason=missing_reason,
            has_stale_tests=has_stale_tests
        ))

    total = len(requirements)
    rate = round((verified_count / max(1, total)) * 100, 1) if total > 0 else 0.0

    return TraceabilityMatrixResponse(
        total_requirements=total,
        verified_count=verified_count,
        failed_count=failed_count,
        unverified_count=unverified_count,
        verification_rate=rate,
        rows=rows
    )

def generate_traceability_csv(matrix: TraceabilityMatrixResponse) -> str:
    """Generates clean CSV export."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Requirement ID",
        "Title",
        "Priority",
        "Approved Criteria Count",
        "Linked Tests Count",
        "Linked Test IDs",
        "Execution State",
        "Verification State",
        "Coverage Gaps"
    ])
    for row in matrix.rows:
        test_ids_str = ", ".join([t.test_id for t in row.linked_tests])
        writer.writerow([
            row.req_id,
            row.title,
            row.priority,
            row.approved_criteria_count,
            row.linked_test_count,
            test_ids_str,
            row.latest_execution_state,
            row.verification_state,
            row.missing_coverage_reason or "Complete"
        ])
    return output.getvalue()

def generate_traceability_html(matrix: TraceabilityMatrixResponse, project_name: str) -> str:
    """Generates a clean, print-friendly editorial HTML verification report."""
    rows_html = ""
    for r in matrix.rows:
        badge_color = "#16845B" if r.verification_state == "Verified" else "#D93D3D" if r.verification_state == "Failed" else "#777777"
        tests_str = ", ".join([f"<code>{t.test_id}</code> ({t.latest_status})" for t in r.linked_tests]) or "<em>None</em>"
        rows_html += f"""
        <tr>
            <td style="font-family: monospace; font-weight: bold; border-bottom: 1px solid #D7D6D0; padding: 10px;">{r.req_id}</td>
            <td style="border-bottom: 1px solid #D7D6D0; padding: 10px;">
                <strong>{r.title}</strong>
                <div style="font-size: 11px; color: #777; margin-top: 4px;">{r.missing_coverage_reason or 'Adequate criteria & test linkage'}</div>
            </td>
            <td style="border-bottom: 1px solid #D7D6D0; padding: 10px;">{r.priority}</td>
            <td style="border-bottom: 1px solid #D7D6D0; padding: 10px; text-align: center;">{r.approved_criteria_count}</td>
            <td style="border-bottom: 1px solid #D7D6D0; padding: 10px;">{tests_str}</td>
            <td style="border-bottom: 1px solid #D7D6D0; padding: 10px; text-align: right;">
                <span style="background: {badge_color}; color: #fff; padding: 4px 8px; font-size: 11px; font-weight: bold; text-transform: uppercase;">{r.verification_state}</span>
            </td>
        </tr>
        """

    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Spec2Test AI - Verification Traceability Report</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #F5F4EF; color: #171717; margin: 40px; }}
        .header {{ border-bottom: 2px solid #171717; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }}
        .metrics {{ display: flex; gap: 20px; margin-bottom: 30px; }}
        .metric-card {{ background: #FFFFFF; border: 1px solid #D7D6D0; padding: 16px 24px; min-width: 140px; }}
        .metric-val {{ font-size: 32px; font-weight: bold; line-height: 1; margin-top: 8px; }}
        table {{ width: 100%; border-collapse: collapse; background: #FFFFFF; border: 1px solid #D7D6D0; }}
        th {{ background: #171717; color: #FFFFFF; text-align: left; padding: 12px 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }}
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1 style="margin: 0; font-size: 28px; letter-spacing: -0.5px;">SPEC2TEST AI</h1>
            <div style="font-size: 14px; color: #777; margin-top: 4px;">Requirement Traceability & Verification Report &bull; {project_name}</div>
        </div>
        <div style="text-align: right; font-size: 12px; color: #777;">
            REAL REQUIREMENTS. EXECUTABLE TESTS. VERIFIED SOFTWARE.
        </div>
    </div>

    <div class="metrics">
        <div class="metric-card">
            <div style="font-size: 11px; text-transform: uppercase; color: #777; font-weight: bold;">Verification Rate</div>
            <div class="metric-val" style="color: #365CFF;">{matrix.verification_rate}%</div>
        </div>
        <div class="metric-card">
            <div style="font-size: 11px; text-transform: uppercase; color: #777; font-weight: bold;">Requirements</div>
            <div class="metric-val">{matrix.total_requirements}</div>
        </div>
        <div class="metric-card">
            <div style="font-size: 11px; text-transform: uppercase; color: #777; font-weight: bold;">Verified</div>
            <div class="metric-val" style="color: #16845B;">{matrix.verified_count}</div>
        </div>
        <div class="metric-card">
            <div style="font-size: 11px; text-transform: uppercase; color: #777; font-weight: bold;">Failed</div>
            <div class="metric-val" style="color: #D93D3D;">{matrix.failed_count}</div>
        </div>
        <div class="metric-card">
            <div style="font-size: 11px; text-transform: uppercase; color: #777; font-weight: bold;">Unverified</div>
            <div class="metric-val" style="color: #777777;">{matrix.unverified_count}</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Requirement</th>
                <th>Priority</th>
                <th style="text-align: center;">Criteria</th>
                <th>Linked Tests</th>
                <th style="text-align: right;">Status</th>
            </tr>
        </thead>
        <tbody>
            {rows_html}
        </tbody>
    </table>
</body>
</html>
"""
    return html
