import re
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class SecurityRule:
    rule_id: str
    title: str
    category: str
    cwe_id: Optional[str]
    owasp_category: Optional[str]
    severity: str
    confidence: float
    exploitability: str
    pattern: re.Pattern
    description: str
    remediation: str


SECURITY_RULES: List[SecurityRule] = [
    SecurityRule(
        rule_id="sql.injection.raw_query",
        title="Potential SQL Injection via string concatenation",
        category="SQL injection",
        cwe_id="CWE-89",
        owasp_category="A03:2021",
        severity="high",
        confidence=0.86,
        exploitability="high",
        pattern=re.compile(r"(SELECT|INSERT|UPDATE|DELETE).*(\+|f\"|%s|format\()", re.IGNORECASE),
        description="A SQL query appears to be dynamically assembled from variables.",
        remediation="Use parameterized queries or prepared statements.",
    ),
    SecurityRule(
        rule_id="cmd.injection.shell_true",
        title="Potential command injection in shell execution",
        category="command injection",
        cwe_id="CWE-78",
        owasp_category="A03:2021",
        severity="critical",
        confidence=0.9,
        exploitability="high",
        pattern=re.compile(r"(subprocess\.|os\.system|exec\().*(shell\s*=\s*True|\+|f\")", re.IGNORECASE),
        description="Shell command execution includes dynamic input or shell=True.",
        remediation="Avoid shell=True and pass commands as argument lists with strict allowlists.",
    ),
    SecurityRule(
        rule_id="path.traversal.user_path",
        title="Potential path traversal from user-controlled path",
        category="path traversal",
        cwe_id="CWE-22",
        owasp_category="A01:2021",
        severity="high",
        confidence=0.83,
        exploitability="medium",
        pattern=re.compile(r"(open\(|send_file\(|File\(|readFile\(|readFileSync\().*(\.\./|req\.|input\(|\+|f\"|\{)", re.IGNORECASE),
        description="File path access appears to use unsanitized user input.",
        remediation="Normalize and allowlist paths; reject traversal sequences and absolute paths.",
    ),
    SecurityRule(
        rule_id="ssrf.untrusted_url_fetch",
        title="Potential SSRF via untrusted URL fetch",
        category="SSRF",
        cwe_id="CWE-918",
        owasp_category="A10:2021",
        severity="high",
        confidence=0.8,
        exploitability="medium",
        pattern=re.compile(r"(requests\.(get|post)|axios\.(get|post)|fetch\().*(req\.|params|input|url)", re.IGNORECASE),
        description="Outbound HTTP request appears to use user-controlled URL data.",
        remediation="Use strict URL allowlists and block private/internal address ranges.",
    ),
    SecurityRule(
        rule_id="xss.unsafe_html_render",
        title="Potential XSS through unsafe HTML rendering",
        category="XSS",
        cwe_id="CWE-79",
        owasp_category="A03:2021",
        severity="high",
        confidence=0.84,
        exploitability="medium",
        pattern=re.compile(r"(dangerouslySetInnerHTML|innerHTML\s*=|v-html)", re.IGNORECASE),
        description="Raw HTML rendering without sanitization can enable script injection.",
        remediation="Avoid raw HTML rendering or sanitize untrusted content before rendering.",
    ),
    SecurityRule(
        rule_id="deserialize.untrusted_data",
        title="Insecure deserialization of untrusted data",
        category="insecure deserialization",
        cwe_id="CWE-502",
        owasp_category="A08:2021",
        severity="critical",
        confidence=0.88,
        exploitability="high",
        pattern=re.compile(r"(pickle\.loads|yaml\.load\(|marshal\.loads|unserialize\(|ObjectInputStream)", re.IGNORECASE),
        description="Deserialization primitive can execute attacker-controlled payloads.",
        remediation="Use safe loaders (e.g. yaml.safe_load) and strict schema validation on untrusted input.",
    ),
    SecurityRule(
        rule_id="code.injection.eval",
        title="Code injection via eval or dynamic execution",
        category="code injection",
        cwe_id="CWE-95",
        owasp_category="A03:2021",
        severity="critical",
        confidence=0.92,
        exploitability="high",
        pattern=re.compile(r"\b(eval|exec)\s*\(", re.IGNORECASE),
        description="Dynamic code execution can run attacker-controlled payloads.",
        remediation="Replace eval/exec with safe alternatives (JSON.parse, AST literal_eval, schema validation).",
    ),
    SecurityRule(
        rule_id="auth.bypass.missing_check",
        title="Potential access-control bypass",
        category="broken access control / auth bypass",
        cwe_id="CWE-284",
        owasp_category="A01:2021",
        severity="high",
        confidence=0.62,
        exploitability="medium",
        pattern=re.compile(r"(app\.(get|post|put|delete)\(|@app\.(get|post|put|delete)).*(admin|internal|user).*(?!auth|jwt|permission)", re.IGNORECASE),
        description="Sensitive endpoint appears to lack explicit auth/authorization checks nearby.",
        remediation="Enforce auth and authorization middleware on all sensitive routes.",
    ),
    SecurityRule(
        rule_id="secret.hardcoded.credential",
        title="Hardcoded secret or credential",
        category="hardcoded secrets",
        cwe_id="CWE-798",
        owasp_category="A07:2021",
        severity="critical",
        confidence=0.94,
        exploitability="high",
        pattern=re.compile(r"(api[_-]?key|secret|token|password)\s*[:=]\s*['\"][A-Za-z0-9_\-]{12,}['\"]", re.IGNORECASE),
        description="Credential-like literal appears committed in source.",
        remediation="Move secrets to secure secret management and rotate leaked values.",
    ),
    SecurityRule(
        rule_id="crypto.weak.hash",
        title="Weak cryptographic hash used for security context",
        category="insecure cryptography usage",
        cwe_id="CWE-327",
        owasp_category="A02:2021",
        severity="medium",
        confidence=0.78,
        exploitability="medium",
        pattern=re.compile(r"(md5\(|sha1\()", re.IGNORECASE),
        description="Weak hash algorithm may be insufficient for security-sensitive operations.",
        remediation="Use modern algorithms (SHA-256+, Argon2, bcrypt, or libsodium primitives).",
    ),
    SecurityRule(
        rule_id="upload.unsafefile",
        title="Unsafe file upload handling",
        category="unsafe file upload",
        cwe_id="CWE-434",
        owasp_category="A05:2021",
        severity="high",
        confidence=0.71,
        exploitability="medium",
        pattern=re.compile(r"(multer|upload|save\().*(filename|path).*(req\.|input)", re.IGNORECASE),
        description="Upload flow appears to trust user-controlled file metadata or path.",
        remediation="Validate MIME/type, enforce extension allowlists, randomize storage names.",
    ),
    SecurityRule(
        rule_id="config.debug_enabled",
        title="Debug mode enabled in application config",
        category="security misconfiguration",
        cwe_id="CWE-489",
        owasp_category="A05:2021",
        severity="medium",
        confidence=0.75,
        exploitability="low",
        pattern=re.compile(r"(DEBUG|debug)\s*[:=]\s*(True|true|1|\"true\")", re.IGNORECASE),
        description="Debug mode exposes stack traces, internal state, and may disable security controls.",
        remediation="Ensure DEBUG is disabled in production via environment variables.",
    ),
    SecurityRule(
        rule_id="llm.prompt.injection",
        title="Unsafe prompt composition with untrusted input",
        category="unsafe LLM/prompt injection patterns",
        cwe_id="CWE-20",
        owasp_category="LLM01",
        severity="medium",
        confidence=0.67,
        exploitability="medium",
        pattern=re.compile(r"(prompt|system_message|messages).*(req\.|user_input|input\()", re.IGNORECASE),
        description="Prompt is composed with untrusted text without policy/guardrail separation.",
        remediation="Isolate system instructions, sanitize/label user content, and add output controls.",
    ),
]

DEPENDENCY_RISK_PATTERNS = [
    (re.compile(r"lodash\s*[<=>~^]*\s*4\.17\.20", re.IGNORECASE), "Known vulnerable lodash version", "high"),
    (re.compile(r"log4j\s*[<=>~^]*\s*2\.14\.1", re.IGNORECASE), "Known vulnerable log4j version", "critical"),
    (re.compile(r"pyyaml\s*[<=>~^]*\s*5\.3", re.IGNORECASE), "Potentially vulnerable PyYAML version", "medium"),
]


def likely_llm_repo(path: str, content: str) -> bool:
    indicators = ["openai", "langchain", "anthropic", "prompt", "llm", "completion", "chat.completions"]
    low = f"{path}\n{content}".lower()
    return any(token in low for token in indicators)
