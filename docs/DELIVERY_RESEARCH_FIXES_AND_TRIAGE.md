# Delivery Research: Fix Flows And False-Positive Reduction

Date: May 21, 2026

## Goal

Capture the highest-leverage external capabilities that can help Mitig8it ship:

- Dependabot-style dependency remediation
- one-click or near-one-click fixes for findings
- lower false-positive rates with measurable accuracy

## Key Findings

### 1. GitHub suggested changes are the fastest path to "one-click" fixes

GitHub supports applying review suggestions directly from a pull request, either one at a time or as a batch. This already matches the product behavior we want for many inline findings, without building a custom patch-application UI first.

Implication for Mitig8it:

- Keep investing in `remediation_patch`
- keep rendering GitHub ````suggestion```` blocks for eligible findings
- expand the set of findings that can safely produce validated inline suggestions

Primary source:

- https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/incorporating-feedback-in-your-pull-request

### 2. Dependabot should be treated as the native dependency-remediation lane

Dependabot alerts already provide:

- fixed-version metadata
- dismiss/reopen lifecycle
- assignment
- security UI integration

GitHub docs now also describe agent-assigned alerts opening draft PRs with proposed fixes.

Implication for Mitig8it:

- do not overbuild custom dependency remediation first
- integrate with native Dependabot alerts where possible
- use Mitig8it to add prioritization, triage, and context on top

Primary sources:

- https://docs.github.com/en/code-security/concepts/supply-chain-security/about-dependabot-alerts
- https://docs.github.com/en/rest/dependabot/alerts?apiVersion=2022-11-28

### 3. Dependabot auto-triage rules can reduce noise before users see it

GitHub recommends using Dependabot auto-triage rules to auto-dismiss low-risk alerts before notifications are sent.

Implication for Mitig8it:

- for dependency findings, native GitHub triage can reduce noisy alerts before our product needs to step in
- Mitig8it can focus on higher-value dependency context, ranking, grouping, and fix guidance

Primary sources:

- https://docs.github.com/en/code-security/concepts/supply-chain-security/about-dependabot-alerts
- https://docs.github.com/en/code-security/how-tos/manage-security-alerts/manage-dependabot-alerts

### 4. SARIF is the best bridge into GitHub's security workflow for custom findings

GitHub supports third-party SARIF uploads for code scanning alerts. Stable fingerprints are important to avoid duplicate alerts across runs.

Implication for Mitig8it:

- custom Mitig8it findings can move from "review comments only" into durable GitHub security alerts
- SARIF gives us alert lifecycle, a security inbox, and a clearer path toward GitHub-native remediation features
- our existing fingerprint model is already a strong fit for SARIF

Primary sources:

- https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/uploading-a-sarif-file-to-github
- https://docs.github.com/en/code-security/reference/code-scanning/sarif-files/sarif-support-for-code-scanning?learn=code_security_integration
- https://docs.github.com/en/rest/code-scanning

### 5. GitHub code scanning + Copilot Autofix is strategically relevant, but not the first delivery bet

GitHub documents Copilot Autofix for code scanning and exposes code scanning autofix endpoints. However, GitHub also notes that alerts from third-party tools may not include all properties seen in default CodeQL alerts.

Inference:

- Mitig8it should not assume first-class autofix parity for all custom findings immediately after SARIF upload
- SARIF is still the right structural move, but autofix support should be validated incrementally

Primary sources:

- https://docs.github.com/en/code-security/concepts/code-scanning/copilot-autofix-for-code-scanning
- https://docs.github.com/en/code-security/code-scanning/managing-code-scanning-alerts/about-code-scanning-alerts
- https://docs.github.com/en/rest/code-scanning

### 6. Semgrep's split between deterministic fixes and AI autofix is a good product model

Semgrep supports:

- declarative rule-level `fix`
- `--autofix` application
- an Autofix flow that creates a branch and draft PR

Implication for Mitig8it:

- deterministic fixes should be expanded where the rule is strong and low-risk
- AI-generated fixes should remain approval-driven and layered on top of deterministic evidence

Primary sources:

- https://semgrep.dev/docs/writing-rules/rule-syntax
- https://semgrep.dev/docs/semgrep-code/triage-remediation/autofix

### 7. OpenAI Structured Outputs and Evals are the best fit for hardening Tier 3

OpenAI now provides:

- Structured Outputs for schema-constrained model responses
- Evals and Graders for repeatable quality measurement

Implication for Mitig8it:

- replace brittle free-form JSON parsing assumptions with schema-enforced outputs
- build evals for verdict correctness, false-positive suppression, severity adjustment, and fix quality

Primary sources:

- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/graders
- https://developers.openai.com/api/reference/resources/evals

## Recommended Product Split

Use two lanes instead of one:

### A. Pull-request lane

Best for:

- fast reviewer feedback
- inline comments
- GitHub suggestion blocks
- near-one-click fixes on changed lines

### B. Security-alert lane

Best for:

- durable alert lifecycle
- dismiss/reopen/governance
- dependency remediation
- long-lived code scanning results
- future autofix experiments via GitHub-native workflows

## Recommended Delivery Order

1. Expand and harden GitHub suggestion-based fix delivery for existing PR review comments.
2. Route dependency remediation through native Dependabot workflows where possible.
3. Add SARIF export/upload for Mitig8it custom findings.
4. Upgrade Tier 3 output handling to structured outputs and add proper evals/graders.
5. Only then consider a custom branch/commit/draft-PR remediation engine for findings that cannot use GitHub-native mechanisms.

## Top Priority

The top priority right now is:

**finish and ship the GitHub suggestion-based fix flow for eligible findings**

Why this is first:

- the repo already contains most of the backend primitives
- it is the shortest path to user-visible "one-click fix" behavior
- it builds directly on the current `remediation_patch` and validation pipeline
- it does not require waiting on SARIF integration, Dependabot integration, or a custom branch-writing system

Concretely, this means:

- increase safe auto-fix coverage for common finding classes
- ensure Tier 3 consistently emits valid `remediation_patch` values
- improve validation and rendering rates for GitHub suggestions
- expose suggestion/fix outcomes clearly in the product

## What Not To Do First

Do not start with a custom Dependabot clone or a fully custom auto-commit PR generator.

Those paths are heavier, harder to govern, and duplicate GitHub-native workflows that already exist.
