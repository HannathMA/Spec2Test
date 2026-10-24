import re
import json
import logging
from typing import List, Dict, Any, Tuple
from backend.app.schemas.ai import RequirementAnalysisResult, RawFinding, RawCriterion
from backend.app.services.ai.provider import ai_provider

logger = logging.getLogger(__name__)

AMBIGUOUS_TERMS = {
    "quickly": "No quantitative latency threshold specified (e.g., p95 < 2000ms).",
    "fast": "Subjective speed descriptor without time unit or percentile benchmark.",
    "robust": "Vague resilience claim without specified fault tolerance criteria.",
    "user-friendly": "Non-testable subjective user experience assertion.",
    "secure": "Generic security claim without specific cryptographic or auth standards specified.",
    "as appropriate": "Unspecified conditional branch without clear business rule definition.",
    "sufficient": "Vague quantity without minimum threshold or boundary limit.",
    "real-time": "Lacks specific latency bound (e.g., sub-100ms streaming vs sub-1s polling).",
    "seamless": "Marketing term lacking functional verification criteria.",
    "reasonable": "Subjective term without defined operational bounds."
}

def analyze_requirement_deterministic(title: str, text: str) -> RequirementAnalysisResult:
    findings: List[RawFinding] = []
    suggested_criteria: List[RawCriterion] = []
    lower_text = f"{title} {text}".lower()

    # 1. Ambiguity detection
    for term, reason in AMBIGUOUS_TERMS.items():
        pattern = r'\b' + re.escape(term) + r'\b'
        if re.search(pattern, lower_text):
            findings.append(RawFinding(
                finding_type="ambiguity",
                severity="medium",
                title=f"Ambiguous term '{term}' identified",
                explanation=reason,
                suggested_clarification=f"Replace '{term}' with a measurable metric (e.g., latency, percentage, error code)."
            ))

    # 2. Missing thresholds
    has_speed = any(w in lower_text for w in ["respond", "latency", "load", "throughput", "time", "performance"])
    has_number = bool(re.search(r'\d+\s*(ms|s|sec|seconds|minutes|%)', lower_text))
    if has_speed and not has_number:
        findings.append(RawFinding(
            finding_type="missing_threshold",
            severity="high",
            title="Missing quantitative performance threshold",
            explanation="Requirement refers to performance or response behavior but does not define numeric SLOs/SLAs.",
            suggested_clarification="Specify target threshold, e.g., '95% of requests must respond within 2000ms under standard test load'."
        ))

    # 3. Missing error handling
    if not any(w in lower_text for w in ["error", "invalid", "fail", "reject", "exception", "status code", "denied"]):
        findings.append(RawFinding(
            finding_type="missing_detail",
            severity="medium",
            title="Unspecified error handling and negative paths",
            explanation="Requirement outlines the happy path but omits behavior when input is invalid or service is unavailable.",
            suggested_clarification="Explicitly define HTTP status code (e.g., 400 Bad Request, 401 Unauthorized) and error payload."
        ))

    # 4. Check potential conflicts
    if ("secure" in lower_text or "lock" in lower_text or "protect" in lower_text) and ("guest" in lower_text or "public" in lower_text or "skip" in lower_text):
        findings.append(RawFinding(
            finding_type="conflict",
            severity="high",
            title="Possible conflict: Security vs Unauthenticated access",
            explanation="Requirement mentions security protection alongside guest/unrestricted access without boundary separation.",
            suggested_clarification="Clarify scope of guest permissions and where strict authentication is enforced."
        ))

    # 5. Missing preconditions
    if any(action in lower_text for action in ["checkout", "payment", "delete", "transfer", "lockout"]):
        if not any(pre in lower_text for pre in ["authenticated", "logged in", "when user", "given", "prerequisite", "account exists"]):
            findings.append(RawFinding(
                finding_type="missing_precondition",
                severity="low",
                title="Missing explicit operational preconditions",
                explanation="Critical state-changing action lacks explicit initial state or authentication preconditions.",
                suggested_clarification="Add precondition: 'Given an active authenticated user with a valid payment token'."
            ))

    # Generate Simple, Test-Case-Like Acceptance Criteria (Given / When / Then)
    # 1. Primary Success Path
    suggested_criteria.append(RawCriterion(
        criterion_id="AC-01",
        criterion_text=f"Given valid details for '{title}', When the user submits the request, Then the action completes successfully.",
        format="given_when_then"
    ))

    # 2. Validation / Error Handling Path
    suggested_criteria.append(RawCriterion(
        criterion_id="AC-02",
        criterion_text="Given missing or invalid input, When the user submits the request, Then the system shows a clear error message.",
        format="given_when_then"
    ))

    # 3. Boundary, Limits or Speed Path
    if "lock" in lower_text or "attempt" in lower_text or "limit" in lower_text:
        suggested_criteria.append(RawCriterion(
            criterion_id="AC-03",
            criterion_text="Given 3 wrong attempts, When another attempt is made, Then access is temporarily locked.",
            format="given_when_then"
        ))
    elif has_speed or "response" in lower_text:
        suggested_criteria.append(RawCriterion(
            criterion_id="AC-03",
            criterion_text="Given normal user traffic, When the request is sent, Then the system responds within 2 seconds.",
            format="given_when_then"
        ))
    else:
        suggested_criteria.append(RawCriterion(
            criterion_id="AC-03",
            criterion_text="Given input that exceeds allowed limits, When submitted, Then the system blocks the request with a warning.",
            format="given_when_then"
        ))

    # 4. Security / Access Path
    suggested_criteria.append(RawCriterion(
        criterion_id="AC-04",
        criterion_text="Given the user is not logged in, When trying to access this feature, Then access is denied and login is required.",
        format="given_when_then"
    ))

    # Calculate quality score
    score = 100 - (len(findings) * 8)
    score = max(35, min(95, score))

    summary = f"Identified {len(findings)} potential areas of ambiguity or underspecification. Generated {len(suggested_criteria)} testable Given/When/Then acceptance criteria."

    return RequirementAnalysisResult(
        findings=findings,
        suggested_criteria=suggested_criteria,
        overall_quality_score=score,
        summary=summary
    )

async def analyze_requirement(title: str, text: str) -> RequirementAnalysisResult:
    # Try AI provider if configured
    if ai_provider.is_configured:
        system_prompt = (
            "You are a helpful software testing assistant. "
            "Write simple, clean acceptance criteria just like practical test cases. "
            "Do NOT use complicated technical words or complex jargon (avoid terms like 'payload schema', 'boundary integrity', 'sanitization', 'idempotency mechanisms'). "
            "Keep each criterion simple, direct, and easy to understand using plain English: "
            "Given [simple condition], When [simple action], Then [simple expected outcome]. "
            "Return valid JSON adhering to: "
            "{"
            "  \"findings\": [{\"finding_type\": \"ambiguity|missing_threshold|conflict|missing_detail|non_testable\", \"severity\": \"high|medium|low\", \"title\": \"...\", \"explanation\": \"...\", \"suggested_clarification\": \"...\"}],"
            "  \"suggested_criteria\": [{\"criterion_id\": \"AC-01\", \"criterion_text\": \"Given valid input, When user submits, Then action succeeds.\", \"format\": \"given_when_then\"}],"
            "  \"overall_quality_score\": 85,"
            "  \"summary\": \"...\""
            "}"
        )
        user_prompt = f"Requirement Title: {title}\nRequirement Text: {text}"
        response = await ai_provider.complete_chat(system_prompt, user_prompt, response_format={"type": "json_object"})
        if response:
            try:
                data = json.loads(response)
                findings = [RawFinding(**f) for f in data.get("findings", [])]
                criteria = [RawCriterion(**c) for c in data.get("suggested_criteria", [])]
                score = data.get("overall_quality_score", 85)
                summary = data.get("summary", "Analysis completed via AI Provider.")
                if findings and criteria:
                    return RequirementAnalysisResult(
                        findings=findings,
                        suggested_criteria=criteria,
                        overall_quality_score=score,
                        summary=summary
                    )
            except Exception as e:
                logger.warning(f"Failed to parse LLM analysis response, falling back to deterministic: {e}")

    # Fallback deterministic analysis
    return analyze_requirement_deterministic(title, text)

def regenerate_single_criterion_deterministic(req_title: str, req_text: str, criterion_id: str, current_text: str) -> str:
    cid = criterion_id.upper()
    lower_req = req_text.lower()

    if "01" in cid:
        return f"Given valid input for '{req_title}', When submitted, Then the system completes the action successfully."
    elif "02" in cid:
        return f"Given missing or invalid input for '{req_title}', When submitted, Then the system shows a clear error message."
    elif "03" in cid:
        if "lock" in lower_req or "attempt" in lower_req:
            return f"Given 3 consecutive wrong attempts, When another attempt is made, Then access is temporarily locked."
        elif "latency" in lower_req or "speed" in lower_req or "respond" in lower_req:
            return f"Given normal user activity, When the request is made, Then the system responds in under 2 seconds."
        else:
            return f"Given input exceeding allowed limits, When submitted, Then the system blocks it with a warning."
    elif "04" in cid:
        return f"Given a user is not logged in, When accessing '{req_title}', Then access is denied and login is required."
    else:
        return f"Given valid conditions for '{req_title}', When the user performs the action, Then expected result is achieved."

async def regenerate_single_criterion(req_title: str, req_text: str, criterion_id: str, current_text: str) -> str:
    if ai_provider.is_configured:
        try:
            system_prompt = (
                "You are a helpful software testing assistant. "
                "Write a single simple acceptance criterion formatted as: "
                "Given [simple condition], When [simple action], Then [simple expected outcome]. "
                "Use simple everyday words just like a test case. Do NOT use complicated technical jargon. "
                "Return JSON with format: {\"criterion_text\": \"Given... When... Then...\"}"
            )
            user_prompt = f"Requirement Title: {req_title}\nRequirement Text: {req_text}\nCriterion ID: {criterion_id}\nCurrent text: {current_text}"
            resp = await ai_provider.complete_chat(system_prompt, user_prompt, response_format={"type": "json_object"})
            if resp:
                data = json.loads(resp)
                if data.get("criterion_text"):
                    return data["criterion_text"].strip()
        except Exception as e:
            logger.warning(f"AI single criterion regeneration error: {e}")

    return regenerate_single_criterion_deterministic(req_title, req_text, criterion_id, current_text)
