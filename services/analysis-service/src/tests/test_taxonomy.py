from taxonomy import build_taxonomy_metadata


class TestTaxonomyMappings:
    def test_builds_override_backed_metadata(self):
        taxonomy = build_taxonomy_metadata(
            rule_id="sql.injection.raw_query",
            category="SQL injection",
            cwe_id="CWE-89",
            owasp_category="A03:2021",
        )

        assert taxonomy["internal_type"] == "sql_injection"
        assert taxonomy["primary_cwe_id"] == "CWE-89"
        assert taxonomy["taxonomy_mappings"]["attack"] == ["T1190"]
        assert taxonomy["taxonomy_mappings"]["capec"] == ["CAPEC-66"]

    def test_preserves_explicit_attack_and_capec(self):
        taxonomy = build_taxonomy_metadata(
            rule_id="semgrep.custom.rule",
            category="security",
            cwe_id=["CWE-502"],
            owasp_category=["A08:2021"],
            internal_type="custom_deserialization",
            attack_techniques=["T1190"],
            capec_ids=["CAPEC-586"],
        )

        assert taxonomy["internal_type"] == "custom_deserialization"
        assert taxonomy["taxonomy_mappings"]["cwe"] == ["CWE-502"]
        assert taxonomy["taxonomy_mappings"]["owasp"] == ["A08:2021"]
        assert taxonomy["taxonomy_mappings"]["attack"] == ["T1190"]
        assert taxonomy["taxonomy_mappings"]["capec"] == ["CAPEC-586"]

    def test_uses_safe_defaults_for_unknown_rule(self):
        taxonomy = build_taxonomy_metadata(
            rule_id="unknown.rule",
            category="security misconfiguration",
        )

        assert taxonomy["internal_type"] == "unknown_rule"
        assert taxonomy["taxonomy_mappings"] == {
            "cwe": [],
            "owasp": [],
            "attack": [],
            "capec": [],
        }
