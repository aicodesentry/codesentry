import re
from typing import Any, Dict, Optional


def infer_language(file_path: str) -> str:
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


def _env_key_for_identifier(identifier: str) -> str:
    raw = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", str(identifier or ""))
    cleaned = re.sub(r"[^A-Za-z0-9]+", "_", raw).strip("_")
    return (cleaned or "SECRET").upper()


def _secret_fix(snippet: str, language: str) -> Optional[str]:
    line = str(snippet or "").strip()
    if not line or "=" not in line:
      return None

    match = re.match(
        r"^(?P<prefix>.*?\b(?P<name>[A-Za-z_][A-Za-z0-9_]*)\s*=\s*)(?P<quote>['\"])(?P<value>.+?)(?P=quote)\s*;?$",
        line,
    )
    if not match:
        return None

    prefix = match.group("prefix")
    env_key = _env_key_for_identifier(match.group("name"))
    suffix = ";" if line.endswith(";") else ""

    replacements = {
        "javascript": f"{prefix}process.env.{env_key}{suffix}",
        "python": f'{match.group("name")} = os.getenv("{env_key}")',
        "go": re.sub(r'=\s*"[^"]+"$', f'= os.Getenv("{env_key}")', line),
        "java": f'{prefix}System.getenv("{env_key}"){suffix}',
        "csharp": f'{prefix}Environment.GetEnvironmentVariable("{env_key}"){suffix}',
        "ruby": f'{prefix}ENV["{env_key}"]{suffix}',
    }

    return replacements.get(language)


def _sql_fix(snippet: str, language: str) -> Optional[str]:
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

    return None


def _command_injection_fix(snippet: str, language: str) -> Optional[str]:
    line = str(snippet or "").strip()
    if not line:
        return None

    if language == "javascript":
        if re.search(r"\bexec\s*\(\s*req\.", line):
            return 'return res.status(400).json({ error: "Refusing to execute user-controlled commands" });'
        ping_concat = re.search(r'exec\s*\(\s*"ping\s+"\s*\+\s*([A-Za-z_][A-Za-z0-9_\.]*)\s*\)\s*;?$', line)
        if ping_concat:
            return f'execFile("ping", [{ping_concat.group(1)}]);'

    if language == "java":
        ping_concat = re.search(r'Runtime\.getRuntime\(\)\.exec\(\s*"ping\s+"\s*\+\s*([A-Za-z_][A-Za-z0-9_\.]*)\s*\)\s*;?$', line)
        if ping_concat:
            return f'Runtime.getRuntime().exec(new String[]{{"ping", {ping_concat.group(1)}}});'

    if language == "ruby" and re.search(r"\bexec\s*\(", line):
        return 'raise ArgumentError, "Refusing to execute user-controlled commands"'

    return None


def _eval_fix(snippet: str, language: str) -> Optional[str]:
    line = str(snippet or "").strip()
    if not line:
        return None

    if language == "javascript" and re.search(r"\beval\s*\(", line):
        return re.sub(r"\beval\s*\((.+)\)\s*;?$", r"JSON.parse(\1);", line)

    if language == "python" and re.search(r"\beval\s*\(", line):
        return None

    return None


def _xss_fix(snippet: str, language: str) -> Optional[str]:
    line = str(snippet or "").strip()
    if not line or language != "javascript":
        return None

    if ".innerHTML =" in line:
        return line.replace(".innerHTML =", ".textContent =", 1)

    if re.search(r"\bdocument\.write\s*\(", line):
        return re.sub(r"\bdocument\.write\s*\((.+)\)\s*;?$", r"document.body.textContent = \1;", line)

    return None


def build_remediation_patch(finding: Dict[str, Any]) -> Optional[str]:
    language = infer_language(finding.get("file_path", ""))
    snippet = str(finding.get("code_snippet", "")).strip()
    rule_id = str(finding.get("rule_id", ""))
    category = str(finding.get("category", "")).lower()
    cwe_id = str(finding.get("cwe_id", "")).upper()
    title = str(finding.get("title", "")).lower()

    if not snippet:
        return None

    if rule_id == "sql.injection.raw_query" or category == "sql injection" or cwe_id == "CWE-89":
        return _sql_fix(snippet, language)

    if "secret" in rule_id or "hardcoded secret" in title or cwe_id == "CWE-798":
        return _secret_fix(snippet, language)

    if "command injection" in category or "exec" in rule_id or cwe_id == "CWE-78":
        return _command_injection_fix(snippet, language)

    if "eval" in rule_id or cwe_id in {"CWE-94", "CWE-95"}:
        return _eval_fix(snippet, language)

    if "xss" in category or "cross-site scripting" in title or cwe_id == "CWE-79":
        return _xss_fix(snippet, language)

    if category == "code injection":
        return _command_injection_fix(snippet, language) or _eval_fix(snippet, language)

    return None
