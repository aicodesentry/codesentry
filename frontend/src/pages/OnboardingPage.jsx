import { useAuth } from '../contexts/AuthContext'

export default function OnboardingPage() {
  const { githubAppInstallUrl } = useAuth()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Onboarding</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-700">
          Install the CodeSentry GitHub App on your repositories or organization to enable webhook-driven PR analysis.
        </p>
        {githubAppInstallUrl ? (
          <a
            href={githubAppInstallUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Install CodeSentry GitHub App
          </a>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Set `GITHUB_APP_SLUG` to render install URL.</p>
        )}
      </div>
    </div>
  )
}
