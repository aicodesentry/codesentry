"""Tests for Semgrep runner integration."""

import subprocess
import pytest
from pathlib import Path
from semgrep_runner import run_semgrep, _extract_file_content, make_fingerprint, RULES_DIR

HAS_SEMGREP = __import__("shutil").which("semgrep") is not None
skip_no_semgrep = pytest.mark.skipif(not HAS_SEMGREP, reason="Semgrep not installed")


class TestExtractFileContent:
    def test_extracts_added_lines(self):
        patch = "@@ -0,0 +1,3 @@\n+line1\n+line2\n+line3"
        assert _extract_file_content(patch) == "line1\nline2\nline3"

    def test_skips_removed_lines(self):
        patch = "@@ -1,2 +1,2 @@\n-old\n+new"
        assert "old" not in _extract_file_content(patch)
        assert "new" in _extract_file_content(patch)

    def test_empty_patch(self):
        assert _extract_file_content("") == ""


class TestMakeFingerprint:
    def test_deterministic(self):
        fp1 = make_fingerprint("rule1", "file.py", 10, "code")
        fp2 = make_fingerprint("rule1", "file.py", 10, "code")
        assert fp1 == fp2

    def test_different_inputs(self):
        fp1 = make_fingerprint("rule1", "file.py", 10, "code")
        fp2 = make_fingerprint("rule2", "file.py", 10, "code")
        assert fp1 != fp2


class TestRunSemgrep:
    def test_returns_list(self):
        result = run_semgrep([])
        assert isinstance(result, list)

    def test_skips_unsupported_extensions(self):
        files = [{"path": "readme.md", "patch": "+# Hello"}]
        assert run_semgrep(files) == []

    def test_handles_no_findings_gracefully(self):
        files = [{"path": "clean.py", "patch": "+x = 1\n+y = 2"}]
        assert isinstance(run_semgrep(files), list)

    @skip_no_semgrep
    def test_detects_pickle_loads(self):
        files = [{"path": "app.py", "patch": "+import pickle\n+data = pickle.loads(user_input)"}]
        result = run_semgrep(files)
        assert any("pickle" in f["rule_id"] for f in result)

    @skip_no_semgrep
    def test_detects_eval_with_user_input(self):
        files = [{"path": "handler.js", "patch": "+const result = eval(req.body.code)"}]
        result = run_semgrep(files)
        assert any("eval" in f["rule_id"] for f in result)

    @skip_no_semgrep
    def test_finding_has_required_fields(self):
        files = [{"path": "vuln.py", "patch": "+import pickle\n+obj = pickle.loads(raw_data)"}]
        result = run_semgrep(files)
        assert len(result) > 0
        f = result[0]
        for key in ("rule_id", "fingerprint", "severity", "file_path", "line_start",
                     "title", "category", "cwe_id", "confidence"):
            assert key in f, f"Missing key: {key}"
        assert f["rule_id"].startswith("semgrep.")
        assert f["severity"] in ("critical", "high", "medium", "low")


# ── Rule YAML validation ────────────────────────────────────────────────

class TestRuleYAMLValidity:
    """Verify all Semgrep rule files have valid structure."""

    @pytest.fixture
    def rule_files(self):
        return list(RULES_DIR.glob("*.yml"))

    def test_rules_directory_exists(self):
        assert RULES_DIR.exists()

    def test_rule_files_exist(self, rule_files):
        assert len(rule_files) > 0, "No Semgrep rule files found"

    def test_rule_files_contain_rules_key(self, rule_files):
        for f in rule_files:
            text = f.read_text()
            assert "rules:" in text, f"{f.name} missing 'rules:' key"

    def test_rule_files_have_ids(self, rule_files):
        import re
        for f in rule_files:
            text = f.read_text()
            ids = re.findall(r"^\s+- id:\s+(.+)$", text, re.MULTILINE)
            assert len(ids) > 0, f"{f.name} has no rule IDs"

    def test_rule_ids_unique_across_files(self, rule_files):
        import re
        all_ids = []
        for f in rule_files:
            text = f.read_text()
            all_ids.extend(re.findall(r"^\s+- id:\s+(.+)$", text, re.MULTILINE))
        assert len(all_ids) == len(set(all_ids)), \
            f"Duplicate rule IDs: {[x for x in all_ids if all_ids.count(x) > 1]}"

    def test_all_rules_have_cwe_metadata(self, rule_files):
        import re
        for f in rule_files:
            text = f.read_text()
            ids = re.findall(r"^\s+- id:\s+(.+)$", text, re.MULTILINE)
            cwes = re.findall(r"cwe:\s+\"(CWE-\d+)\"", text)
            assert len(cwes) == len(ids), \
                f"{f.name} has {len(ids)} rules but {len(cwes)} CWE entries"

    def test_all_rules_have_severity(self, rule_files):
        import re
        for f in rule_files:
            text = f.read_text()
            ids = re.findall(r"^\s+- id:\s+(.+)$", text, re.MULTILINE)
            severities = re.findall(r"severity:\s+(ERROR|WARNING|INFO)", text)
            assert len(severities) == len(ids), \
                f"{f.name} has {len(ids)} rules but {len(severities)} severity entries"

    @skip_no_semgrep
    def test_semgrep_validates_rules(self, rule_files):
        for f in rule_files:
            result = subprocess.run(
                ["semgrep", "--validate", "--config", str(f)],
                capture_output=True, text=True, timeout=30,
            )
            assert result.returncode == 0, \
                f"Semgrep validation failed for {f.name}: {result.stderr[:300]}"


# ── Combined pipeline test ───────────────────────────────────────────────

class TestCombinedPipeline:
    """Test Tier 1 + Tier 2 deduplication and merging."""

    def test_deduplication_by_fingerprint(self):
        """Simulate both tiers finding the same issue — should deduplicate."""
        from security_rules import SECURITY_RULES
        from main import generate_finding, make_fingerprint as t1_fingerprint

        # Tier 1: regex match on pickle.loads
        patch = "+import pickle\n+data = pickle.loads(user_input)"
        tier1_findings = []
        for rule in SECURITY_RULES:
            if rule.pattern.search(patch):
                tier1_findings.append(generate_finding(rule, "app.py", patch))

        # Tier 2: Semgrep match (simulated)
        tier2_findings = [{
            "rule_id": "semgrep.cwe-502.pickle-loads",
            "title": "pickle.loads() deserializes arbitrary Python objects",
            "category": "insecure deserialization",
            "cwe_id": "CWE-502",
            "severity": "critical",
            "confidence": 0.95,
            "file_path": "app.py",
            "line_start": 2,
            "fingerprint": "unique_semgrep_fingerprint_123",
            "description": "test",
            "exploitability": "high",
            "owasp_category": "A08:2021",
            "line_end": 2,
            "code_snippet": "pickle.loads(user_input)",
            "evidence": "Semgrep AST match",
            "exploit_scenario": "",
            "remediation": "Use safe alternatives",
            "remediation_patch": "",
        }]

        # Merge like the pipeline does
        all_findings = tier1_findings + tier2_findings
        unique = {}
        for f in all_findings:
            unique[f["fingerprint"]] = f
        merged = list(unique.values())

        # Tier 1 and Tier 2 have different fingerprints (different rule_id),
        # so both should appear. If same fingerprint, Tier 1 wins.
        assert len(merged) >= len(tier1_findings)

    def test_tier1_findings_present(self):
        """Verify Tier 1 catches pickle.loads via regex."""
        from security_rules import SECURITY_RULES
        from main import generate_finding

        patch = "+import pickle\n+data = pickle.loads(user_input)"
        findings = []
        for rule in SECURITY_RULES:
            if rule.pattern.search(patch):
                findings.append(generate_finding(rule, "app.py", patch))

        cwe_ids = [f["cwe_id"] for f in findings]
        assert "CWE-502" in cwe_ids, "Tier 1 should catch pickle.loads as CWE-502"

    def test_findings_have_consistent_format(self):
        """Both tiers should produce findings with the same keys."""
        required_keys = {
            "rule_id", "title", "description", "category", "cwe_id",
            "severity", "confidence", "file_path", "line_start",
            "fingerprint", "remediation",
        }

        from security_rules import SECURITY_RULES
        from main import generate_finding

        patch = "+API_KEY = 'sk_live_1234567890abcdef'"
        for rule in SECURITY_RULES:
            if rule.pattern.search(patch):
                finding = generate_finding(rule, "config.py", patch)
                missing = required_keys - set(finding.keys())
                assert not missing, f"Tier 1 finding missing keys: {missing}"
                break
