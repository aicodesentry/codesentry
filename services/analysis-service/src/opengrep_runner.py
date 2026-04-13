"""
Tier 2: OpenGrep-based AST analysis runner.

Writes PR diff files to a temp directory, runs OpenGrep with custom rules,
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
from remediation_patches import build_remediation_patch
from taxonomy import build_taxonomy_metadata

RULES_DIR = Path(__file__).parent / "opengrep_rules"

# Map OpenGrep severity to our severity levels
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


def _extract_exact_lines(content: str, start_line: int, end_line: int) -> str:
    lines = str(content or "").splitlines()
    start = max(1, int(start_line or 1))
    end = max(start, int(end_line or start))
    selected = lines[start - 1:end]
    return "\n".join(selected).strip()


# Languages OpenGrep should scan, mapped by file extension
SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".rb", ".php",
    ".cs", ".c", ".cpp", ".h", ".hpp", ".rs", ".swift", ".kt",
}


def run_opengrep(files: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Run OpenGrep on PR files and return findings.

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
        extracted_content_by_path: Dict[str, str] = {}
        # Write files to temp directory preserving path structure
        for file_info in scannable:
            file_path = Path(tmpdir) / file_info["path"]
            file_path.parent.mkdir(parents=True, exist_ok=True)
            content = _extract_file_content(file_info.get("patch", ""))
            extracted_content_by_path[file_info["path"]] = content
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
            )
        except subprocess.TimeoutExpired:
            print("OpenGrep timed out after 120s")
            return []
        except FileNotFoundError:
            print("OpenGrep not installed — skipping Tier 2 analysis")
            return []

        if result.returncode not in (0, 1):
            # returncode 1 = findings found, 0 = no findings
            print(f"OpenGrep error (rc={result.returncode}): {result.stderr[:500]}")
            return []

        try:
            output = json.loads(result.stdout)
        except json.JSONDecodeError:
            print(f"OpenGrep output not valid JSON: {result.stdout[:200]}")
            return []

        for match in output.get("results", []):
            metadata = match.get("extra", {}).get("metadata", {})
            check_id = match.get("check_id", "")
            file_path = match.get("path", "").replace(tmpdir + "/", "")
            line_start = match.get("start", {}).get("line", 1)
            line_end = match.get("end", {}).get("line", line_start)
            code_snippet = _extract_exact_lines(
                extracted_content_by_path.get(file_path, ""),
                line_start,
                line_end,
            )[:500] or match.get("extra", {}).get("lines", "")[:500]
            opengrep_severity = match.get("extra", {}).get("severity", "WARNING")
            taxonomy = build_taxonomy_metadata(
                rule_id=f"opengrep.{check_id}",
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

            finding = {
                "rule_id": f"opengrep.{check_id}",
                "internal_type": taxonomy["internal_type"],
                "title": match.get("extra", {}).get("message", check_id),
                "description": match.get("extra", {}).get("message", ""),
                "category": metadata.get("category", "security"),
                "cwe_id": taxonomy["primary_cwe_id"],
                "owasp_category": taxonomy["primary_owasp_category"],
                "taxonomy_mappings": taxonomy["taxonomy_mappings"],
                "taxonomy_versions": taxonomy["taxonomy_versions"],
                "severity": SEVERITY_MAP.get(opengrep_severity, "medium"),
                "confidence": float(metadata.get("confidence", 0.8)),
                "exploitability": "medium",
                "file_path": file_path,
                "line_start": line_start,
                "line_end": line_end,
                "code_snippet": code_snippet,
                "evidence": f"OpenGrep AST match on rule `{check_id}`",
                "exploit_scenario": "",
                "remediation": match.get("extra", {}).get("message", ""),
                "remediation_patch": "",
                "fingerprint": make_fingerprint(
                    f"opengrep.{check_id}", file_path, line_start, code_snippet
                ),
            }
            finding["remediation_patch"] = build_remediation_patch(finding) or ""
            findings.append(finding)

    return findings
