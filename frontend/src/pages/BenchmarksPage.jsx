import TrustPage from '../components/TrustPage'

const sections = [
  {
    title: 'What we measure',
    description: 'We care about review usefulness, not inflated issue counts.',
    points: [
      'Time to first PR comment after webhook receipt.',
      'Completed vs failed analysis runs over the last seven days.',
      'Raw findings vs clustered findings after dedupe.',
      'Which findings are strong enough to reach the PR reviewer.',
    ],
  },
  {
    title: 'What we optimize for',
    description: 'Mitig8it is strongest when judged on practical PR output.',
    points: [
      'Security findings instead of general lint or style commentary.',
      'Evidence tied to the matching diff hunk.',
      'Clustered output so the same issue does not spam the PR.',
    ],
  },
]

export default function BenchmarksPage() {
  return (
    <TrustPage
      eyebrow="Benchmarks"
      title="Measure review quality, not just issue volume"
      intro="A tool that posts more comments is not automatically the better reviewer. The useful benchmark is whether the right finding reaches the reviewer quickly and clearly."
      sections={sections}
      ctaTitle="Inspect the run history"
      ctaText="The reports page shows the current analysis pipeline and run outcomes."
      ctaLink="/dashboard/reports"
      ctaLabel="Open reports"
    />
  )
}
