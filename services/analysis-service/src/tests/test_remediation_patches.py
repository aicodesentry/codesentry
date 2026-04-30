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


def test_generates_php_secret_patch():
    patch = build_remediation_patch({
        "rule_id": "secret.hardcoded.credential",
        "title": "Hardcoded secret or credential",
        "category": "sensitive data exposure",
        "cwe_id": "CWE-798",
        "file_path": "test_vuln.php",
        "code_snippet": '$api_key = "sk_live_123";',
    })
    assert patch == '$api_key = getenv("API_KEY");'


def test_generates_php_command_injection_patch():
    patch = build_remediation_patch({
        "rule_id": "code.injection.eval",
        "title": "Code injection via eval or dynamic execution",
        "category": "code injection",
        "cwe_id": "CWE-78",
        "file_path": "test_vuln.php",
        "code_snippet": "exec($_POST['cmd']);",
    })
    assert patch == 'throw new RuntimeException("Refusing to execute user-controlled commands");'


def test_replaces_md5_with_sha256_python():
    patch = build_remediation_patch({
        "rule_id": "crypto.weak.md5",
        "title": "Use of weak hash function",
        "category": "weak crypto",
        "cwe_id": "CWE-327",
        "file_path": "app.py",
        "code_snippet": "digest = hashlib.md5(payload).hexdigest()",
    })
    assert patch == "digest = hashlib.sha256(payload).hexdigest()"


def test_replaces_sha1_with_sha256_javascript():
    patch = build_remediation_patch({
        "rule_id": "crypto.weak.sha1",
        "title": "Insecure cryptography",
        "category": "Insecure Cryptography",
        "cwe_id": "CWE-327",
        "file_path": "app.js",
        "code_snippet": 'const h = crypto.createHash("sha1").update(data).digest("hex");',
    })
    assert patch == 'const h = crypto.createHash("sha256").update(data).digest("hex");'


def test_replaces_md5_new_with_sha256_go():
    patch = build_remediation_patch({
        "rule_id": "crypto.weak.md5",
        "title": "Weak hash",
        "category": "weak crypto",
        "cwe_id": "CWE-327",
        "file_path": "hash.go",
        "code_snippet": "h := md5.New()",
    })
    assert patch == "h := sha256.New()"


def test_flips_verify_false_to_true_for_requests():
    patch = build_remediation_patch({
        "rule_id": "tls.verify_disabled",
        "title": "Certificate verification disabled",
        "category": "insecure tls",
        "cwe_id": "CWE-295",
        "file_path": "client.py",
        "code_snippet": 'resp = requests.get(url, verify=False)',
    })
    assert patch == 'resp = requests.get(url, verify=True)'


def test_replaces_yaml_load_with_safe_load():
    patch = build_remediation_patch({
        "rule_id": "deserialization.unsafe.yaml.load",
        "title": "Unsafe YAML deserialization",
        "category": "insecure deserialization",
        "cwe_id": "CWE-502",
        "file_path": "loader.py",
        "code_snippet": "data = yaml.load(stream)",
    })
    assert patch == "data = yaml.safe_load(stream)"


def test_yaml_safe_load_unchanged():
    patch = build_remediation_patch({
        "rule_id": "deserialization.unsafe.yaml.load",
        "title": "Unsafe YAML deserialization",
        "category": "insecure deserialization",
        "cwe_id": "CWE-502",
        "file_path": "loader.py",
        "code_snippet": "data = yaml.safe_load(stream)",
    })
    assert patch is None
