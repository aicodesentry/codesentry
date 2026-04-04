import TrustPage from '../components/TrustPage'

const sections = [
  {
    title: 'Deployment posture',
    description: 'The product should explain where code flows, what is persisted, and which services are exposed to the internet.',
    points: [
      'Frontend on Firebase Hosting with Cloud Run services behind it.',
      'Webhook-driven PR analysis pipeline with authenticated internal service calls.',
      'PostgreSQL for findings, runs, repositories, and user settings.',
      'Production hardening work focused on cookie auth, scoped findings, and access repair.',
    ],
  },
  {
    title: 'Data boundaries',
    description: 'Security buyers want to know what happens to repository content and what controls exist around model usage.',
    points: [
      'Findings persist only the evidence needed for review and auditability.',
      'BYOK is the long-term answer for teams that want their own model provider and key ownership.',
      'LLM features should enrich findings after deterministic analysis, not replace the security engine.',
      'Taxonomy metadata makes it easier to map findings into compliance and reporting workflows.',
    ],
  },
]

export default function SecurityPage() {
  return (
    <TrustPage
      eyebrow="Security"
      title="How Mitig8it handles code, reviews, and model boundaries"
      intro="A security product needs to explain its own security posture clearly. This page is the public-facing version of that story."
      sections={sections}
      ctaTitle="Review the current architecture inside the app"
      ctaText="The dashboard and reports now reflect the actual production pipeline. The public story should stay aligned with that implementation."
      ctaLink="/dashboard"
      ctaLabel="Open dashboard"
    />
  )
}
