import re
import difflib
import json
import logging
from typing import List, Dict, Any, Tuple
from backend.app.schemas.change_impact import AffectedTestSummary
from backend.app.services.ai.provider import ai_provider

logger = logging.getLogger(__name__)

def analyze_impact_deterministic(
    old_text: str,
    new_text: str,
    test_cases: List[Dict[str, Any]]
) -> Tuple[str, List[AffectedTestSummary], int, int]:
    """
    Computes deterministic diff summary, affected tests, new tests needed, tests to rerun.
    """
    # 1. Text diff
    matcher = difflib.SequenceMatcher(None, old_text.strip(), new_text.strip())
    similarity = matcher.ratio()

    diff_lines = list(difflib.unified_diff(
        old_text.splitlines(),
        new_text.splitlines(),
        fromfile="v_current",
        tofile="v_proposed",
        lineterm=""
    ))
    diff_summary = "\n".join(diff_lines) if diff_lines else f"Similarity: {int(similarity * 100)}%"

    # Look for numeric changes (e.g., 3 -> 5, 2s -> 1s)
    old_nums = re.findall(r'\b\d+\b', old_text)
    new_nums = re.findall(r'\b\d+\b', new_text)
    num_change_noted = ""
    if old_nums != new_nums:
        num_change_noted = f"Quantitative parameter modification detected: [{', '.join(old_nums)}] -> [{', '.join(new_nums)}]. "

    # 2. Evaluate affected test cases
    affected_tests: List[AffectedTestSummary] = []
    
    for tc in test_cases:
        t_type = tc.get("test_type", "Positive")
        t_title = tc.get("title", "")
        t_code = tc.get("generated_code", "")
        
        # Check if test involves changed parameters or keywords
        is_affected = False
        action = "review"

        if t_type in ["Security", "Boundary", "Edge Case"]:
            is_affected = True
            action = "regenerate"
        elif any(num in t_code for num in old_nums):
            is_affected = True
            action = "regenerate"
        elif similarity < 0.85:
            is_affected = True
            action = "rerun"

        if is_affected:
            affected_tests.append(AffectedTestSummary(
                test_id=tc.get("test_id", "TC-001"),
                title=t_title,
                test_type=t_type,
                action_required=action,
                current_status=tc.get("latest_status", "Unverified")
            ))

    # New test cases needed (e.g. if time window or new condition was added)
    new_tests_needed = 0
    if ("minute" in new_text.lower() or "window" in new_text.lower()) and ("minute" not in old_text.lower()):
        new_tests_needed += 1
    if len(new_nums) > len(old_nums):
        new_tests_needed += 1
    if new_tests_needed == 0 and len(affected_tests) > 0:
        new_tests_needed = 1

    summary_text = num_change_noted + f"Requirement updated from length {len(old_text)} to {len(new_text)}. {len(affected_tests)} existing test case(s) impacted."

    return summary_text, affected_tests, new_tests_needed, len(affected_tests)

async def analyze_impact(
    old_text: str,
    new_text: str,
    test_cases: List[Dict[str, Any]]
) -> Tuple[str, List[AffectedTestSummary], int, int]:
    # If AI provider configured, optionally augment
    if ai_provider.is_configured:
        try:
            system_prompt = (
                "You are an AI software test impact analyzer. Compare the old requirement with the new requirement. "
                "Identify affected tests, whether they need regeneration or rerun, and how many new tests are needed. "
                "Return JSON with: {\"summary\": \"...\", \"new_tests_needed\": 2, \"affected_test_ids\": [\"TC-001\"]}"
            )
            user_prompt = f"Old: {old_text}\nNew: {new_text}\nTests: {json.dumps([{'id': t.get('test_id'), 'title': t.get('title')} for t in test_cases])}"
            resp = await ai_provider.complete_chat(system_prompt, user_prompt, response_format={"type": "json_object"})
            if resp:
                data = json.loads(resp)
                det_summary, det_affected, _, _ = analyze_impact_deterministic(old_text, new_text, test_cases)
                return data.get("summary", det_summary), det_affected, data.get("new_tests_needed", 1), len(det_affected)
        except Exception as e:
            logger.warning(f"AI impact analysis error: {e}")

    return analyze_impact_deterministic(old_text, new_text, test_cases)
