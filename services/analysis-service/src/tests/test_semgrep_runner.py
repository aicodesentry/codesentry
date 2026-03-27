"""Tests for Semgrep runner integration."""

import pytest
from semgrep_runner import run_semgrep, _extract_file_content, make_fingerprint


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
        result = run_semgrep(files)
        assert result == []

    def test_handles_no_findings_gracefully(self):
        files = [{"path": "clean.py", "patch": "+x = 1\n+y = 2"}]
        result = run_semgrep(files)
        assert isinstance(result, list)

    @pytest.mark.skipif(
        not __import__("shutil").which("semgrep"),
        reason="Semgrep not installed",
    )
    def test_detects_pickle_loads(self):
        files = [{
            "path": "app.py",
            "patch": "+import pickle\n+data = pickle.loads(user_input)",
        }]
        result = run_semgrep(files)
        pickle_findings = [f for f in result if "pickle" in f["rule_id"]]
        assert len(pickle_findings) > 0

    @pytest.mark.skipif(
        not __import__("shutil").which("semgrep"),
        reason="Semgrep not installed",
    )
    def test_detects_eval_with_user_input(self):
        files = [{
            "path": "handler.js",
            "patch": "+const result = eval(req.body.code)",
        }]
        result = run_semgrep(files)
        eval_findings = [f for f in result if "eval" in f["rule_id"]]
        assert len(eval_findings) > 0

    @pytest.mark.skipif(
        not __import__("shutil").which("semgrep"),
        reason="Semgrep not installed",
    )
    def test_finding_format(self):
        files = [{
            "path": "vuln.py",
            "patch": "+import pickle\n+obj = pickle.loads(raw_data)",
        }]
        result = run_semgrep(files)
        if result:
            f = result[0]
            assert "rule_id" in f
            assert "fingerprint" in f
            assert "severity" in f
            assert "file_path" in f
            assert f["rule_id"].startswith("semgrep.")
