# Source-to-Sink Gap Report

## Current State

You already have the right high-level shape for a 3-tier pipeline.

### 1. Tier 1: fast heuristic detection

In [main.py](/Users/nehachaudhari/Developer/codesentry/services/analysis-service/src/main.py:280), Tier 1 loops through `SECURITY_RULES`, runs regex/pattern checks against PR patch content, and emits normalized findings.

What this gives you:
- cheap broad coverage
- fast PR feedback
- good recall for obvious cases
- fallback coverage when AST/dataflow misses

What it does not give you:
- source-to-sink proof
- sanitizer awareness
- variable propagation
- helper/function/context reasoning

### 2. Tier 2: AST-backed structured scanning

In [main.py](/Users/nehachaudhari/Developer/codesentry/services/analysis-service/src/main.py:300), Tier 2 calls [opengrep_runner.py](/Users/nehachaudhari/Developer/codesentry/services/analysis-service/src/opengrep_runner.py:70), which:
- reconstructs temp files from PR patches
- runs Semgrep/OpenGrep YAML rules from [opengrep_rules/](/Users/nehachaudhari/Developer/codesentry/services/analysis-service/src/opengrep_rules)
- converts matches into your unified finding format

What this gives you:
- AST-aware matching
- better precision than Tier 1
- language-specific rules
- structured findings that fit the rest of the pipeline

What it does not yet give you reliably:
- full-file context
- cross-hunk context
- robust source-to-sink dataflow
- sanitizer-aware suppression
- interprocedural or cross-file flow

The biggest limitation is in [opengrep_runner.py](/Users/nehachaudhari/Developer/codesentry/services/analysis-service/src/opengrep_runner.py:95): it writes extracted patch content, not full source snapshots. That means Tier 2 loses surrounding assignments, unchanged helper code, sanitizer functions, and broader control/data flow.

### 3. Tier 3: AI triage

In [main.py](/Users/nehachaudhari/Developer/codesentry/services/analysis-service/src/main.py:325), Tier 3 takes existing findings and performs LLM triage. In the API orchestration path, [prAnalysisOrchestrator.js](/Users/nehachaudhari/Developer/codesentry/services/api-service/src/services/prAnalysisOrchestrator.js:584) also injects repo profile context into Tier 3.

What this gives you:
- false-positive reduction
- repo-aware reasoning
- better remediation messaging
- prioritization/refinement after deterministic detection

What it does not give you by itself:
- deterministic proof of taint flow
- stable source/sink evidence
- explainable program analysis traces

### 4. Repo profiling

You also have repo profiling in the API service and profile worker:
- [profileWorker.js](/Users/nehachaudhari/Developer/codesentry/services/api-service/src/services/profileWorker.js:46)
- [repositories.js](/Users/nehachaudhari/Developer/codesentry/services/api-service/src/db/repositories.js:245)

What this gives you:
- repository-level AI context
- likely language/framework/environment understanding
- potential for repo-specific triage and remediation

This is valuable, but it is contextual intelligence, not a deterministic taint engine.

## What You Already Have Architecturally

You already have most of the system scaffolding needed for an Aikido-style evolution:

- multi-stage pipeline
- unified finding model
- AST scanner integration
- AI triage stage
- repo-level contextual profiling
- clustering/normalization logic
- PR comment/review generation

That means you do not need a redesign. You need a Tier 2 upgrade.

## What Is Missing To Reach Source-to-Sink Dataflow

### 1. Full source context in Tier 2

Current Tier 2 scans reconstructed patch fragments. To do real taint/dataflow, Tier 2 needs:
- full changed file contents at PR head, minimum
- ideally repo snapshot or checkout for broader resolution
- line mapping back to changed hunks for review comments

Without this, even intra-file taint is weakened.

### 2. Taint-style rules instead of mostly sink-shape rules

Current OpenGrep usage is mostly search/pattern mode. To move toward source-to-sink, Tier 2 needs rules that explicitly model:
- sources
- sinks
- sanitizers
- propagators where needed

For example:
- sources: `req.query`, `req.params`, `req.body`, `r.URL.Query().Get(...)`, `FormValue(...)`
- sinks: file reads, SQL execution, template rendering, redirects, command execution
- sanitizers: allowlist validators, escaping functions, path normalization plus base-dir enforcement

### 3. Structured evidence output from Tier 2

Tier 2 findings should contain more than “rule matched here.”
They should expose something like:
- `source`
- `sink`
- `propagation_steps`
- `sanitizers_seen`
- `unsanitized_path`
- `trace_summary`
- `analysis_scope` (`pattern`, `taint-intraprocedural`, `taint-interprocedural`)

This is what lets Tier 3 reason well instead of guessing.

### 4. Sanitizer registry / repo-specific trust model

You need a way to distinguish:
- real sanitizers
- fake/no-op wrappers
- repo-local safe abstractions
- framework helpers that are conditionally safe

This is where repo profiling can help:
- infer likely sanitizer helpers
- identify framework/router patterns
- provide repo-specific allowlists for Tier 3 or even Tier 2 configuration

### 5. Reachability-lite signals

Before full Aikido-style reachability, you can still add useful deterministic context:
- is the sink inside an HTTP handler or public route?
- is the flow on code reachable from changed files?
- is the vulnerable path test-only/dev-only?
- is the sink behind auth/admin/internal-only code?
- is the changed code introducing the source, propagation, or sink?

This can sharply reduce noise even without full whole-program reachability.

### 6. Interprocedural/cross-file strategy

This is the hard part. OSS Semgrep/OpenGrep-style scanning can improve intra-file taint a lot, but true cross-function/cross-file taint is a higher bar.
To get closer, you need one of:
- stronger scanner support for interprocedural analysis
- a custom lightweight call/data flow layer
- targeted repo graphing for common frameworks and route handlers

You do not need to solve this fully on day one. Intra-file taint over full file snapshots is already a meaningful upgrade.

## Recommended Target Architecture

Keep the 3 tiers. Change the contract between them.

### 1. Tier 1: suspicion layer

Keep:
- regex heuristics
- cheap pattern rules
- fast diff-based coverage

Purpose:
- broad recall
- early signal
- candidate generation

### 2. Tier 2: deterministic evidence layer

Upgrade it to:
- scan full file or repo snapshot, not patch-only text
- run taint-aware rules where applicable
- emit source/sink/sanitizer evidence
- preserve AST/pattern mode for classes that don’t need taint

Purpose:
- produce structured proof
- reduce ambiguity
- provide explainable findings

### 3. Tier 3: contextual judgment layer

Use repo profile plus Tier 2 evidence to:
- suppress false positives
- judge exploitability
- tailor remediation to repo conventions
- decide whether to comment inline or keep internal

Purpose:
- repo-aware prioritization
- high-confidence review comments

## What Repo Profiling Should Do

Repo profiling should support, not replace, source-to-sink analysis.

Best uses:
- infer frameworks/libraries
- detect likely entry points
- identify sanitizer/helper candidates
- classify internal vs public routes
- understand auth/session patterns
- improve remediation patches
- help Tier 3 decide whether a deterministic flow is exploitable here

Bad use:
- relying on profiling alone to “guess” whether taint exists

The right relationship is:
- Tier 2 proves or strongly suggests flow
- repo profile explains the repo
- Tier 3 makes the final call

## Practical Implementation Phases

### 1. Phase 1: Fix Tier 2 input model
- stop scanning patch-only reconstructed files for taint-sensitive classes
- fetch full file contents for changed files
- keep diff-to-source line mapping

### 2. Phase 2: Convert high-value classes to taint rules

Start with:
- path traversal
- command injection
- SSRF
- SQL injection
- XSS in server-rendered paths
- open redirect where applicable

### 3. Phase 3: Extend finding schema

Add:
- source metadata
- sink metadata
- sanitizer metadata
- trace summary
- deterministic confidence basis

### 4. Phase 4: Make Tier 3 evidence-aware

Prompt Tier 3 with:
- source
- sink
- sanitizers
- code trace
- repo profile
instead of only raw findings

### 5. Phase 5: Add reachability-lite
- route awareness
- auth/public exposure signals
- changed-path relevance
- test/dev-only suppression

### 6. Phase 6: Evaluate interprocedural/cross-file options
- stronger scanner capability
- custom flow graph for supported frameworks
- selectively enable for high-severity classes only

## What You Do Not Need To Change

You do not need to replace:
- the 3-tier model
- repo profiling
- Tier 1 heuristics
- Tier 3 AI triage
- the unified finding pipeline

Those are assets, not problems.

## Bottom Line

You already have:
- heuristics
- AST scanning
- AI triage
- AI repo profiling
- a workable 3-tier architecture

You do not yet have:
- robust deterministic source-to-sink analysis
- full-context Tier 2 scanning
- sanitizer-aware taint modeling
- structured taint traces
- reachability-style evidence

So the shortest accurate summary is:

Your architecture is already compatible with an Aikido-like model. The missing work is concentrated in Tier 2: move from patch-scoped pattern matching to full-context taint/dataflow analysis, then let repo profiling and Tier 3 make that evidence repo-aware and actionable.
