import TrustPage from '../components/TrustPage'

const sections = [
  {
    title: 'What we care about',
    description: 'Benchmarks should be honest. The point is not to inflate issue counts; it is to improve signal quality and reviewer usefulness.',
    points: [
      'Time to first PR comment after webhook receipt.',
      'Completed vs failed analysis runs over the last seven days.',
      'Raw findings vs clustered findings after dedupe.',
      'Reviewer-facing comment rate for high-confidence issues.',
    ],
  },
  {
    title: 'How we compare',
    description: 'Mitig8it is strongest when judged on practical review output: lower noise, stronger evidence, clearer remediation, and security-specific focus.',
    points: [
      'Security-only positioning instead of general lint or style review.',
      'Evidence snippets pulled from the exact matching diff hunk.',
      'Clustered issue output so semgrep and deterministic matches do not spam the same PR.',
      'BYOK roadmap for teams that want their own model keys and audit boundaries.',
    ],
  },
]

export default function BenchmarksPage() {
  return (
    <TrustPage
      eyebrow="Benchmarks"
      title="Measure review quality, not just issue volume"
      intro="The benchmark story should center on speed, usefulness, and noise reduction. A scanner that posts more comments is not automatically the better reviewer."
      sections={sections}
      ctaTitle="Inspect the live run history"
      ctaText="The reports page already exposes the production pipeline. Use it as the baseline for benchmark instrumentation."
      ctaLink="/dashboard/reports"
      ctaLabel="Open reports"
    />
  )
}
