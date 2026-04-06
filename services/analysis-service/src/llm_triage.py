"""
Tier 3: LLM-powered triage of Tier 1+2 findings.

Reviews existing findings against code context, filters false positives,
and enriches with reasoning. Non-blocking: returns original findings on failure.
"""

import json
import os
import time
from typing import Any, Dict, List, Optional, Tuple

from prometheus_client import Counter, Histogram

# ── Metrics ─────────────────────────────────────────────────────────────

LLM_TRIAGE_REQUESTS = Counter(
    "codesentry_llm_triage_requests_total",
    "Total LLM triage calls",
    ["status"],
)
LLM_TRIAGE_DURATION = Histogram(
    "codesentry_llm_triage_duration_seconds",
    "LLM triage call runtime",
    buckets=[0.5, 1, 2, 5, 10, 20, 30, 60],
)
LLM_TRIAGE_VERDICTS = Counter(
    "codesentry_llm_triage_verdicts_total",
    "Verdicts returned by LLM triage",
    ["verdict"],
)
LLM_TRIAGE_TOKENS = Counter(
    "codesentry_llm_triage_tokens_total",
    "Tokens consumed by LLM triage",
    ["direction"],
)

# ── Configuration ───────────────────────────────────────────────────────

LLM_TRIAGE_MODEL = os.getenv("LLM_TRIAGE_MODEL", "gpt-4o-mini")
LLM_TRIAGE_TIMEOUT = int(os.getenv("LLM_TRIAGE_TIMEOUT_SECONDS", "45"))
LLM_TRIAGE_MAX_FINDINGS = int(os.getenv("LLM_TRIAGE_MAX_FINDINGS", "20"))

SEVERITY_RANK = {"critical": 4, "high": 3, "medium": 2, "low": 1}

SYSTEM_PROMPT = """You are a security code reviewer triaging static analysis findings.

For each finding, you have the detection metadata and the code context from the PR diff.
Assess whether each finding is a true positive, false positive, or uncertain.

Consider:
- Is the flagged code actually reachable with user-controlled input?
- Does a sanitizer, validator, or safe wrapper exist upstream?
- Is this test code, example code, or dead code?
- Could the severity be different than what the tool assigned?

Respond with ONLY a JSON array. Each element must have:
- "fingerprint": the finding's fingerprint (string, copied from input)
- "verdict": one of "true_positive", "false_positive", "uncertain"
- "reasoning": 1-2 sentence explanation
- "adjusted_severity": null or one of "critical", "high", "medium", "low"
- "adjusted_confidence": null or a float 0.0-1.0

Do not include any text outside the JSON array."""


def is_llm_triage_enabled() -> bool:
    return bool(os.getenv("OPENAI_API_KEY"))


def _select_findings_for_triage(
    findings: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Select up to LLM_TRIAGE_MAX_FINDINGS for triage.

    Priority: higher severity + lower confidence = more value from triage.
    """
    scored = []
    for f in findings:
        sev = SEVERITY_RANK.get(str(f.get("severity", "")).lower(), 0)
        conf = float(f.get("confidence", 0.5))
        # High severity + low confidence = highest triage value
        score = sev * 2 + (1 - conf)
        scored.append((score, f))

    scored.sort(key=lambda x: -x[0])
    return [f for _, f in scored[:LLM_TRIAGE_MAX_FINDINGS]]


def _build_finding_context(
    finding: Dict[str, Any],
    file_patches: Dict[str, str],
) -> Dict[str, Any]:
    """Extract minimal context for a single finding."""
    file_path = finding.get("file_path", "")
    patch = file_patches.get(file_path, "")

    # Send at most 60 lines of patch context around the finding
    patch_lines = patch.split("\n") if patch else []
    if len(patch_lines) > 60:
        target_line = finding.get("line_start", 1)
        start = max(0, target_line - 30)
        patch_lines = patch_lines[start:start + 60]

    return {
        "fingerprint": finding.get("fingerprint", ""),
        "rule_id": finding.get("rule_id", ""),
        "title": finding.get("title", ""),
        "severity": finding.get("severity", ""),
        "confidence": finding.get("confidence", 0),
        "cwe_id": finding.get("cwe_id", ""),
        "file_path": file_path,
        "line_start": finding.get("line_start", 0),
        "code_snippet": finding.get("code_snippet", ""),
        "evidence": finding.get("evidence", ""),
        "surrounding_code": "\n".join(patch_lines),
    }


def _build_triage_prompt(
    findings: List[Dict[str, Any]],
    file_patches: Dict[str, str],
) -> str:
    """Build the user prompt with findings and code context."""
    contexts = [_build_finding_context(f, file_patches) for f in findings]
    return "## Findings to triage\n\n" + json.dumps(contexts, indent=2)


def _call_openai(user_prompt: str) -> Tuple[str, int, int]:
    """Call OpenAI API. Returns (response_text, input_tokens, output_tokens)."""
    from openai import OpenAI

    client = OpenAI(timeout=LLM_TRIAGE_TIMEOUT)
    response = client.chat.completions.create(
        model=LLM_TRIAGE_MODEL,
        temperature=0,
        max_tokens=4096,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )

    text = response.choices[0].message.content or ""
    input_tokens = response.usage.prompt_tokens if response.usage else 0
    output_tokens = response.usage.completion_tokens if response.usage else 0
    return text, input_tokens, output_tokens


def _parse_triage_response(
    raw: str,
    valid_fingerprints: set,
) -> List[Dict[str, Any]]:
    """Parse LLM JSON response into verdict list."""
    text = raw.strip()

    # Handle markdown-fenced JSON
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    parsed = json.loads(text)
    if not isinstance(parsed, list):
        return []

    verdicts = []
    for item in parsed:
        fp = item.get("fingerprint", "")
        verdict = item.get("verdict", "")
        if fp not in valid_fingerprints:
            continue
        if verdict not in ("true_positive", "false_positive", "uncertain"):
            continue
        verdicts.append({
            "fingerprint": fp,
            "verdict": verdict,
            "reasoning": str(item.get("reasoning", ""))[:500],
            "adjusted_severity": item.get("adjusted_severity"),
            "adjusted_confidence": item.get("adjusted_confidence"),
        })

    return verdicts


def _apply_verdicts(
    findings: List[Dict[str, Any]],
    verdicts: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Apply LLM verdicts to findings.

    - false_positive: Remove from list
    - true_positive: Boost confidence, apply severity adjustment
    - uncertain: Leave unchanged
    """
    verdict_map = {v["fingerprint"]: v for v in verdicts}
    result = []

    for finding in findings:
        fp = finding.get("fingerprint", "")
        verdict = verdict_map.get(fp)

        if verdict is None:
            result.append(finding)
            continue

        LLM_TRIAGE_VERDICTS.labels(verdict=verdict["verdict"]).inc()

        if verdict["verdict"] == "false_positive":
            continue

        enriched = dict(finding)
        enriched["llm_triage"] = {
            "verdict": verdict["verdict"],
            "reasoning": verdict["reasoning"],
        }

        if verdict["verdict"] == "true_positive":
            enriched["confidence"] = round(min(0.99, float(enriched.get("confidence", 0.5)) + 0.1), 2)

        adj_sev = verdict.get("adjusted_severity")
        if adj_sev in ("critical", "high", "medium", "low"):
            enriched["severity"] = adj_sev

        adj_conf = verdict.get("adjusted_confidence")
        if adj_conf is not None and isinstance(adj_conf, (int, float)) and 0 <= adj_conf <= 1:
            enriched["confidence"] = round(adj_conf, 2)

        result.append(enriched)

    return result


def triage_findings(
    findings: List[Dict[str, Any]],
    file_patches: Dict[str, str],
) -> List[Dict[str, Any]]:
    """Run LLM triage on findings. Non-blocking: returns original findings on failure."""
    if not is_llm_triage_enabled():
        LLM_TRIAGE_REQUESTS.labels(status="skipped").inc()
        return findings

    if not findings:
        return findings

    to_triage = _select_findings_for_triage(findings)
    if not to_triage:
        return findings

    try:
        start = time.perf_counter()

        user_prompt = _build_triage_prompt(to_triage, file_patches)
        raw_response, input_tokens, output_tokens = _call_openai(user_prompt)

        LLM_TRIAGE_TOKENS.labels(direction="input").inc(input_tokens)
        LLM_TRIAGE_TOKENS.labels(direction="output").inc(output_tokens)

        valid_fps = {f.get("fingerprint", "") for f in to_triage}
        verdicts = _parse_triage_response(raw_response, valid_fps)

        result = _apply_verdicts(findings, verdicts)

        duration = time.perf_counter() - start
        LLM_TRIAGE_DURATION.observe(duration)
        LLM_TRIAGE_REQUESTS.labels(status="success").inc()

        triaged_count = len([v for v in verdicts if v["verdict"] == "false_positive"])
        print(f"LLM triage completed: {len(verdicts)} verdicts, {triaged_count} false positives filtered ({duration:.1f}s)")

        return result

    except json.JSONDecodeError as e:
        LLM_TRIAGE_REQUESTS.labels(status="parse_error").inc()
        print(f"LLM triage response not valid JSON (non-blocking): {e}")
        return findings
    except Exception as e:
        LLM_TRIAGE_REQUESTS.labels(status="error").inc()
        print(f"LLM triage failed (non-blocking): {e}")
        return findings
