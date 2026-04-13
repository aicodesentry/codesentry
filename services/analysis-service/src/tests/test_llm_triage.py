"""Tests for LLM triage (Tier 3)."""

import json
import os
from unittest.mock import MagicMock, patch

import pytest

from llm_triage import (
    LLM_TRIAGE_MAX_FINDINGS,
    _apply_verdicts,
    _build_finding_context,
    _normalize_fixed_code,
    _parse_triage_response,
    _select_findings_for_triage,
    is_llm_triage_enabled,
    triage_findings,
)


def _make_finding(**overrides):
    base = {
        "rule_id": "sql.injection.raw_query",
        "title": "Potential SQL Injection",
        "category": "SQL injection",
        "cwe_id": "CWE-89",
        "severity": "high",
        "confidence": 0.7,
        "file_path": "app.py",
        "line_start": 10,
        "code_snippet": 'query = f"SELECT * FROM users WHERE id = {user_id}"',
        "evidence": "Matched deterministic rule",
        "fingerprint": "abc123",
        "description": "SQL query built with f-string",
        "exploitability": "high",
        "owasp_category": "A03:2021",
        "line_end": 10,
        "remediation": "Use parameterized queries",
        "remediation_patch": "",
        "exploit_scenario": "",
    }
    base.update(overrides)
    return base


class TestIsEnabled:
    def test_disabled_when_no_key(self):
        with patch.dict(os.environ, {}, clear=True):
            assert not is_llm_triage_enabled()

    def test_enabled_when_key_set(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test"}):
            assert is_llm_triage_enabled()


class TestSelectFindings:
    def test_limits_to_max(self):
        findings = [_make_finding(fingerprint=f"fp-{i}") for i in range(30)]
        selected = _select_findings_for_triage(findings)
        assert len(selected) == min(30, LLM_TRIAGE_MAX_FINDINGS)

    def test_prioritizes_high_severity_low_confidence(self):
        low_value = _make_finding(severity="low", confidence=0.95, fingerprint="low")
        high_value = _make_finding(severity="critical", confidence=0.5, fingerprint="high")
        selected = _select_findings_for_triage([low_value, high_value])
        assert selected[0]["fingerprint"] == "high"

    def test_prioritizes_patchable_findings(self):
        generic = _make_finding(
            fingerprint="generic",
            severity="low",
            confidence=0.7,
            rule_id="generic.security.issue",
            category="security issue",
            cwe_id="CWE-200",
            code_snippet="doThing(userInput)",
        )
        patchable = _make_finding(
            fingerprint="patchable",
            severity="high",
            confidence=0.7,
            file_path="app.js",
            category="cross-site scripting (xss)",
            cwe_id="CWE-79",
            code_snippet="element.innerHTML = req.query.name;",
        )
        selected = _select_findings_for_triage([generic, patchable])
        assert selected[0]["fingerprint"] == "patchable"


class TestBuildFindingContext:
    def test_includes_required_fields(self):
        finding = _make_finding()
        ctx = _build_finding_context(finding, {"app.py": "+some code"})
        assert ctx["fingerprint"] == "abc123"
        assert ctx["rule_id"] == "sql.injection.raw_query"
        assert ctx["surrounding_code"] == "+some code"

    def test_truncates_long_patches(self):
        long_patch = "\n".join([f"+line {i}" for i in range(200)])
        ctx = _build_finding_context(_make_finding(), {"app.py": long_patch})
        lines = ctx["surrounding_code"].split("\n")
        assert len(lines) <= 60

    def test_includes_fix_generation_fields(self):
        ctx = _build_finding_context(_make_finding(description="desc", exploit_scenario="boom"), {"app.py": "+some code"})
        assert ctx["category"] == "SQL injection"
        assert ctx["description"] == "desc"
        assert ctx["remediation_hint"] == "Use parameterized queries"
        assert ctx["exploit_scenario"] == "boom"


class TestNormalizeFixedCode:
    def test_accepts_small_inline_patch(self):
        fixed = _normalize_fixed_code("cursor.execute(\"SELECT * FROM users WHERE id = %s\", (user_id,))", 'query = f"SELECT * FROM users WHERE id = {user_id}"')
        assert fixed == 'cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))'

    def test_strips_markdown_fences(self):
        fixed = _normalize_fixed_code("```python\ncursor.execute(\"SELECT 1\")\n```", "query = 'SELECT 1'")
        assert fixed == 'cursor.execute("SELECT 1")'

    def test_rejects_large_patches(self):
        fixed = _normalize_fixed_code("\n".join([f"line {i}" for i in range(9)]), "eval(user_input)")
        assert fixed is None

    def test_preserves_original_indent_when_llm_returns_flush_left(self):
        original = "    query = f\"SELECT * FROM users WHERE id = {user_id}\""
        fixed = _normalize_fixed_code("cursor.execute(\"SELECT * FROM users WHERE id = %s\", (user_id,))", original)
        assert fixed == "    cursor.execute(\"SELECT * FROM users WHERE id = %s\", (user_id,))"

    def test_preserves_relative_indent_across_multiline_patch(self):
        original = "    if user:\n        process(user)"
        llm_output = "if user is not None:\n    process(user)"
        fixed = _normalize_fixed_code(llm_output, original)
        assert fixed == "    if user is not None:\n        process(user)"

    def test_does_not_double_indent_when_llm_already_matches(self):
        original = "    query = f\"SELECT 1\""
        fixed = _normalize_fixed_code("    cursor.execute(\"SELECT 1\")", original)
        assert fixed == "    cursor.execute(\"SELECT 1\")"

    def test_rejects_blank_only_input(self):
        assert _normalize_fixed_code("   \n\t\n", "eval(x)") is None


class TestParseTriageResponse:
    def test_parses_valid_json(self):
        response = json.dumps([{
            "fingerprint": "abc123",
            "verdict": "true_positive",
            "reasoning": "Input is user-controlled",
            "adjusted_severity": None,
            "adjusted_confidence": None,
        }])
        verdicts = _parse_triage_response(response, {"abc123"})
        assert len(verdicts) == 1
        assert verdicts[0]["verdict"] == "true_positive"

    def test_parses_markdown_fenced_json(self):
        response = '```json\n[{"fingerprint": "abc123", "verdict": "false_positive", "reasoning": "test"}]\n```'
        verdicts = _parse_triage_response(response, {"abc123"})
        assert len(verdicts) == 1
        assert verdicts[0]["verdict"] == "false_positive"

    def test_rejects_unknown_fingerprints(self):
        response = json.dumps([{
            "fingerprint": "unknown",
            "verdict": "true_positive",
            "reasoning": "test",
        }])
        verdicts = _parse_triage_response(response, {"abc123"})
        assert len(verdicts) == 0

    def test_rejects_invalid_verdicts(self):
        response = json.dumps([{
            "fingerprint": "abc123",
            "verdict": "maybe_vulnerable",
            "reasoning": "test",
        }])
        verdicts = _parse_triage_response(response, {"abc123"})
        assert len(verdicts) == 0

    def test_preserves_fixed_code_until_finding_context_is_available(self):
        response = json.dumps([{
            "fingerprint": "abc123",
            "verdict": "true_positive",
            "reasoning": "confirmed",
            "adjusted_severity": None,
            "adjusted_confidence": None,
            "fixed_code": "\n".join([
                "const text = String(req.query.id)",
                "if (!/^\\d+$/.test(text)) throw new Error('invalid id')",
                "const userId = Number(text)",
                "db.query(\"SELECT * FROM users WHERE id = ?\", [userId]);",
            ]),
        }])
        verdicts = _parse_triage_response(response, {"abc123"})
        assert len(verdicts) == 1
        assert verdicts[0]["fixed_code"].startswith("const text = String")

    def test_accepts_alias_fields_from_model_response(self):
        response = json.dumps([{
            "fingerprint": "abc123",
            "verdict": "true_positive",
            "reasoning": "confirmed",
            "adjusted_severity": None,
            "adjusted_confidence": None,
            "exploitScenario": "Attacker-controlled input reaches query construction.",
            "recommendation": "Use a parameterized query.",
            "remediationPatch": 'db.query("SELECT * FROM users WHERE id = ?", [userId]);',
        }])
        verdicts = _parse_triage_response(response, {"abc123"})
        assert len(verdicts) == 1
        assert verdicts[0]["exploit_scenario"] == "Attacker-controlled input reaches query construction."
        assert verdicts[0]["remediation"] == "Use a parameterized query."
        assert verdicts[0]["fixed_code"] == 'db.query("SELECT * FROM users WHERE id = ?", [userId]);'

    def test_raises_on_invalid_json(self):
        with pytest.raises(json.JSONDecodeError):
            _parse_triage_response("not json at all", {"abc123"})


class TestApplyVerdicts:
    def test_removes_false_positives(self):
        findings = [_make_finding()]
        verdicts = [{"fingerprint": "abc123", "verdict": "false_positive", "reasoning": "safe", "adjusted_severity": None, "adjusted_confidence": None}]
        result = _apply_verdicts(findings, verdicts)
        assert len(result) == 0

    def test_boosts_true_positive_confidence(self):
        findings = [_make_finding(confidence=0.7)]
        verdicts = [{"fingerprint": "abc123", "verdict": "true_positive", "reasoning": "confirmed", "adjusted_severity": None, "adjusted_confidence": None}]
        result = _apply_verdicts(findings, verdicts)
        assert len(result) == 1
        assert result[0]["confidence"] == 0.8

    def test_adjusts_severity(self):
        findings = [_make_finding(severity="high")]
        verdicts = [{"fingerprint": "abc123", "verdict": "true_positive", "reasoning": "worse than thought", "adjusted_severity": "critical", "adjusted_confidence": None}]
        result = _apply_verdicts(findings, verdicts)
        assert result[0]["severity"] == "critical"

    def test_applies_adjusted_confidence(self):
        findings = [_make_finding(confidence=0.7)]
        verdicts = [{"fingerprint": "abc123", "verdict": "true_positive", "reasoning": "confirmed", "adjusted_severity": None, "adjusted_confidence": 0.95}]
        result = _apply_verdicts(findings, verdicts)
        assert result[0]["confidence"] == 0.95

    def test_leaves_uncertain_unchanged(self):
        findings = [_make_finding(confidence=0.7, severity="high")]
        verdicts = [{"fingerprint": "abc123", "verdict": "uncertain", "reasoning": "unclear", "adjusted_severity": None, "adjusted_confidence": None}]
        result = _apply_verdicts(findings, verdicts)
        assert len(result) == 1
        assert result[0]["confidence"] == 0.7
        assert result[0]["severity"] == "high"

    def test_untriaged_findings_pass_through(self):
        findings = [
            _make_finding(fingerprint="triaged"),
            _make_finding(fingerprint="not_triaged"),
        ]
        verdicts = [{"fingerprint": "triaged", "verdict": "false_positive", "reasoning": "safe", "adjusted_severity": None, "adjusted_confidence": None}]
        result = _apply_verdicts(findings, verdicts)
        assert len(result) == 1
        assert result[0]["fingerprint"] == "not_triaged"

    def test_adds_llm_triage_metadata(self):
        findings = [_make_finding()]
        verdicts = [{"fingerprint": "abc123", "verdict": "true_positive", "reasoning": "user input flows to query", "adjusted_severity": None, "adjusted_confidence": None}]
        result = _apply_verdicts(findings, verdicts)
        assert "llm_triage" in result[0]
        assert result[0]["llm_triage"]["verdict"] == "true_positive"
        assert "user input" in result[0]["llm_triage"]["reasoning"]

    def test_applies_inline_fix_patch_for_true_positive(self):
        findings = [_make_finding()]
        verdicts = [{
            "fingerprint": "abc123",
            "verdict": "true_positive",
            "reasoning": "confirmed",
            "adjusted_severity": None,
            "adjusted_confidence": None,
            "fixed_code": 'cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))',
        }]
        result = _apply_verdicts(findings, verdicts)
        assert result[0]["remediation_patch"] == 'cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))'

    def test_normalizes_fixed_code_using_real_snippet_context(self):
        findings = [_make_finding(code_snippet="\n".join([
            'const text = String(req.query.id)',
            'const userId = Number(text)',
            'db.query("SELECT * FROM users WHERE id = " + userId);',
        ]))]
        verdicts = [{
            "fingerprint": "abc123",
            "verdict": "true_positive",
            "reasoning": "confirmed",
            "adjusted_severity": None,
            "adjusted_confidence": None,
            "fixed_code": "\n".join([
                'const text = String(req.query.id)',
                "if (!/^\\d+$/.test(text)) throw new Error('invalid id')",
                'const userId = Number(text)',
                'db.query("SELECT * FROM users WHERE id = ?", [userId]);',
            ]),
        }]
        result = _apply_verdicts(findings, verdicts)
        assert result[0]["remediation_patch"].endswith('[userId]);')

    def test_backfills_exploit_scenario_when_missing(self):
        findings = [_make_finding(exploit_scenario="", remediation="")]
        verdicts = [{
            "fingerprint": "abc123",
            "verdict": "true_positive",
            "reasoning": "confirmed",
            "adjusted_severity": None,
            "adjusted_confidence": None,
            "exploit_scenario": None,
            "remediation": None,
            "fixed_code": None,
        }]
        result = _apply_verdicts(findings, verdicts)
        assert "alter the SQL query" in result[0]["exploit_scenario"]
        assert "parameterized queries" in result[0]["remediation"]

    def test_applies_model_exploit_scenario_and_remediation(self):
        findings = [_make_finding(exploit_scenario="", remediation="")]
        verdicts = [{
            "fingerprint": "abc123",
            "verdict": "true_positive",
            "reasoning": "confirmed",
            "adjusted_severity": None,
            "adjusted_confidence": None,
            "exploit_scenario": "An attacker can tamper with the query to access unauthorized rows.",
            "remediation": "Bind the identifier as a query parameter.",
            "fixed_code": None,
        }]
        result = _apply_verdicts(findings, verdicts)
        assert result[0]["exploit_scenario"] == "An attacker can tamper with the query to access unauthorized rows."
        assert result[0]["remediation"] == "Bind the identifier as a query parameter."


class TestTriageFindings:
    def test_returns_unchanged_when_disabled(self):
        findings = [_make_finding()]
        with patch.dict(os.environ, {}, clear=True):
            result = triage_findings(findings, {})
        assert result == findings

    def test_returns_empty_for_empty_findings(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test"}):
            result = triage_findings([], {})
        assert result == []

    @patch("llm_triage._call_openai")
    def test_returns_original_on_api_error(self, mock_call):
        mock_call.side_effect = Exception("API down")
        findings = [_make_finding()]
        with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test"}):
            result = triage_findings(findings, {})
        assert result == findings

    @patch("llm_triage._call_openai")
    def test_returns_original_on_bad_json(self, mock_call):
        mock_call.return_value = ("not valid json", 100, 50)
        findings = [_make_finding()]
        with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test"}):
            result = triage_findings(findings, {})
        assert result == findings

    @patch("llm_triage._call_openai")
    def test_filters_false_positives_end_to_end(self, mock_call):
        mock_call.return_value = (
            json.dumps([{
                "fingerprint": "abc123",
                "verdict": "false_positive",
                "reasoning": "Input is from trusted internal service",
                "adjusted_severity": None,
                "adjusted_confidence": None,
            }]),
            500,
            200,
        )
        findings = [_make_finding()]
        with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test"}):
            result = triage_findings(findings, {"app.py": "+code here"})
        assert len(result) == 0

    @patch("llm_triage._call_openai")
    def test_keeps_true_positives_with_boost(self, mock_call):
        mock_call.return_value = (
            json.dumps([{
                "fingerprint": "abc123",
                "verdict": "true_positive",
                "reasoning": "User input directly concatenated",
                "adjusted_severity": "critical",
                "adjusted_confidence": None,
            }]),
            500,
            200,
        )
        findings = [_make_finding(confidence=0.7, severity="high")]
        with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test"}):
            result = triage_findings(findings, {"app.py": "+code"})
        assert len(result) == 1
        assert result[0]["confidence"] == 0.8
        assert result[0]["severity"] == "critical"
        assert result[0]["llm_triage"]["verdict"] == "true_positive"

    @patch("llm_triage._call_openai")
    def test_keeps_llm_generated_fix_patch_end_to_end(self, mock_call):
        mock_call.return_value = (
            json.dumps([{
                "fingerprint": "abc123",
                "verdict": "true_positive",
                "reasoning": "User input directly concatenated",
                "adjusted_severity": None,
                "adjusted_confidence": 0.91,
                "fixed_code": 'cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))',
            }]),
            500,
            200,
        )
        findings = [_make_finding()]
        with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test"}):
            result = triage_findings(findings, {"app.py": "+cursor.execute(query)\n"})
        assert len(result) == 1
        assert result[0]["remediation_patch"] == 'cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))'

    @patch("llm_triage._call_openai")
    def test_generates_fallback_sql_fix_when_model_omits_fixed_code(self, mock_call):
        mock_call.return_value = (
            json.dumps([{
                "fingerprint": "abc123",
                "verdict": "true_positive",
                "reasoning": "User input directly concatenated",
                "adjusted_severity": None,
                "adjusted_confidence": 0.91,
                "fixed_code": None,
            }]),
            500,
            200,
        )
        findings = [_make_finding(
            file_path="app.js",
            code_snippet='db.query("SELECT * FROM users WHERE id = " + userId);',
        )]
        with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test"}):
            result = triage_findings(findings, {"app.js": '+db.query("SELECT * FROM users WHERE id = " + userId);\n'})
        assert len(result) == 1
        assert result[0]["remediation_patch"] == 'db.query("SELECT * FROM users WHERE id = ?", [userId]);'

    @patch("llm_triage._call_openai")
    def test_generates_fallback_secret_fix_when_model_omits_fixed_code(self, mock_call):
        mock_call.return_value = (
            json.dumps([{
                "fingerprint": "abc123",
                "verdict": "true_positive",
                "reasoning": "Hardcoded secret confirmed",
                "adjusted_severity": None,
                "adjusted_confidence": None,
                "fixed_code": None,
            }]),
            500,
            200,
        )
        findings = [_make_finding(
            rule_id="secret.hardcoded.credential",
            title="Hardcoded secret or credential",
            category="hardcoded secrets",
            cwe_id="CWE-798",
            file_path="config.js",
            code_snippet='const apiKey = "sk_live_1234567890abcdef";',
        )]
        with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test"}):
            result = triage_findings(findings, {"config.js": '+const apiKey = "sk_live_1234567890abcdef";\n'})
        assert len(result) == 1
        assert result[0]["remediation_patch"] == "const apiKey = process.env.API_KEY;"

    @patch("llm_triage._call_openai")
    def test_generates_fallback_eval_fix_when_model_omits_fixed_code(self, mock_call):
        mock_call.return_value = (
            json.dumps([{
                "fingerprint": "abc123",
                "verdict": "true_positive",
                "reasoning": "eval executes attacker input",
                "adjusted_severity": None,
                "adjusted_confidence": None,
                "fixed_code": None,
            }]),
            500,
            200,
        )
        findings = [_make_finding(
            rule_id="code.injection.eval",
            title="Code injection via eval",
            category="code injection",
            cwe_id="CWE-94",
            file_path="app.js",
            code_snippet="eval(req.body.code);",
        )]
        with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test"}):
            result = triage_findings(findings, {"app.js": "+eval(req.body.code);\n"})
        assert len(result) == 1
        assert result[0]["remediation_patch"] == "JSON.parse(req.body.code);"

    @patch("llm_triage._call_openai")
    def test_generates_fallback_exec_fix_when_model_omits_fixed_code(self, mock_call):
        mock_call.return_value = (
            json.dumps([{
                "fingerprint": "abc123",
                "verdict": "true_positive",
                "reasoning": "command execution from request input",
                "adjusted_severity": None,
                "adjusted_confidence": None,
                "fixed_code": None,
            }]),
            500,
            200,
        )
        findings = [_make_finding(
            rule_id="code.injection.exec",
            title="Command injection via exec",
            category="code injection",
            cwe_id="CWE-78",
            file_path="app.js",
            code_snippet="exec(req.query.cmd);",
        )]
        with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test"}):
            result = triage_findings(findings, {"app.js": "+exec(req.query.cmd);\n"})
        assert len(result) == 1
        assert result[0]["remediation_patch"] == 'return res.status(400).json({ error: "Refusing to execute user-controlled commands" });'

    @patch("llm_triage._call_openai")
    def test_generates_fallback_xss_fix_when_model_omits_fixed_code(self, mock_call):
        mock_call.return_value = (
            json.dumps([{
                "fingerprint": "abc123",
                "verdict": "true_positive",
                "reasoning": "unsafe HTML rendering",
                "adjusted_severity": None,
                "adjusted_confidence": None,
                "fixed_code": None,
            }]),
            500,
            200,
        )
        findings = [_make_finding(
            rule_id="xss.unsafe_html_render",
            title="Potential XSS through unsafe HTML rendering",
            category="cross-site scripting (xss)",
            cwe_id="CWE-79",
            file_path="app.js",
            code_snippet="element.innerHTML = req.query.name;",
        )]
        with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test"}):
            result = triage_findings(findings, {"app.js": "+element.innerHTML = req.query.name;\n"})
        assert len(result) == 1
        assert result[0]["remediation_patch"] == "element.textContent = req.query.name;"
