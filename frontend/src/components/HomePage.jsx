import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Filter,
  GitPullRequest,
  Layers,
  Shield,
  ShieldAlert,
  Target,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Header from './Header'
import Footer from './Footer'

const REVIEW_SCREENSHOT_PATH = '/proof/github-pr-xss-review.png'

const GitHubIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      clipRule="evenodd"
    />
  </svg>
)

const pillars = [
  {
    icon: GitPullRequest,
    title: 'GitHub-native',
    desc: 'Findings land as inline comments and summary checks inside the PR.',
  },
  {
    icon: ShieldAlert,
    title: 'Security-only',
    desc: 'Focused on security bugs with severity and taxonomy context.',
  },
  {
    icon: Filter,
    title: 'Low-noise output',
    desc: 'Cross-validation, deduping, and confidence scoring keep review usable.',
  },
]

const workflow = [
  {
    title: 'Connect the GitHub App',
    desc: 'Install Mitig8it on one repo or one org. No CI config, no YAML setup, no sidecar jobs.',
  },
  {
    title: 'Open a pull request',
    desc: 'Mitig8it reads the changed files, applies static + semantic detection, and clusters duplicate findings.',
  },
  {
    title: 'Review actionable output',
    desc: 'Developers get GitHub-native comments, a run summary, and a report trail inside the dashboard.',
  },
]

const trustLinks = [
  {
    to: '/examples',
    title: 'Examples',
    desc: 'Sample PR reviews and the exact GitHub output a new user should expect.',
  },
  {
    to: '/benchmarks',
    title: 'Benchmarks',
    desc: 'How we think about review speed, finding density, and false-positive reduction.',
  },
  {
    to: '/customers',
    title: 'Customers',
    desc: 'The kinds of teams this product is being built for during beta.',
  },
  {
    to: '/security',
    title: 'Security',
    desc: 'Deployment model, storage posture, and why BYOK matters for sensitive code paths.',
  },
]

const HomePage = () => {
  const { loginWithGitHub, user } = useAuth()
  const [proofImageUnavailable, setProofImageUnavailable] = useState(false)

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Header />

      <main className="overflow-hidden">
        {/* Hero */}
        <section className="border-b border-neutral-800/60">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:px-8 lg:py-20">
            <div className="max-w-xl">
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
                Security review for pull requests
              </p>
              <h1 className="mt-4 text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl">
                Catch vulnerabilities
                <span className="block text-neutral-400">before they merge.</span>
              </h1>
              <p className="mt-5 text-[15px] leading-7 text-neutral-400">
                Mitig8it posts inline security findings on every pull request. No CI config, no extra console — just GitHub-native review where developers already work.
              </p>
              <div className="mt-4 inline-flex rounded-md border border-neutral-700 bg-neutral-900 px-3.5 py-2 text-[13px] text-neutral-300">
                In beta — 16 users, live GitHub App, PR findings, dashboard.
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {user ? (
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 shadow-sm transition hover:bg-neutral-200"
                  >
                    Open workspace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <button
                    onClick={loginWithGitHub}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 shadow-sm transition hover:bg-neutral-200"
                  >
                    <GitHubIcon />
                    Start with GitHub
                  </button>
                )}
                <Link
                  to="/examples"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-700 px-5 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-neutral-500 hover:text-white"
                >
                  See a sample PR review
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-neutral-500">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-neutral-400" />
                  GitHub-native comments
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-neutral-400" />
                  CWE-mapped findings
                </span>
              </div>
            </div>

            {/* Hero card */}
            <div className="relative">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 shadow-2xl shadow-black/40">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">GitHub review output</p>
                    <h2 className="mt-1.5 text-base font-semibold text-white">Real PR finding in GitHub</h2>
                  </div>
                  <span className="rounded-full border border-neutral-700 bg-neutral-800 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-300">
                    High severity
                  </span>
                </div>
                {!proofImageUnavailable ? (
                  <div className="mt-4 overflow-hidden rounded-lg border border-neutral-800">
                    <img
                      src={REVIEW_SCREENSHOT_PATH}
                      alt="Mitig8it GitHub pull request review showing a high-severity XSS finding"
                      className="block w-full"
                      loading="eager"
                      onError={() => setProofImageUnavailable(true)}
                    />
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    {[
                      ['High', 'Reflected XSS via unescaped user input in template', 'CWE-79'],
                      ['Medium', 'Missing Content-Security-Policy header', 'CWE-693'],
                      ['Low', 'Cookie without SameSite attribute', 'CWE-1275'],
                    ].map(([severity, title, tag]) => (
                      <div key={title} className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-neutral-200">{title}</p>
                            <p className="mt-0.5 text-xs text-neutral-500">Inline comment + remediation + taxonomy context</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{severity}</span>
                            <span className="block text-[11px] text-neutral-600">{tag}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-[13px] text-neutral-500">
                  Severity, confidence, and fix direction posted directly inside the PR.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pillars */}
        <section className="border-b border-neutral-800/60 bg-neutral-900/40 py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-2xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-500">Why teams care</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Security review where developers already work</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {pillars.map((pillar) => (
                <div key={pillar.title} className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 transition hover:border-neutral-700">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800">
                    <pillar.icon className="h-5 w-5 text-neutral-300" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-white">{pillar.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-400">{pillar.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* False Positive Reduction */}
        <section className="border-b border-neutral-800/60 py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-2xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-500">Signal over noise</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">How we reduce false positives</h2>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                Most scanners spam pull requests. Mitig8it surfaces fewer, stronger findings by cross-validating across detection engines.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 transition hover:border-neutral-700">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800">
                  <Layers className="h-5 w-5 text-neutral-300" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-white">Multi-engine cross-validation</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  Regex pattern matching and Semgrep AST analysis run together. When both flag the same location, confidence goes up. Single-engine hits are downranked.
                </p>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 transition hover:border-neutral-700">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800">
                  <Target className="h-5 w-5 text-neutral-300" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-white">Dedup clustering + confidence scoring</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  Nearby duplicates in the same file and vulnerability type are merged into one finding. Low-confidence results stay out of PR comments.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="border-b border-neutral-800/60 bg-neutral-900/40 py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-500">Workflow</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">From install to first finding</h2>
                <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                  Install the app, open a pull request, and review the finding in GitHub. That is the core loop.
                </p>
              </div>
              <div className="space-y-3">
                {workflow.map((item, index) => (
                  <div key={item.title} className="flex gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-700">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-sm font-bold text-white">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="border-b border-neutral-800/60 py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-2xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-500">Trust and proof</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Go deeper</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {trustLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-600 hover:bg-neutral-800/80"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{item.desc}</p>
                  </div>
                  <ArrowRight className="ml-4 h-4 w-4 shrink-0 text-neutral-600 transition group-hover:text-neutral-300" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 px-8 py-10 shadow-2xl shadow-black/30">
              <h2 className="text-2xl font-semibold tracking-tight">Try it on one repo</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-neutral-400">
                Install the GitHub App, open a pull request, and see the first review land inline. No setup, no config files.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                {user ? (
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-2.5 text-sm font-semibold text-neutral-950 shadow-sm transition hover:bg-neutral-200"
                  >
                    Open workspace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <button
                    onClick={loginWithGitHub}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-2.5 text-sm font-semibold text-neutral-950 shadow-sm transition hover:bg-neutral-200"
                  >
                    <GitHubIcon />
                    Start with GitHub
                  </button>
                )}
                <Link
                  to="/examples"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-700 px-6 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-neutral-500 hover:text-white"
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
