import hashlib
import os
import time
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.responses import Response

from security_rules import DEPENDENCY_RISK_PATTERNS, SECURITY_RULES, likely_llm_repo
from semgrep_runner import run_semgrep


class ChangedFile(BaseModel):
    path: str
    patch: str = ""
    additions: int = 0
    deletions: int = 0
    status: str = "modified"


class AnalyzePRRequest(BaseModel):
    repository_full_name: str
    pull_request_number: int
    commit_sha: str
    files: List[ChangedFile] = Field(default_factory=list)


REQUEST_COUNT = Counter("codesentry_analysis_requests_total", "Total analysis requests")
FINDING_COUNT = Counter(
    "codesentry_analysis_findings_total",
    "Findings by category and severity",
    ["category", "severity"],
)
ANALYSIS_DURATION = Histogram(
    "codesentry_analysis_duration_seconds",
    "Analysis runtime",
    buckets=[0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20],
)

app = FastAPI(title="CodeSentry Analysis Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173"), "http://localhost:5173", "http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


def require_internal_auth(request: Request) -> None:
    expected = (
        os.getenv("ANALYSIS_SERVICE_INTERNAL_SECRET")
        or os.getenv("GITHUB_SERVICE_INTERNAL_SECRET")
    )
    if not expected:
        raise HTTPException(status_code=503, detail="Internal analysis auth is not configured")

    provided = request.headers.get("x-internal-secret", "")
    if provided != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


def code_snippet_from_patch(patch: str, max_lines: int = 12) -> str:
    if not patch:
        return ""
    lines = [line for line in patch.split("\n") if line.startswith("+") and not line.startswith("+++")]
    if not lines:
        lines = patch.split("\n")[:max_lines]
    return "\n".join(lines[:max_lines])


def make_fingerprint(rule_id: str, path: str, line_start: int, snippet: str) -> str:
    raw = f"{rule_id}|{path}|{line_start}|{snippet.strip()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def detect_line_number(patch: str, pattern) -> int:
    if not patch:
        return 1

    lines = patch.split("\n")
    for idx, line in enumerate(lines, start=1):
        if pattern.search(line):
            return idx
    return 1


def generate_finding(rule, file_path: str, patch: str) -> Dict[str, Any]:
    snippet = code_snippet_from_patch(patch)
    line_start = detect_line_number(patch, rule.pattern)

    return {
        "rule_id": rule.rule_id,
        "title": rule.title,
        "description": rule.description,
        "category": rule.category,
        "cwe_id": rule.cwe_id,
        "owasp_category": rule.owasp_category,
        "severity": rule.severity,
        "confidence": round(rule.confidence, 2),
        "exploitability": rule.exploitability,
        "file_path": file_path,
        "line_start": line_start,
        "line_end": line_start,
        "code_snippet": snippet,
        "evidence": f"Matched deterministic rule `{rule.rule_id}` in changed content.",
        "exploit_scenario": "If attacker-controlled input reaches this code path, they may execute the vulnerable behavior.",
        "remediation": rule.remediation,
        "remediation_patch": "",
        "fingerprint": make_fingerprint(rule.rule_id, file_path, line_start, snippet),
    }


def dependency_findings(path: str, patch: str) -> List[Dict[str, Any]]:
    findings = []
    if not any(name in path.lower() for name in ["package.json", "requirements", "poetry.lock", "pom.xml", "go.mod"]):
        return findings

    for pattern, message, severity in DEPENDENCY_RISK_PATTERNS:
        if pattern.search(patch):
            line_start = detect_line_number(patch, pattern)
            snippet = code_snippet_from_patch(patch)
            findings.append(
                {
                    "rule_id": "dependency.risk.version",
                    "title": "Potential vulnerable dependency version",
                    "description": message,
                    "category": "dependency/package risk",
                    "cwe_id": "CWE-1104",
                    "owasp_category": "A06:2021",
                    "severity": severity,
                    "confidence": 0.74,
                    "exploitability": "medium",
                    "file_path": path,
                    "line_start": line_start,
                    "line_end": line_start,
                    "code_snippet": snippet,
                    "evidence": "Dependency declaration matches known risky version pattern.",
                    "exploit_scenario": "Exploitation depends on vulnerable code path usage and package exposure.",
                    "remediation": "Upgrade to a patched package version and verify lockfile resolution.",
                    "remediation_patch": "",
                    "fingerprint": make_fingerprint("dependency.risk.version", path, line_start, snippet),
                }
            )

    return findings


@app.middleware("http")
async def track_latency(request: Request, call_next):
    REQUEST_COUNT.inc()
    start = time.perf_counter()
    response = await call_next(request)
    ANALYSIS_DURATION.observe(time.perf_counter() - start)
    return response


@app.get("/health")
async def health():
    return {"status": "ok", "service": "analysis-service"}


@app.get("/metrics")
async def metrics(request: Request):
    require_internal_auth(request)
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/analyze/pr")
async def analyze_pr(payload: AnalyzePRRequest, request: Request):
    require_internal_auth(request)
    if len(payload.files) > 300:
        raise HTTPException(status_code=413, detail="Too many files in PR payload")

    findings: List[Dict[str, Any]] = []

    repo_has_llm_flow = any(likely_llm_repo(f.path, f.patch) for f in payload.files)

    for changed_file in payload.files:
        path = changed_file.path
        patch = changed_file.patch or ""

        if len(patch) > 200_000:
            continue

        for rule in SECURITY_RULES:
            if rule.category == "unsafe LLM/prompt injection patterns" and not repo_has_llm_flow:
                continue
            if rule.pattern.search(patch):
                findings.append(generate_finding(rule, path, patch))

        findings.extend(dependency_findings(path, patch))

    # Tier 2: Semgrep AST analysis
    try:
        semgrep_files = [{"path": f.path, "patch": f.patch} for f in payload.files]
        semgrep_findings = run_semgrep(semgrep_files)
        findings.extend(semgrep_findings)
    except Exception as e:
        print(f"Semgrep analysis failed (non-blocking): {e}")

    # Deduplicate by fingerprint (Tier 1 wins on conflicts since it runs first).
    unique = {}
    for finding in findings:
        unique[finding["fingerprint"]] = finding

    normalized = list(unique.values())
    for finding in normalized:
        FINDING_COUNT.labels(finding["category"], finding["severity"]).inc()

    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    normalized.sort(key=lambda f: (severity_order.get(f["severity"], 99), -f["confidence"]))

    return {
        "repository_full_name": payload.repository_full_name,
        "pull_request_number": payload.pull_request_number,
        "commit_sha": payload.commit_sha,
        "files_analyzed": len(payload.files),
        "findings": normalized,
    }


@app.get("/")
async def root():
    return {"service": "analysis-service", "version": "1.0.0", "status": "ok"}
