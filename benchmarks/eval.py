"""
CodeSentry Model Benchmark Evaluator

Runs code snippets from the dataset against candidate LLMs and measures
detection accuracy (precision, recall, F1), latency, and cost.

Usage:
    export ANTHROPIC_API_KEY=sk-...
    python benchmarks/eval.py --model claude-sonnet-4-6
    python benchmarks/eval.py --model claude-haiku-4-5-20251001
    python benchmarks/eval.py --model claude-opus-4-6 --samples 10
"""

import argparse
import json
import time
import os
import glob
from dataclasses import dataclass, asdict
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("Install the Anthropic SDK: pip install anthropic")
    raise SystemExit(1)


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DATASET_DIR = Path(__file__).parent / "dataset"
RESULTS_DIR = Path(__file__).parent / "results"

SYSTEM_PROMPT = """You are a security code reviewer. Analyze the following code snippet and determine if it contains a security vulnerability.

Respond with ONLY a JSON object (no markdown, no explanation) in this exact format:
{
  "verdict": "vulnerable" or "safe",
  "cwe": "CWE-XXX" or null,
  "severity": "critical" | "high" | "medium" | "low" | null,
  "confidence": 0.0 to 1.0,
  "reasoning": "one sentence explanation"
}"""

# Approximate pricing per 1M tokens (input/output) as of 2025
MODEL_PRICING = {
    "claude-opus-4-6": {"input": 15.0, "output": 75.0},
    "claude-sonnet-4-6": {"input": 3.0, "output": 15.0},
    "claude-haiku-4-5-20251001": {"input": 0.80, "output": 4.0},
}


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

@dataclass
class Sample:
    id: str
    language: str
    cwe: str | None
    expected_verdict: str  # "vulnerable" or "safe"
    description: str
    code: str
    severity: str | None = None


@dataclass
class Result:
    sample_id: str
    expected_verdict: str
    predicted_verdict: str
    predicted_cwe: str | None
    confidence: float
    correct: bool
    latency_ms: float
    input_tokens: int
    output_tokens: int


def load_dataset() -> list[Sample]:
    samples = []
    for json_path in sorted(glob.glob(str(DATASET_DIR / "**/*.json"), recursive=True)):
        with open(json_path) as f:
            entries = json.load(f)
        for entry in entries:
            samples.append(Sample(
                id=entry["id"],
                language=entry["language"],
                cwe=entry.get("cwe"),
                expected_verdict=entry["expected_verdict"],
                description=entry["description"],
                code=entry["code"],
                severity=entry.get("severity"),
            ))
    return samples


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------

def evaluate_sample(client: anthropic.Anthropic, model: str, sample: Sample) -> Result:
    user_msg = f"Language: {sample.language}\n\n```\n{sample.code}\n```"

    start = time.time()
    response = client.messages.create(
        model=model,
        max_tokens=300,
        temperature=0,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )
    latency_ms = (time.time() - start) * 1000

    raw = response.content[0].text.strip()
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        # Try extracting JSON from markdown fence
        if "```" in raw:
            raw = raw.split("```")[1].strip()
            if raw.startswith("json"):
                raw = raw[4:].strip()
            parsed = json.loads(raw)
        else:
            parsed = {"verdict": "error", "cwe": None, "confidence": 0}

    predicted = parsed.get("verdict", "error").lower()
    correct = predicted == sample.expected_verdict

    return Result(
        sample_id=sample.id,
        expected_verdict=sample.expected_verdict,
        predicted_verdict=predicted,
        predicted_cwe=parsed.get("cwe"),
        confidence=parsed.get("confidence", 0),
        correct=correct,
        latency_ms=round(latency_ms, 1),
        input_tokens=response.usage.input_tokens,
        output_tokens=response.usage.output_tokens,
    )


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------

def compute_metrics(results: list[Result], model: str) -> dict:
    total = len(results)
    correct = sum(1 for r in results if r.correct)

    # True/False Positives/Negatives
    tp = sum(1 for r in results if r.expected_verdict == "vulnerable" and r.predicted_verdict == "vulnerable")
    fp = sum(1 for r in results if r.expected_verdict == "safe" and r.predicted_verdict == "vulnerable")
    fn = sum(1 for r in results if r.expected_verdict == "vulnerable" and r.predicted_verdict != "vulnerable")
    tn = sum(1 for r in results if r.expected_verdict == "safe" and r.predicted_verdict == "safe")

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

    total_input_tokens = sum(r.input_tokens for r in results)
    total_output_tokens = sum(r.output_tokens for r in results)
    pricing = MODEL_PRICING.get(model, {"input": 0, "output": 0})
    total_cost = (total_input_tokens / 1_000_000 * pricing["input"] +
                  total_output_tokens / 1_000_000 * pricing["output"])

    avg_latency = sum(r.latency_ms for r in results) / total if total > 0 else 0

    return {
        "model": model,
        "total_samples": total,
        "accuracy": round(correct / total, 3) if total > 0 else 0,
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "f1_score": round(f1, 3),
        "true_positives": tp,
        "false_positives": fp,
        "true_negatives": tn,
        "false_negatives": fn,
        "avg_latency_ms": round(avg_latency, 1),
        "total_input_tokens": total_input_tokens,
        "total_output_tokens": total_output_tokens,
        "total_cost_usd": round(total_cost, 4),
        "cost_per_scan_usd": round(total_cost / total, 5) if total > 0 else 0,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="CodeSentry model benchmark")
    parser.add_argument("--model", required=True, help="Model ID to evaluate")
    parser.add_argument("--samples", type=int, default=0, help="Limit number of samples (0 = all)")
    args = parser.parse_args()

    client = anthropic.Anthropic()
    samples = load_dataset()

    if args.samples > 0:
        samples = samples[:args.samples]

    print(f"Evaluating {args.model} on {len(samples)} samples...\n")

    results = []
    for i, sample in enumerate(samples):
        try:
            result = evaluate_sample(client, args.model, sample)
            results.append(result)
            status = "CORRECT" if result.correct else "WRONG"
            print(f"  [{i+1}/{len(samples)}] {sample.id}: {status} "
                  f"(expected={sample.expected_verdict}, got={result.predicted_verdict}, "
                  f"{result.latency_ms:.0f}ms)")
        except Exception as e:
            print(f"  [{i+1}/{len(samples)}] {sample.id}: ERROR — {e}")

    metrics = compute_metrics(results, args.model)

    print(f"\n{'='*60}")
    print(f"Results for {args.model}")
    print(f"{'='*60}")
    print(f"  Accuracy:     {metrics['accuracy']:.1%}")
    print(f"  Precision:    {metrics['precision']:.1%}")
    print(f"  Recall:       {metrics['recall']:.1%}")
    print(f"  F1 Score:     {metrics['f1_score']:.1%}")
    print(f"  Avg Latency:  {metrics['avg_latency_ms']:.0f}ms")
    print(f"  Total Cost:   ${metrics['total_cost_usd']:.4f}")
    print(f"  Cost/Scan:    ${metrics['cost_per_scan_usd']:.5f}")
    print(f"  TP={metrics['true_positives']} FP={metrics['false_positives']} "
          f"TN={metrics['true_negatives']} FN={metrics['false_negatives']}")

    # Save results
    RESULTS_DIR.mkdir(exist_ok=True)
    model_slug = args.model.replace("/", "_")
    with open(RESULTS_DIR / f"{model_slug}_results.json", "w") as f:
        json.dump({
            "metrics": metrics,
            "results": [asdict(r) for r in results],
        }, f, indent=2)

    print(f"\nResults saved to benchmarks/results/{model_slug}_results.json")


if __name__ == "__main__":
    main()
