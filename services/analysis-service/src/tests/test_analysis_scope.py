from main import is_runtime_scannable_path


class TestAnalysisScope:
    def test_runtime_files_remain_scannable(self):
        assert is_runtime_scannable_path("services/api-service/src/routes/auth.js") is True
        assert is_runtime_scannable_path("frontend/src/pages/HomePage.jsx") is True

    def test_test_and_rule_files_are_excluded(self):
        assert is_runtime_scannable_path("services/analysis-service/src/tests/test_llm_triage.py") is False
        assert is_runtime_scannable_path("services/api-service/tests/orchestrator.test.js") is False
        assert is_runtime_scannable_path("frontend/src/pages/__tests__/RepositoriesPage.test.jsx") is False
        assert is_runtime_scannable_path("test_vuln.js") is False
        assert is_runtime_scannable_path("nested/fixtures/test_vuln.ts") is False
        assert is_runtime_scannable_path("services/analysis-service/src/opengrep_rules/javascript.yml") is False
