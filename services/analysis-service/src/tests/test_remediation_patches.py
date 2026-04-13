from remediation_patches import build_remediation_patch


def test_generates_secret_patch_for_javascript():
    patch = build_remediation_patch({
        "rule_id": "secret.hardcoded.credential",
        "title": "Hardcoded secret or credential",
        "category": "sensitive data exposure",
        "cwe_id": "CWE-798",
        "file_path": "app.js",
        "code_snippet": 'const apiKey = "sk_live_123";',
    })
    assert patch == "const apiKey = process.env.API_KEY;"


def test_generates_command_injection_patch_for_javascript_exec():
    patch = build_remediation_patch({
        "rule_id": "code.injection.eval",
        "title": "Code injection via eval or dynamic execution",
        "category": "code injection",
        "cwe_id": "CWE-78",
        "file_path": "test_vuln.js",
        "code_snippet": "exec(req.query.cmd);",
    })
    assert patch == 'return res.status(400).json({ error: "Refusing to execute user-controlled commands" });'


def test_generates_command_injection_patch_for_java_runtime_exec():
    patch = build_remediation_patch({
        "rule_id": "code.injection.eval",
        "title": "Code injection via eval or dynamic execution",
        "category": "code injection",
        "cwe_id": "CWE-78",
        "file_path": "TestVuln.java",
        "code_snippet": 'Runtime.getRuntime().exec("ping " + host);',
    })
    assert patch == 'Runtime.getRuntime().exec(new String[]{"ping", host});'


def test_generates_xss_patch_for_innerhtml():
    patch = build_remediation_patch({
        "rule_id": "xss.unsafe_html_render",
        "title": "Potential XSS through unsafe HTML rendering",
        "category": "XSS",
        "cwe_id": "CWE-79",
        "file_path": "test_vuln.js",
        "code_snippet": "document.innerHTML = req.query.name;",
    })
    assert patch == "document.textContent = req.query.name;"
