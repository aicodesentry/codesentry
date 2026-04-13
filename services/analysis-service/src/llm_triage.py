"""
Tier 3: LLM-powered triage of Tier 1+2 findings.

Reviews existing findings against code context, filters false positives,
and enriches with reasoning. Non-blocking: returns original findings on failure.
"""

import json
import os
import re
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
LLM_TRIAGE_MAX_FINDINGS = int(os.getenv("LLM_TRIAGE_MAX_FINDINGS", "100"))

SEVERITY_RANK = {"critical": 4, "high": 3, "medium": 2, "low": 1}

SYSTEM_PROMPT = """You are a security code reviewer triaging static analysis findings and proposing minimal inline fixes.

For each finding, you have the detection metadata, the code context from the PR diff, and optionally a repository profile describing the repo's framework, auth patterns, database usage, and security posture.

Use the repository context to make informed decisions:
- If the repo uses parameterized queries, check if THIS specific code follows that pattern or bypasses it.
- If auth middleware exists, check if the affected endpoint has it applied.
- If a validation library is present, check if it covers this input path.

Assess whether each finding is a true positive, false positive, or uncertain.

Consider:
- Is the flagged code actually reachable with user-controlled input?
- Does a sanitizer, validator, or safe wrapper exist upstream?
- Is this test code, example code, or dead code?
- Could the severity be different than what the tool assigned?

When proposing a fix, use the finding metadata, the changed code, and the repository profile together:
- Match the repository's framework, language, and validation/auth/query patterns.
- Prefer the smallest safe replacement that can be applied directly on the changed line or small block.
- Do not invent helper functions, imports, or large refactors unless they already exist in the changed lines.
- If you are not confident the fix can be expressed as a drop-in replacement for the flagged lines, return null for fixed_code.

Respond with ONLY a JSON array. Each element must have:
- "fingerprint": the finding's fingerprint (string, copied from input)
- "verdict": one of "true_positive", "false_positive", "uncertain"
- "reasoning": 1-2 sentence explanation
- "adjusted_severity": null or one of "critical", "high", "medium", "low"
- "adjusted_confidence": null or a float 0.0-1.0
- "exploit_scenario": null or a 1-2 sentence attacker-focused impact path grounded in this code
- "remediation": null or a concise actionable fix recommendation
- "fixed_code": null or the exact replacement code lines (only for true_positive findings where you are confident in the fix)

For fixed_code:
- Match the repo's existing code patterns and conventions
- Provide a drop-in replacement for the flagged lines
- Only include the fixed lines, not surrounding context
- Return at most 8 lines
- Do not wrap the code in markdown fences
- Do not include explanations or comments unless the existing code style already uses them on that line/block

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
        patchable_bonus = 2 if _is_likely_patchable(f) else 0
        # High severity + low confidence = highest triage value
        score = sev * 2 + (1 - conf) + patchable_bonus
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
        "category": finding.get("category", ""),
        "severity": finding.get("severity", ""),
        "confidence": finding.get("confidence", 0),
        "cwe_id": finding.get("cwe_id", ""),
        "file_path": file_path,
        "line_start": finding.get("line_start", 0),
        "line_end": finding.get("line_end", 0),
        "code_snippet": finding.get("code_snippet", ""),
        "evidence": finding.get("evidence", ""),
        "description": finding.get("description", ""),
        "remediation_hint": finding.get("remediation", ""),
        "exploit_scenario": finding.get("exploit_scenario", ""),
        "surrounding_code": "\n".join(patch_lines),
    }


def _normalize_fixed_code(fixed_code: Any, original_snippet: str) -> Optional[str]:
    if fixed_code is None:
        return None

    normalized = str(fixed_code).strip()
    if not normalized:
        return None

    if normalized.startswith("```"):
        parts = normalized.split("```")
        if len(parts) >= 3:
            normalized = parts[1]
            if normalized.startswith("json") or normalized.startswith("javascript") or normalized.startswith("python"):
                normalized = normalized.split("\n", 1)[1] if "\n" in normalized else ""
        normalized = normalized.strip()

    if "```" in normalized:
        return None

    normalized = normalized.replace("\r\n", "\n")
    fixed_lines = normalized.split("\n")
    if len(fixed_lines) > 8:
        return None

    snippet_lines = [line for line in str(original_snippet or "").split("\n") if line.strip()]
    if len(fixed_lines) > max(1, len(snippet_lines)) + 3:
        return None

    return normalized[:2000]


def _normalize_text(value: Any, max_length: int = 500) -> Optional[str]:
    if value is None:
        return None

    normalized = str(value).strip()
    if not normalized:
        return None

    normalized = normalized.replace("\r\n", "\n")
    if normalized.startswith("```"):
        parts = normalized.split("```")
        if len(parts) >= 3:
            normalized = parts[1]
            if "\n" in normalized:
                normalized = normalized.split("\n", 1)[1]
        normalized = normalized.strip()

    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized[:max_length] if normalized else None


def _env_key_for_identifier(identifier: str) -> str:
    raw = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", str(identifier or ""))
    cleaned = re.sub(r"[^A-Za-z0-9]+", "_", raw).strip("_")
    return (cleaned or "SECRET").upper()


def _infer_language(file_path: str) -> str:
    path = str(file_path or "").lower()
    if path.endswith((".js", ".jsx", ".ts", ".tsx")):
        return "javascript"
    if path.endswith(".py"):
        return "python"
    if path.endswith(".go"):
        return "go"
    if path.endswith(".java"):
        return "java"
    if path.endswith(".cs"):
        return "csharp"
    if path.endswith(".rb"):
        return "ruby"
    return ""


def _fallback_secret_fix(snippet: str, language: str) -> Optional[str]:
    line = str(snippet or "").strip()
    if not line or "=" not in line:
        return None

    match = re.match(r"^(?P<prefix>.*?\b(?P<name>[A-Za-z_][A-Za-z0-9_]*)\s*=\s*)(?P<quote>['\"])(?P<value>.+?)(?P=quote)\s*;?$", line)
    if not match:
        return None

    prefix = match.group("prefix")
    env_key = _env_key_for_identifier(match.group("name"))
    suffix = ";" if line.endswith(";") else ""

    replacements = {
        "javascript": f"{prefix}process.env.{env_key}{suffix}",
        "java": f"{prefix}System.getenv(\"{env_key}\"){suffix}",
        "csharp": f"{prefix}Environment.GetEnvironmentVariable(\"{env_key}\"){suffix}",
        "ruby": f'{prefix}ENV["{env_key}"]{suffix}',
    }

    return replacements.get(language)


def _fallback_eval_fix(snippet: str, language: str) -> Optional[str]:
    line = str(snippet or "").strip()
    if not line:
        return None

    if language == "javascript":
        if re.search(r"\beval\s*\(", line):
            return re.sub(r"\beval\s*\((.+)\)\s*;?$", r"JSON.parse(\1);", line)
        if re.search(r"\bnew\s+Function\s*\(", line):
            return None

    if language == "python" and re.search(r"\beval\s*\(", line):
        return re.sub(r"\beval\s*\((.+)\)\s*$", r"json.loads(\1)", line)

    return None


def _fallback_command_injection_fix(snippet: str, language: str) -> Optional[str]:
    line = str(snippet or "").strip()
    if not line:
        return None

    if language == "javascript":
        if re.search(r"\bexec\s*\(\s*req\.", line):
            return 'return res.status(400).json({ error: "Refusing to execute user-controlled commands" });'
        ping_concat = re.search(r'exec\s*\(\s*"ping\s+"\s*\+\s*([A-Za-z_][A-Za-z0-9_\.]*)\s*\)\s*;?$', line)
        if ping_concat:
            host = ping_concat.group(1)
            return f'execFile("ping", [{host}]);'

    if language == "java":
        ping_concat = re.search(r'Runtime\.getRuntime\(\)\.exec\(\s*"ping\s+"\s*\+\s*([A-Za-z_][A-Za-z0-9_\.]*)\s*\)\s*;?$', line)
        if ping_concat:
            host = ping_concat.group(1)
            return f'Runtime.getRuntime().exec(new String[]{{"ping", {host}}});'

    if language == "ruby" and re.search(r"\bexec\s*\(", line):
        return 'raise ArgumentError, "Refusing to execute user-controlled commands"'

    return None


def _fallback_xss_fix(snippet: str, language: str) -> Optional[str]:
    line = str(snippet or "").strip()
    if not line or language != "javascript":
        return None

    if ".innerHTML =" in line:
        return line.replace(".innerHTML =", ".textContent =", 1)

    if re.search(r"\bdocument\.write\s*\(", line):
        return re.sub(r"\bdocument\.write\s*\((.+)\)\s*;?$", r"document.body.textContent = \1;", line)

    return None


def _fallback_sql_fix(snippet: str, language: str) -> Optional[str]:
    line = str(snippet or "").strip()
    if "+" not in line:
        return None

    string_concat = re.search(r'"(?P<query>SELECT .*?)"\s*\+\s*(?P<var>[A-Za-z_][A-Za-z0-9_\.]*)', line, re.IGNORECASE)
    if not string_concat:
        return None

    query = string_concat.group("query")
    variable = string_concat.group("var").strip()

    if language == "javascript":
        return re.sub(
            r'"SELECT .*?"\s*\+\s*[A-Za-z_][A-Za-z0-9_\.]*',
            f'"{query}?", [{variable}]',
            line,
            count=1,
            flags=re.IGNORECASE,
        )

    if language == "go":
        return re.sub(
            r'"SELECT .*?"\s*\+\s*[A-Za-z_][A-Za-z0-9_\.]*',
            f'"{query}?", {variable}',
            line,
            count=1,
            flags=re.IGNORECASE,
        )

    if language == "java":
        conn_match = re.search(r"\b(\w+)\s*\)\s*;?$", line)
        conn_var = conn_match.group(1) if conn_match and conn_match.group(1) != variable else "conn"
        return "\n".join([
            f'PreparedStatement stmt = {conn_var}.prepareStatement("{query}?");',
            f"stmt.setString(1, {variable});",
            "stmt.executeQuery();",
        ])

    if language == "csharp":
        conn_match = re.search(r",\s*(\w+)\s*\)\s*;?$", line)
        conn_var = conn_match.group(1) if conn_match else "conn"
        return "\n".join([
            f'var cmd = new SqlCommand("{query}@id", {conn_var});',
            f'cmd.Parameters.AddWithValue("@id", {variable});',
        ])

    return None


def _build_fallback_fixed_code(
    finding: Dict[str, Any],
) -> Optional[str]:
    language = _infer_language(finding.get("file_path", ""))
    snippet = str(finding.get("code_snippet", "")).strip()
    rule_id = str(finding.get("rule_id", ""))
    category = str(finding.get("category", "")).lower()
    cwe_id = str(finding.get("cwe_id", "")).upper()

    if not snippet:
        return None

    if rule_id == "sql.injection.raw_query" or category == "sql injection" or cwe_id == "CWE-89":
        return _fallback_sql_fix(snippet, language)

    if "secret" in rule_id or "hardcoded secret" in str(finding.get("title", "")).lower() or cwe_id == "CWE-798":
        return _fallback_secret_fix(snippet, language)

    if "eval" in rule_id or cwe_id in {"CWE-94", "CWE-95"}:
        return _fallback_eval_fix(snippet, language)

    if "command injection" in category or "exec" in rule_id or cwe_id == "CWE-78":
        return _fallback_command_injection_fix(snippet, language)

    if category == "code injection":
        return _fallback_command_injection_fix(snippet, language) or _fallback_eval_fix(snippet, language)

    if "xss" in category or "cross-site scripting" in str(finding.get("title", "")).lower() or cwe_id == "CWE-79":
        return _fallback_xss_fix(snippet, language)

    return None


def _is_likely_patchable(finding: Dict[str, Any]) -> bool:
    return _build_fallback_fixed_code(finding) is not None


def _build_fallback_exploit_scenario(finding: Dict[str, Any]) -> Optional[str]:
    category = str(finding.get("category", "")).lower()
    title = str(finding.get("title", "")).lower()
    cwe_id = str(finding.get("cwe_id", "")).upper()

    if "sql" in category or cwe_id == "CWE-89":
        return "An attacker who controls this input can alter the SQL query and read or modify unintended database records."

    if "xss" in category or "cross-site scripting" in title or cwe_id == "CWE-79":
        return "An attacker can inject script into rendered output and execute code in another user's browser session."

    if "code injection" in category or "eval" in title or cwe_id == "CWE-94":
        return "An attacker who reaches this path with controlled input may execute unintended code within the application context."

    if "secret" in category or cwe_id == "CWE-798":
        return "If this secret is exposed through the repository, logs, or build artifacts, an attacker can reuse it to access protected systems."

    if "path traversal" in category or cwe_id == "CWE-22":
        return "An attacker can manipulate the path input to read or overwrite files outside the intended directory."

    return "If attacker-controlled input reaches this code path, it may trigger the vulnerable behavior and impact confidentiality, integrity, or availability."


def _build_fallback_remediation(finding: Dict[str, Any]) -> Optional[str]:
    existing = _normalize_text(finding.get("remediation"), max_length=300)
    if existing:
        return existing

    category = str(finding.get("category", "")).lower()
    cwe_id = str(finding.get("cwe_id", "")).upper()

    if "sql" in category or cwe_id == "CWE-89":
        return "Use parameterized queries and avoid building SQL with string concatenation."

    if "xss" in category or cwe_id == "CWE-79":
        return "Encode or sanitize untrusted output before rendering it in the browser."

    if "code injection" in category or cwe_id == "CWE-94":
        return "Remove dynamic code execution and parse or validate untrusted input with a safe alternative."

    if "secret" in category or cwe_id == "CWE-798":
        return "Move the secret into environment or secret-manager configuration and rotate the exposed credential."

    if "path traversal" in category or cwe_id == "CWE-22":
        return "Validate the requested path against an allowlist and resolve it within a fixed base directory."

    return "Replace the unsafe pattern with a validated, framework-consistent safe alternative."


def _build_triage_prompt(
    findings: List[Dict[str, Any]],
    file_patches: Dict[str, str],
    repo_profile: Optional[Dict[str, Any]] = None,
) -> str:
    """Build the user prompt with findings, code context, and repo profile."""
    parts = []

    if repo_profile and (repo_profile.get("deterministic") or repo_profile.get("interpreted")):
        det = repo_profile.get("deterministic", {})
        interp = repo_profile.get("interpreted", {})
        parts.append("## Repository Profile\n")
        if det.get("framework"):
            parts.append(f"- Framework: {det['framework']}")
        if det.get("languages"):
            parts.append(f"- Languages: {', '.join(det['languages'])}")
        if det.get("database"):
            parts.append(f"- Database: {json.dumps(det['database'])}")
        if det.get("security_libraries"):
            libs = [f"{l['library']} ({l['purpose']})" for l in det["security_libraries"]]
            parts.append(f"- Security libraries: {', '.join(libs)}")
        if interp.get("auth_strategy"):
            parts.append(f"- Auth: {interp['auth_strategy']}")
        if interp.get("database_pattern"):
            parts.append(f"- Query pattern: {interp['database_pattern']}")
        if interp.get("risk_areas"):
            parts.append(f"- Risk areas: {', '.join(interp['risk_areas'])}")
        parts.append("")

    contexts = [_build_finding_context(f, file_patches) for f in findings]
    parts.append("## Findings to triage\n\n" + json.dumps(contexts, indent=2))

    return "\n".join(parts)


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

        fixed_code = (
            item.get("fixed_code")
            or item.get("remediation_patch")
            or item.get("remediationPatch")
            or item.get("suggested_patch")
            or item.get("patch")
        )

        verdicts.append({
            "fingerprint": fp,
            "verdict": verdict,
            "reasoning": str(item.get("reasoning", ""))[:500],
            "adjusted_severity": item.get("adjusted_severity"),
            "adjusted_confidence": item.get("adjusted_confidence"),
            "exploit_scenario": (
                item.get("exploit_scenario")
                or item.get("exploitScenario")
                or item.get("attack_scenario")
                or item.get("impact")
            ),
            "remediation": (
                item.get("remediation")
                or item.get("recommendation")
                or item.get("recommended_fix")
                or item.get("fix")
            ),
            "fixed_code": fixed_code,
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

        exploit_scenario = _normalize_text(verdict.get("exploit_scenario"))
        if exploit_scenario:
            enriched["exploit_scenario"] = exploit_scenario
        elif not _normalize_text(enriched.get("exploit_scenario")):
            enriched["exploit_scenario"] = _build_fallback_exploit_scenario(enriched)

        remediation = _normalize_text(verdict.get("remediation"), max_length=300)
        if remediation:
            enriched["remediation"] = remediation
        elif not _normalize_text(enriched.get("remediation"), max_length=300):
            enriched["remediation"] = _build_fallback_remediation(enriched)

        fixed_code = _normalize_fixed_code(verdict.get("fixed_code"), finding.get("code_snippet", ""))
        if not fixed_code and verdict["verdict"] == "true_positive":
            fixed_code = _normalize_fixed_code(
                _build_fallback_fixed_code(finding),
                finding.get("code_snippet", ""),
            )
        if fixed_code and verdict["verdict"] == "true_positive":
            enriched["remediation_patch"] = fixed_code

        result.append(enriched)

    return result


def triage_findings(
    findings: List[Dict[str, Any]],
    file_patches: Dict[str, str],
    repo_profile: Optional[Dict[str, Any]] = None,
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

        user_prompt = _build_triage_prompt(to_triage, file_patches, repo_profile)
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
