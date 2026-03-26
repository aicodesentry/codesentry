import pytest
from security_rules import SECURITY_RULES, DEPENDENCY_RISK_PATTERNS, likely_llm_repo


class TestSecurityRulePatterns:
    """Test each security rule's regex pattern for true positives and negatives."""

    def _find_rule(self, rule_id):
        return next(r for r in SECURITY_RULES if r.rule_id == rule_id)

    # --- SQL Injection ---
    def test_sql_injection_string_concat(self):
        rule = self._find_rule("sql.injection.raw_query")
        assert rule.pattern.search('query = "SELECT * FROM users WHERE id=" + user_id')

    def test_sql_injection_format(self):
        rule = self._find_rule("sql.injection.raw_query")
        assert rule.pattern.search('query = "SELECT * FROM users WHERE id=%s" % user_id')

    def test_sql_injection_safe_parameterized(self):
        rule = self._find_rule("sql.injection.raw_query")
        assert not rule.pattern.search("cursor.execute('SELECT * FROM users WHERE id = ?', (uid,))")

    # --- Command Injection ---
    def test_cmd_injection_shell_true(self):
        rule = self._find_rule("cmd.injection.shell_true")
        assert rule.pattern.search("subprocess.run(cmd, shell=True)")

    def test_cmd_injection_os_system_concat(self):
        rule = self._find_rule("cmd.injection.shell_true")
        assert rule.pattern.search('os.system("rm -rf " + path)')

    def test_cmd_injection_safe_list(self):
        rule = self._find_rule("cmd.injection.shell_true")
        assert not rule.pattern.search('subprocess.run(["ls", "-la"])')

    # --- Path Traversal ---
    def test_path_traversal_open_with_request(self):
        rule = self._find_rule("path.traversal.user_path")
        assert rule.pattern.search("open(req.body.file_path)")

    def test_path_traversal_dotdot(self):
        rule = self._find_rule("path.traversal.user_path")
        assert rule.pattern.search('open("../../etc/passwd")')

    def test_path_traversal_safe_hardcoded(self):
        rule = self._find_rule("path.traversal.user_path")
        assert not rule.pattern.search('open("config.json")')

    # --- SSRF ---
    def test_ssrf_requests_with_user_url(self):
        rule = self._find_rule("ssrf.untrusted_url_fetch")
        assert rule.pattern.search("requests.get(req.body.url)")

    def test_ssrf_safe_hardcoded_url(self):
        rule = self._find_rule("ssrf.untrusted_url_fetch")
        assert not rule.pattern.search('requests.get("https://api.example.com/data")')

    # --- XSS ---
    def test_xss_dangerously_set_inner_html(self):
        rule = self._find_rule("xss.unsafe_html_render")
        assert rule.pattern.search("dangerouslySetInnerHTML={{ __html: userInput }}")

    def test_xss_innerhtml_assign(self):
        rule = self._find_rule("xss.unsafe_html_render")
        assert rule.pattern.search('element.innerHTML = data')

    def test_xss_safe_text_content(self):
        rule = self._find_rule("xss.unsafe_html_render")
        assert not rule.pattern.search("element.textContent = data")

    # --- Deserialization ---
    def test_deserialize_pickle_loads(self):
        rule = self._find_rule("deserialize.untrusted_data")
        assert rule.pattern.search("obj = pickle.loads(data)")

    def test_deserialize_eval(self):
        rule = self._find_rule("deserialize.untrusted_data")
        assert rule.pattern.search("result = eval(user_input)")

    def test_deserialize_yaml_safe_load(self):
        rule = self._find_rule("deserialize.untrusted_data")
        assert not rule.pattern.search("yaml.safe_load(data)")

    # --- Hardcoded Secrets ---
    def test_secret_api_key(self):
        rule = self._find_rule("secret.hardcoded.credential")
        assert rule.pattern.search('api_key = "sk_live_abc123def456"')

    def test_secret_password(self):
        rule = self._find_rule("secret.hardcoded.credential")
        assert rule.pattern.search('password = "SuperSecretPass123"')

    def test_secret_short_value_no_match(self):
        rule = self._find_rule("secret.hardcoded.credential")
        # Less than 12 chars should not match
        assert not rule.pattern.search('token = "short"')

    # --- Weak Crypto ---
    def test_weak_crypto_md5(self):
        rule = self._find_rule("crypto.weak.hash")
        assert rule.pattern.search("hashlib.md5(data)")

    def test_weak_crypto_sha1(self):
        rule = self._find_rule("crypto.weak.hash")
        assert rule.pattern.search("sha1(password)")

    def test_weak_crypto_sha256_safe(self):
        rule = self._find_rule("crypto.weak.hash")
        assert not rule.pattern.search("hashlib.sha256(data)")

    # --- LLM Prompt Injection ---
    def test_llm_prompt_with_user_input(self):
        rule = self._find_rule("llm.prompt.injection")
        assert rule.pattern.search('prompt = "You are helpful. " + req.body.message')

    def test_llm_safe_static_prompt(self):
        rule = self._find_rule("llm.prompt.injection")
        assert not rule.pattern.search('prompt = "You are a helpful assistant."')


class TestDependencyRiskPatterns:
    def test_lodash_vulnerable_version(self):
        pattern, desc, severity = DEPENDENCY_RISK_PATTERNS[0]
        # The regex expects version specifier chars between name and version
        assert pattern.search("lodash==4.17.20")
        assert severity == "high"

    def test_log4j_vulnerable_version(self):
        pattern, desc, severity = DEPENDENCY_RISK_PATTERNS[1]
        assert pattern.search("log4j 2.14.1")
        assert severity == "critical"

    def test_pyyaml_vulnerable_version(self):
        pattern, desc, severity = DEPENDENCY_RISK_PATTERNS[2]
        assert pattern.search("pyyaml==5.3")

    def test_safe_lodash_version(self):
        pattern, _, _ = DEPENDENCY_RISK_PATTERNS[0]
        assert not pattern.search('"lodash": "4.17.21"')


class TestLikelyLLMRepo:
    def test_detects_openai_in_content(self):
        assert likely_llm_repo("app.py", "import openai\nclient = openai.Client()")

    def test_detects_langchain_in_path(self):
        assert likely_llm_repo("langchain_agent.py", "def run(): pass")

    def test_detects_anthropic(self):
        assert likely_llm_repo("main.py", "from anthropic import Anthropic")

    def test_no_match_for_regular_code(self):
        assert not likely_llm_repo("server.py", "from flask import Flask\napp = Flask(__name__)")

    def test_case_insensitive(self):
        assert likely_llm_repo("main.py", "OPENAI_API_KEY = os.environ['key']")
