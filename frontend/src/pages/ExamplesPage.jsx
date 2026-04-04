import TrustPage from '../components/TrustPage'

const sections = [
  {
    title: 'What a first PR should feel like',
    description: 'A new user should understand the product from a single pull request: summary check, inline comments, severity breakdown, and report visibility in the dashboard.',
    points: [
      'Summary check that tells reviewers whether the PR should merge.',
      'Inline comments anchored to exact changed lines with remediation guidance.',
      'Dashboard run entry that links the GitHub review back to the analysis record.',
      'Taxonomy-backed findings so teams can tie issues to CWE and compliance language.',
    ],
  },
  {
    title: 'Example review format',
    description: 'The GitHub output should stay concise. One PR summary, clustered findings, and line-level comments only for high-confidence issues.',
    points: [
      'Critical: open redirect with user-controlled URL.',
      'High: reflected XSS in checkout confirmation template.',
      'Medium: weak cookie policy on helper function.',
      'Fix suggestions that tell the engineer what to change, not just what is wrong.',
    ],
  },
]

export default function ExamplesPage() {
  return (
    <TrustPage
      eyebrow="Examples"
      title="Sample PR reviews before a team installs anything"
      intro="Examples remove the blank-page problem. They show what Mitig8it writes in GitHub, what the dashboard records, and what engineers are expected to do next."
      sections={sections}
      ctaTitle="Try the same flow in your own repo"
      ctaText="Install the app on one repository, open a test PR, and compare the output against this example."
    />
  )
}
