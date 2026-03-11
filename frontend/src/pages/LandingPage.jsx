import { useAuth } from '../contexts/AuthContext'

export default function LandingPage() {
  const { loginWithGitHub } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-24">
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">GitHub-native security reviewer</p>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-900">
            Security findings developers trust, directly inside pull requests.
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            CodeSentry finds likely vulnerabilities in changed code, explains exploitability with evidence,
            and proposes minimal safe remediations with low-noise PR comments.
          </p>
          <button
            onClick={loginWithGitHub}
            className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Continue with GitHub
          </button>
        </div>
      </div>
    </div>
  )
}
