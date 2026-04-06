"""
Tier 2: Semgrep-based AST analysis runner.

Writes PR diff files to a temp directory, runs Semgrep with custom rules,
and returns findings in the same format as Tier 1 (security_rules.py).
"""

import hashlib
import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional
from finding_quality import is_transcript_artifact_line
from taxonomy import build_taxonomy_metadata

RULES_DIR = Path(__file__).parent / "semgrep_rules"

# Map Semgrep severity to our severity levels
SEVERITY_MAP = {
    "ERROR": "critical",
    "WARNING": "high",
    "INFO": "medium",
}


def make_fingerprint(rule_id: str, path: str, line: int, snippet: str) -> str:
    raw = f"{rule_id}|{path}|{line}|{snippet.strip()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _extract_file_content(patch: str) -> str:
    """Extract added lines from a unified diff patch."""
    if not patch:
        return ""
    lines = []
    for line in patch.split("\n"):
        if line.startswith("+") and not line.startswith("+++"):
            candidate = line[1:]
            if not is_transcript_artifact_line(candidate):
                lines.append(candidate)
        elif not line.startswith("-") and not line.startswith("@@"):
            if not is_transcript_artifact_line(line):
                lines.append(line)
    return "\n".join(lines)


def _file_extension(path: str) -> Optional[str]:
    ext = Path(path).suffix.lower()
    return ext if ext else None


# Languages Semgrep should scan, mapped by file extension
SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".rb", ".php",
    ".cs", ".c", ".cpp", ".h", ".hpp", ".rs", ".swift", ".kt",
}


def run_semgrep(files: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Run Semgrep on PR files and return findings.

    Args:
        files: List of {path, patch, additions, ...} from the PR diff.

    Returns:
        List of finding dicts matching Tier 1 format.
    """
    if not RULES_DIR.exists() or not any(RULES_DIR.glob("*.yml")):
        return []

    # Filter to supported file types
    scannable = [
        f for f in files
        if _file_extension(f.get("path", "")) in SUPPORTED_EXTENSIONS
        and f.get("patch")
    ]

    if not scannable:
        return []

    findings = []

    with tempfile.TemporaryDirectory(prefix="mitig8it_") as tmpdir:
        # Write files to temp directory preserving path structure
        for file_info in scannable:
            file_path = Path(tmpdir) / file_info["path"]
            file_path.parent.mkdir(parents=True, exist_ok=True)
            content = _extract_file_content(file_info.get("patch", ""))
            file_path.write_text(content, encoding="utf-8")

        try:
            result = subprocess.run(
                [
                    "semgrep",
                    "--config", str(RULES_DIR),
                    "--json",
                    "--no-git-ignore",
                    "--quiet",
                    "--timeout", "30",
                    "--max-target-bytes", "500000",
                    tmpdir,
                ],
                capture_output=True,
                text=True,
                timeout=120,
                env={**os.environ, "SEMGREP_SEND_METRICS": "off"},
            )
        except subprocess.TimeoutExpired:
            print("Semgrep timed out after 120s")
            return []
        except FileNotFoundError:
            print("Semgrep not installed — skipping Tier 2 analysis")
            return []

        if result.returncode not in (0, 1):
            # returncode 1 = findings found, 0 = no findings
            print(f"Semgrep error (rc={result.returncode}): {result.stderr[:500]}")
            return []

        try:
            output = json.loads(result.stdout)
        except json.JSONDecodeError:
            print(f"Semgrep output not valid JSON: {result.stdout[:200]}")
            return []

        for match in output.get("results", []):
            metadata = match.get("extra", {}).get("metadata", {})
            check_id = match.get("check_id", "")
            file_path = match.get("path", "").replace(tmpdir + "/", "")
            line_start = match.get("start", {}).get("line", 1)
            code_snippet = match.get("extra", {}).get("lines", "")[:500]
            semgrep_severity = match.get("extra", {}).get("severity", "WARNING")
            taxonomy = build_taxonomy_metadata(
                rule_id=f"semgrep.{check_id}",
                category=metadata.get("category", "security"),
                cwe_id=metadata.get("cwe", None),
                owasp_category=metadata.get("owasp", None),
                internal_type=metadata.get("internal_type", check_id),
                title=match.get("extra", {}).get("message", check_id),
                description=match.get("extra", {}).get("message", ""),
                file_path=file_path,
                code_snippet=code_snippet,
                attack_techniques=metadata.get("attack", None),
                capec_ids=metadata.get("capec", None),
            )

            findings.append({
                "rule_id": f"semgrep.{check_id}",
                "internal_type": taxonomy["internal_type"],
                "title": match.get("extra", {}).get("message", check_id),
                "description": match.get("extra", {}).get("message", ""),
                "category": metadata.get("category", "security"),
                "cwe_id": taxonomy["primary_cwe_id"],
                "owasp_category": taxonomy["primary_owasp_category"],
                "taxonomy_mappings": taxonomy["taxonomy_mappings"],
                "taxonomy_versions": taxonomy["taxonomy_versions"],
                "severity": SEVERITY_MAP.get(semgrep_severity, "medium"),
                "confidence": float(metadata.get("confidence", 0.8)),
                "exploitability": "medium",
                "file_path": file_path,
                "line_start": line_start,
                "line_end": match.get("end", {}).get("line", line_start),
                "code_snippet": code_snippet,
                "evidence": f"Semgrep AST match on rule `{check_id}`",
                "exploit_scenario": "",
                "remediation": match.get("extra", {}).get("message", ""),
                "remediation_patch": "",
                "fingerprint": make_fingerprint(
                    f"semgrep.{check_id}", file_path, line_start, code_snippet
                ),
            })

    return findings
