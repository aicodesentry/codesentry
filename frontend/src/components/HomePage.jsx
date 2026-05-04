import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  GitPullRequest,
  Shield,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Header from './Header'
import Footer from './Footer'
import ProductSurface from './ProductSurface'

const REVIEW_SCREENSHOT_PATH = '/proof/github-pr-xss-review.png?v=2'

const GitHubIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      clipRule="evenodd"
    />
  </svg>
)

const benefits = [
  {
    icon: GitPullRequest,
    title: 'Inside GitHub',
    desc: 'Findings show up as pull request comments and review summaries where engineers already review code.',
  },
  {
    icon: ShieldAlert,
    title: 'High-signal findings',
    desc: 'Mitig8it focuses on exploitable issues with severity, confidence, and fix direction.',
  },
  {
    icon: Shield,
    title: 'Developer-controlled fixes',
    desc: 'Teams stay in charge of every change while getting faster security feedback.',
  },
]

const workflow = [
  {
    step: '01',
    title: 'Install the GitHub App',
    desc: 'Connect one repository or one organization. No CI config and no YAML setup.',
  },
  {
    step: '02',
    title: 'Open a pull request',
    desc: 'Mitig8it reviews changed code and posts the most relevant findings inline.',
  },
  {
    step: '03',
    title: 'Review and fix in GitHub',
    desc: 'Developers get severity, confidence, and remediation guidance without leaving the PR.',
  },
]

const resources = [
  {
    to: '/examples',
    title: 'Sample reviews',
    desc: 'See the exact GitHub output a new team should expect from the first run.',
  },
  {
    to: '/security',
    title: 'Security posture',
    desc: 'Review deployment, storage, and access assumptions before connecting a repository.',
  },
  {
    to: '/benchmarks',
    title: 'Benchmarks',
    desc: 'See how we think about speed, signal quality, and practical review coverage.',
  },
]

const proofBullets = [
  'Inline comments on risky pull request lines',
  'Severity and confidence attached to each finding',
  'Review summaries posted directly in GitHub',
]

const productSurface = [
  {
    title: 'Inline PR comments',
    status: 'live',
    description: 'Mitig8it posts findings on the changed lines that introduced risk, directly inside GitHub.',
  },
  {
    title: 'Severity + confidence',
    status: 'live',
    description: 'Each review comment carries enough signal for engineers to judge urgency without another dashboard.',
  },
  {
    title: 'Suggested remediation',
    status: 'progress',
    description: 'Remediation guidance is being added so findings explain what to change next, not just what is wrong.',
  },
  {
    title: 'One-click fixes',
    status: 'upcoming',
    description: 'Fast approval flows for applying trusted fixes are planned after the core review workflow is stable.',
  },
]

const HomePage = () => {
  const { loginWithGitHub, user } = useAuth()
  const [proofImageUnavailable, setProofImageUnavailable] = useState(false)

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Header />

      <main className="overflow-hidden">
        <section className="relative border-b border-neutral-800/60">
          <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_34%)]" />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:px-8 lg:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
                GitHub-native AI security review
              </p>
              <h1 className="mt-5 text-5xl font-bold leading-[1.02] tracking-tight text-white sm:text-6xl">
                Catch exploitable code
                <span className="block text-neutral-400">before merge.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-neutral-300">
                Mitig8it posts high-signal security findings directly inside pull requests, where developers already review code.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/examples"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 shadow-sm transition hover:bg-neutral-200"
                >
                  See sample review
                  <ArrowRight className="h-4 w-4" />
                </Link>
                {user ? (
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900/60 px-5 py-2.5 text-sm font-medium text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-900"
                  >
                    Open workspace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <button
                    onClick={loginWithGitHub}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900/60 px-5 py-2.5 text-sm font-medium text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-900"
                  >
                    <GitHubIcon />
                    Start with GitHub
                  </button>
                )}
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-neutral-400">
                {proofBullets.map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-[28px] bg-emerald-400/10 blur-3xl" />
              <div className="relative rounded-3xl border border-neutral-800 bg-neutral-900/95 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                      What developers see in GitHub
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-white">
                      Real pull request security finding
                    </h2>
                  </div>
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                      Inline review
                    </span>
                  </div>
                {!proofImageUnavailable ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-800">
                    <img
                      src={REVIEW_SCREENSHOT_PATH}
                      alt="Mitig8it GitHub pull request review showing a high-severity XSS finding"
                      className="block w-full"
                      loading="eager"
                      onError={() => setProofImageUnavailable(true)}
                    />
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {[
                      ['High severity', 'Reflected XSS via unescaped user input in template', 'CWE-79'],
                      ['Medium severity', 'Missing Content-Security-Policy header', 'CWE-693'],
                    ].map(([severity, title, tag]) => (
                      <div key={title} className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-white">{title}</p>
                            <p className="mt-1 text-xs leading-5 text-neutral-400">
                              Inline comment with remediation context and taxonomy mapping.
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                              {severity}
                            </span>
                            <span className="mt-1 block text-[11px] text-neutral-500">{tag}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-4 text-sm leading-6 text-neutral-400">
                  Severity, confidence, and fix direction are posted directly inside the pull request.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-neutral-800/60 bg-neutral-900/35 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-500">
                Why teams use it
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                One product story, not five different tools
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {benefits.map((item) => (
                <div key={item.title} className="rounded-3xl border border-neutral-800 bg-neutral-900/95 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.2)] transition hover:border-neutral-700">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-800 text-emerald-200">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-neutral-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <ProductSurface
          title="What teams can use today, and what is still shipping"
          intro="Mitig8it already covers the core pull request review loop. The rest of the roadmap should be visible as staged product capabilities, not implied promises."
          items={productSurface}
        />

        <section className="border-b border-neutral-800/60 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[0.88fr_1.12fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-500">
                  How it works
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  From install to first review in three steps
                </h2>
                <p className="mt-4 max-w-md text-sm leading-7 text-neutral-400">
                  Keep the first run small. Connect one repository, open one pull request, and see the review show up inside GitHub.
                </p>
              </div>
              <div className="space-y-4">
                {workflow.map((item) => (
                  <div key={item.step} className="rounded-3xl border border-neutral-800 bg-neutral-900/95 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.2)] transition hover:border-neutral-700">
                    <div className="flex items-start gap-5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-950 text-sm font-semibold text-emerald-200">
                        {item.step}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-neutral-400">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-neutral-800/60 bg-neutral-900/35 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-500">
                Proof and trust
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Go deeper only after the core value is clear
              </h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {resources.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group rounded-3xl border border-neutral-800 bg-neutral-900/95 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.2)] transition hover:border-neutral-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-neutral-400">{item.desc}</p>
                    </div>
                    <Sparkles className="h-5 w-5 shrink-0 text-neutral-600 transition group-hover:text-emerald-200" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-[28px] border border-neutral-800 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(16,185,129,0.08))] px-8 py-14 text-center shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-500">
                Start small
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Try it on one repository first
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-neutral-300">
                Install the GitHub App, open a pull request, and see the first review land inside GitHub before rolling it out wider.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                {user ? (
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
                  >
                    Open workspace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <button
                    onClick={loginWithGitHub}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
                  >
                    <GitHubIcon />
                    Start with GitHub
                  </button>
                )}
                <Link
                  to="/examples"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900/40 px-5 py-2.5 text-sm font-medium text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-900"
                >
                  Review sample output
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default HomePage
