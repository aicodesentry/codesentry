import TrustPage from '../components/TrustPage'

const sections = [
  {
    title: 'Best fit today',
    description: 'Mitig8it fits teams that already merge through GitHub and want security review inside that workflow.',
    points: [
      'Product teams that want security review without adding CI setup.',
      'Security or platform teams that need findings tied to pull requests.',
      'Engineering leads who want less scanner noise in code review.',
    ],
  },
  {
    title: 'Why they use it',
    description: 'The value is simple: faster review, clearer risk, and less tab switching.',
    points: [
      'Inline GitHub comments and summary checks instead of a separate console.',
      'Security-focused findings rather than broad code review noise.',
      'A dashboard that keeps review history and next steps in one place.',
    ],
  },
]

export default function CustomersPage() {
  return (
    <TrustPage
      eyebrow="Customers"
      title="Who Mitig8it fits right now"
      intro="This is a beta product for teams that already review in GitHub and want security feedback to show up in the pull request itself."
      sections={sections}
      ctaTitle="See the setup path"
      ctaText="Install the app, open a pull request, and review the findings in GitHub."
    />
  )
}
