import TrustPage from '../components/TrustPage'

const sections = [
  {
    title: 'Live now: review usefulness metrics',
    description: 'The benchmark that matters most today is whether the right finding reaches the reviewer quickly and clearly.',
    points: [
      'Time to first PR comment after webhook receipt.',
      'Completed vs failed analysis runs over the last seven days.',
      'Raw findings vs clustered findings after dedupe.',
      'Which findings are strong enough to reach the PR reviewer.',
    ],
  },
  {
    title: 'Where quality improves next',
    description: 'Benchmarks should track the product roadmap instead of pretending everything is already complete.',
    points: [
      'Suggested remediation quality once that layer moves from in-progress to shipped.',
      'Review precision with stronger repository context over time.',
      'Whether future fix flows reduce time-to-resolution without lowering trust.',
    ],
  },
]

export default function BenchmarksPage() {
  return (
    <TrustPage
      eyebrow="Benchmarks"
      title="Benchmark the review loop, not just raw finding counts"
      intro="Mitig8it should be judged on what reaches the pull request reviewer, how much signal stays intact, and where the product still needs to improve."
      sections={sections}
      ctaTitle="Try the current review workflow"
      ctaText="Start with one repository and compare the first run against the quality bar described here."
    />
  )
}
