import TrustPage from '../components/TrustPage'

const sections = [
  {
    title: 'Current stack',
    description: 'The product should be clear about where code flows and what stores review data.',
    points: [
      'Frontend on Firebase Hosting with Cloud Run services behind it.',
      'Webhook-driven PR analysis pipeline with authenticated internal service calls.',
      'PostgreSQL for findings, runs, repositories, and user settings.',
      'Production hardening focused on auth, scoped findings, and access control.',
    ],
  },
  {
    title: 'Data boundaries',
    description: 'Security buyers want to know what is stored and what role AI plays.',
    points: [
      'Findings persist only the evidence needed for review and auditability.',
      'Deterministic analysis stays at the core of the review pipeline.',
      'AI explanations and remediation remain optional product layers.',
      'Taxonomy metadata helps map findings into reporting workflows.',
    ],
  },
]

export default function SecurityPage() {
  return (
    <TrustPage
      eyebrow="Security"
      title="How Mitig8it handles code, reviews, and model boundaries"
      intro="A security product should explain its own posture clearly. This page covers the current deployment model and the boundaries around review data."
      sections={sections}
      ctaTitle="Open the product"
      ctaText="The dashboard and reports reflect the current review pipeline."
      ctaLink="/dashboard"
      ctaLabel="Open dashboard"
    />
  )
}
