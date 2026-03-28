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
        <section className="relative border-b border-white/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_30%),radial-gradient(circle_at_80%_20%,_rgba(14,165,233,0.12),_transparent_30%)]" />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-300/80">
                AI security review for pull requests
              </p>
              <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Code review that understands your repo
                <span className="block text-slate-400">and catches security bugs before merge.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
                CodeSentry reviews pull requests with repository context, explains what is risky, and shows engineers exactly where to fix it in GitHub.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={loginWithGitHub}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                >
                  <GitHubIcon />
                  Start with GitHub
                </button>
                <Link
                  to="/examples"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-6 py-3.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5"
                >
                  See a sample PR review
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-400">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  GitHub-native comments and checks
                </span>
                <span className="inline-flex items-center gap-2">
                  <Shield className="h-4 w-4 text-sky-300" />
                  Security-focused findings only
                </span>
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-300" />
                  BYOK-ready AI enrichment
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900/95 to-slate-950/80 p-5 shadow-[0_35px_80px_rgba(2,6,23,0.75)]">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Sample output</p>
                    <h2 className="mt-2 text-lg font-semibold">PR #48 Harden checkout redirect</h2>
                  </div>
                  <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-200">
                    3 issues
                  </span>
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    ['Critical', 'Open redirect with user-controlled URL', 'CWE-601'],
                    ['High', 'Unescaped HTML render in confirmation page', 'CWE-79'],
                    ['Medium', 'Weak cookie attribute on session helper', 'CWE-614'],
                  ].map(([severity, title, tag]) => (
                    <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-white">{title}</p>
                          <p className="mt-1 text-sm text-slate-400">Inline review comment + remediation + taxonomy context</p>
                        </div>
                        <div className="text-right">
                          <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">{severity}</span>
                          <span className="mt-1 block text-xs text-slate-500">{tag}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-4 text-sm text-sky-100">
                  Summary check: 1 critical, 1 high, 1 medium. Review requested before merge.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Product pillars</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">What the product actually gives a team</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {pillars.map((pillar) => (
                <div key={pillar.title} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10">
                    <pillar.icon className="h-5 w-5 text-sky-300" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{pillar.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{pillar.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Workflow</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">Show the path from install to value</h2>
                <p className="mt-4 text-sm leading-7 text-slate-400">
                  New users should understand the sequence instantly: install, open a PR, review findings, tune rules, then optionally turn on BYOK AI.
                </p>
              </div>
              <div className="space-y-4">
                {workflow.map((item, index) => (
                  <div key={item.title} className="flex gap-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-sky-300">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Trust and proof</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">The pages a serious buyer expects</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {trustLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group rounded-[24px] border border-white/10 bg-white/[0.03] p-5 transition hover:border-sky-400/30 hover:bg-white/[0.05]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:text-sky-300" />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-white/[0.05] to-sky-500/[0.06] px-8 py-10">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Start now</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">Install on one repo and watch the first review land in GitHub</h2>
              <p className="mt-4 text-sm leading-7 text-slate-400">
                The product should make sense from the first PR. That is the bar.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  onClick={loginWithGitHub}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                >
                  <GitHubIcon />
                  Start with GitHub
                </button>
                <Link
                  to="/examples"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-6 py-3.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5"
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
