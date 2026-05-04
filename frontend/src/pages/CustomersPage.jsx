import TrustPage from '../components/TrustPage'

const sections = [
  {
    title: 'Best fit today',
    description: 'The current product fits teams that already merge through GitHub and want review-time security feedback without adding another console.',
    points: [
      'Product teams that want security review without adding CI setup.',
      'Security or platform teams that need findings tied to pull requests.',
      'Engineering leads who want less scanner noise in code review.',
    ],
  },
  {
    title: 'Why they use it',
    description: 'The current value is strongest when the team wants one clear first-run workflow, not a giant platform rollout.',
    points: [
      'Inline GitHub comments and summary checks instead of a separate console.',
      'Security-focused findings rather than broad code review noise.',
      'A dashboard that keeps review history and setup state in one place.',
    ],
  },
]

export default function CustomersPage() {
  return (
    <TrustPage
      eyebrow="Customers"
      title="Who Mitig8it fits right now"
      intro="Mitig8it is strongest today for teams that want to start with one repository, validate the PR review workflow, and expand only after the signal earns trust."
      sections={sections}
      ctaTitle="See the workflow before you install"
      ctaText="The examples page shows exactly what a new team should expect from the current product surface."
      ctaLink="/examples"
      ctaLabel="Open examples"
    />
  )
}
