import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpenText,
  Bot,
  CheckCircle2,
  GitPullRequest,
  Shield,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Header from './Header'
import Footer from './Footer'

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
    title: 'PR Review',
    desc: 'Inline findings, summary reviews, and checks that land where engineers already work.',
  },
  {
    icon: ShieldAlert,
    title: 'Security Context',
    desc: 'Security-only detections with CWE, OWASP, ATT&CK, and CAPEC context for every finding.',
  },
  {
    icon: BookOpenText,
    title: 'Team Rules',
    desc: 'Teach CodeSentry how your team wants reviews phrased, scoped, and prioritized.',
  },
  {
    icon: Bot,
    title: 'BYOK AI',
    desc: 'Bring your own model key for explanations and remediation without handing secrets to us.',
  },
]

const workflow = [
  {
    title: 'Connect the GitHub App',
    desc: 'Install CodeSentry on one repo or one org. No CI config, no YAML setup, no sidecar jobs.',
  },
  {
    title: 'Open a pull request',
    desc: 'CodeSentry reads the changed files, applies static + semantic detection, and clusters duplicate findings.',
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
  const { loginWithGitHub } = useAuth()

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />

      <main className="overflow-hidden">
        {/* Hero */}
        <section className="border-b border-slate-800">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-16">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-sky-400">
                AI security review for pull requests
              </p>
              <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]">
                Code review that understands your repo
                <span className="block text-slate-500">and catches security bugs before merge.</span>
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-7 text-slate-400">
                CodeSentry reviews pull requests with repository context, explains what is risky, and shows engineers exactly where to fix it in GitHub.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={loginWithGitHub}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
                >
                  <GitHubIcon />
                  Start with GitHub
                </button>
                <Link
                  to="/examples"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
                >
                  See a sample PR review
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  GitHub-native comments
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-sky-400" />
                  Security-focused findings
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                  BYOK-ready AI
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">Sample output</p>
                    <h2 className="mt-1.5 text-base font-semibold">PR #48 Harden checkout redirect</h2>
                  </div>
                  <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-rose-300">
                    3 issues
                  </span>
                </div>
                <div className="mt-4 space-y-2.5">
                  {[
                    ['Critical', 'Open redirect with user-controlled URL', 'CWE-601'],
                    ['High', 'Unescaped HTML render in confirmation page', 'CWE-79'],
                    ['Medium', 'Weak cookie attribute on session helper', 'CWE-614'],
                  ].map(([severity, title, tag]) => (
                    <div key={title} className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-200">{title}</p>
                          <p className="mt-0.5 text-xs text-slate-500">Inline review comment + remediation + taxonomy context</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">{severity}</span>
                          <span className="mt-0.5 block text-[11px] text-slate-600">{tag}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm text-sky-200">
                  Summary check: 1 critical, 1 high, 1 medium. Review requested before merge.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pillars */}
        <section className="border-b border-slate-800 py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 max-w-2xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-slate-500">Product pillars</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">What the product actually gives a team</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {pillars.map((pillar) => (
                <div key={pillar.title} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10">
                    <pillar.icon className="h-5 w-5 text-sky-400" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold">{pillar.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{pillar.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="border-b border-slate-800 py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-slate-500">Workflow</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">Show the path from install to value</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  New users should understand the sequence instantly: install, open a PR, review findings, tune rules, then optionally turn on BYOK AI.
                </p>
              </div>
              <div className="space-y-3">
                {workflow.map((item, index) => (
                  <div key={item.title} className="flex gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-sm font-semibold text-sky-400">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{item.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="border-b border-slate-800 py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 max-w-2xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-slate-500">Trust and proof</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">The pages a serious buyer expects</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {trustLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700 hover:bg-slate-800/80"
                >
                  <div>
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-400">{item.desc}</p>
                  </div>
                  <ArrowRight className="ml-4 h-4 w-4 shrink-0 text-slate-600 transition group-hover:text-slate-400" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-6 py-8">
              <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-slate-500">Start now</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">Install on one repo and watch the first review land in GitHub</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                The product should make sense from the first PR. That is the bar.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  onClick={loginWithGitHub}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
                >
                  <GitHubIcon />
                  Start with GitHub
                </button>
                <Link
                  to="/examples"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
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
