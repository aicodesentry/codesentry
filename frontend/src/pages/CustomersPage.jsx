import TrustPage from '../components/TrustPage'

const sections = [
  {
    title: 'Who this is for',
    description: 'Mitig8it fits teams that already review in GitHub and want security feedback where developers work, not in a disconnected scanner console.',
    points: [
      'Early-stage product teams that want one more pair of eyes on risky PRs.',
      'Platform or security teams that need auditable findings tied to pull requests.',
      'Engineering leaders who want security review without forcing CI rewrites.',
      'Teams evaluating BYOK or stricter data boundaries for AI-assisted remediation.',
    ],
  },
  {
    title: 'What they should care about',
    description: 'The promise is simpler reviews, clearer risk decisions, and faster fixes, not a vanity dashboard.',
    points: [
      'GitHub-native checks and comments instead of another inbox.',
      'Security-only findings with less review noise.',
      'Team rules and learning loop roadmap for organization-specific review behavior.',
      'A dashboard that explains what to do next, not just what happened.',
    ],
  },
]

export default function CustomersPage() {
  return (
    <TrustPage
      eyebrow="Customers"
      title="The kinds of teams Mitig8it is built for"
      intro="This product is still in beta, so the right customer story is about fit and workflow, not inflated enterprise claims."
      sections={sections}
      ctaTitle="See the onboarding path those teams follow"
      ctaText="The onboarding flow is where the product should become understandable in under three minutes."
    />
  )
}
