import { Link } from 'react-router'
import { ArrowRight, Check } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Header from './Header'
import Footer from './Footer'
import ProductSurface from './ProductSurface'

const REVIEW_SCREENSHOT_PATH = '/proof/github-pr-xss-review.png?v=2'

const GitHubIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      clipRule="evenodd"
    />
  </svg>
)

const workflow = [
  {
    step: '01',
    title: 'Install the GitHub App',
    desc: 'Connect one repository or one organization. No CI config and no YAML setup.',
  },
  {
    step: '02',
    title: 'Open a pull request',
    desc: 'Mitig8it reviews the changed lines in the diff and posts the most relevant findings inline.',
  },
  {
    step: '03',
    title: 'Review and fix in GitHub',
    desc: 'Developers get severity, confidence, and remediation guidance without leaving the pull request.',
  },
]

const proofBullets = [
  'Inline comments on risky lines',
  'Severity and confidence on every finding',
  'Review summaries posted in GitHub',
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

const primaryAction =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200'
const secondaryAction =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-800 px-5 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-neutral-600 hover:text-white'

const HomePage = () => {
  const { loginWithGitHub, user } = useAuth()
  const [proofImageUnavailable, setProofImageUnavailable] = useState(false)

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Header />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgba(16,185,129,0.10),transparent_70%)]" />

          <div className="relative mx-auto max-w-6xl px-4 pt-24 sm:px-6 sm:pt-32 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-neutral-800 px-3 py-1 text-xs font-medium text-neutral-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                GitHub-native security review
              </span>

              <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
                Catch exploitable code
                <span className="block text-neutral-500">before merge.</span>
              </h1>

              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-neutral-400">
                Mitig8it posts high-signal security findings directly inside pull requests, where developers already review code.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                {user ? (
                  <Link to="/dashboard" className={primaryAction}>
                    Open workspace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <button onClick={loginWithGitHub} className={primaryAction}>
                    <GitHubIcon />
                    Start with GitHub
                  </button>
                )}
                <Link to="/examples" className={secondaryAction}>
                  See sample review
                </Link>
              </div>

              <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-neutral-500">
                {proofBullets.map((item) => (
                  <li key={item} className="inline-flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Proof: the product itself, at full width and without card chrome */}
            <figure className="mt-16 sm:mt-20">
              {!proofImageUnavailable ? (
                <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
                  <img
                    src={REVIEW_SCREENSHOT_PATH}
                    alt="Mitig8it GitHub pull request review showing a high-severity XSS finding with severity, confidence, and remediation guidance"
                    className="block w-full"
                    loading="eager"
                    onError={() => setProofImageUnavailable(true)}
                  />
                </div>
              ) : (
                <div className="grid gap-px overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-800 sm:grid-cols-2">
                  {[
                    ['High', 'Reflected XSS via unescaped user input in template', 'CWE-79'],
                    ['Medium', 'Missing Content-Security-Policy header', 'CWE-693'],
                  ].map(([severity, title, tag]) => (
                    <div key={title} className="bg-neutral-900 px-5 py-6">
                      <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
                        <span className="text-emerald-400">{severity} severity</span>
                        <span>·</span>
                        <span>{tag}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-white">{title}</p>
                      <p className="mt-1 text-sm leading-6 text-neutral-500">
                        Posted as an inline comment with remediation context.
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <figcaption className="mt-4 text-center text-sm text-neutral-500">
                A real finding, posted inline on the pull request that introduced it.
              </figcaption>
            </figure>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              From install to first review in three steps
            </h2>
            <p className="mt-4 text-base leading-7 text-neutral-400">
              Keep the first run small. Connect one repository, open one pull request, and see the review land inside GitHub.
            </p>
          </div>

          <div className="mt-12 border-t border-neutral-800">
            {workflow.map((item) => (
              <div
                key={item.step}
                className="grid gap-2 border-b border-neutral-800 py-8 sm:grid-cols-[4rem_1fr] sm:gap-8"
              >
                <span className="text-sm font-medium tabular-nums text-neutral-600">{item.step}</span>
                <div className="max-w-2xl">
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-base leading-7 text-neutral-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <ProductSurface
          title="What is live today, and what is still shipping"
          intro="Mitig8it already covers the core pull request review loop. The rest of the roadmap is listed as staged capabilities rather than implied promises."
          items={productSurface}
        />

        {/* Close */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-6 py-16 text-center sm:px-16">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Try it on one repository first
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-neutral-400">
              Install the GitHub App, open a pull request, and see the first review land inside GitHub before rolling it out wider.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              {user ? (
                <Link to="/dashboard" className={primaryAction}>
                  Open workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <button onClick={loginWithGitHub} className={primaryAction}>
                  <GitHubIcon />
                  Start with GitHub
                </button>
              )}
              <Link to="/examples" className={secondaryAction}>
                Review sample output
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default HomePage
