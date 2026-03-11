# Known Limitations (V1)

- Deterministic rules are intentionally narrow and prioritize precision over broad recall.
- Dependency risk checks are pattern-based, not a full SBOM/CVE resolver.
- Inline comment dedupe is fingerprint-based and may miss nuanced semantic duplicates.
- RBAC is owner-scoped for dashboard users and does not yet model fine-grained org team membership.
- No billing/plan enforcement logic is included in this V1.
- LLM contextualization hook is not enabled by default in the current implementation.
