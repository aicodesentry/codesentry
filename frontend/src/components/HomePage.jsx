import { useAuth } from '../contexts/AuthContext'
import { useInView } from '../hooks/useInView'
import { ScanSearch, ShieldAlert, Gauge, FilterX, Shield, Layers, MessageSquareCode, Check } from 'lucide-react'
import Header from './Header'
import Footer from './Footer'

const GitHubIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
  </svg>
)

const AnimatedSection = ({ children, className = '' }) => {
  const [ref, isInView] = useInView()
  return (
    <section
      ref={ref}
      className={`animate-in ${isInView ? 'is-visible' : 'is-hidden'} ${className}`}
    >
      {children}
    </section>
  )
}

const features = [
  { icon: ScanSearch, title: 'Automated scanning', desc: 'Every PR is scanned for exploitable vulnerabilities. Findings mapped to CWE IDs with evidence.' },
  { icon: ShieldAlert, title: 'Security-only', desc: 'Injection, secrets, SSRF, XSS, broken auth, unsafe deserialization — no style nits, no noise.' },
  { icon: Gauge, title: 'Confidence gating', desc: 'High-confidence findings get inline comments. Medium goes to summary. Low is stored silently.' },
  { icon: FilterX, title: 'Suppressions', desc: 'Mark accepted risks, set baselines, surface only net-new vulnerabilities across PRs.' },
]

const steps = [
  { step: '1', title: 'Connect', desc: 'Sign in with GitHub. Select the repos you want CodeSentry to watch.' },
  { step: '2', title: 'Analyze', desc: 'Every PR is scanned automatically. Findings sorted by severity, linked to the lines.' },
  { step: '3', title: 'Ship', desc: 'Fix issues in the PR thread. Merge only when the security check is green.' },
]

const freeFeatures = ['Up to 3 repositories', 'Basic AI analysis', 'Community support']
const proFeatures = ['Unlimited repositories', 'Advanced AI analysis', 'Priority support', 'Custom integrations']
const enterpriseFeatures = ['Everything in Pro', 'Team management', 'Dedicated support', 'SLA guarantee']

const HomePage = () => {
  const { loginWithGitHub } = useAuth()

  return (
    <div className="bg-slate-950 text-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-slate-900 focus:rounded-md"
      >
        Skip to main content
      </a>
      <Header />

      {/* Hero */}
      <main id="main-content" className="relative pt-12 pb-14 sm:pt-16 sm:pb-16 hero-grid">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-medium tracking-widest text-slate-500 uppercase mb-6">Security vulnerability reviewer</p>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            Catch vulnerabilities
            <br />
            <span className="text-slate-400">before they ship</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
            CWE-mapped security analysis on every pull request. Injection, secrets, auth bypass — caught before merge.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8">
            <button
              onClick={loginWithGitHub}
              className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-white bg-sky-500 rounded-lg hover:bg-sky-400 transition-all duration-200"
              aria-label="Sign in with GitHub"
            >
              <GitHubIcon />
              Start free with GitHub
            </button>
            <a
              href="https://www.youtube.com/watch?v=ygxZAEhTOJc"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-slate-400 border border-white/10 rounded-lg hover:text-white hover:border-white/20 transition-colors"
            >
              See how it works
            </a>
          </div>

          {/* Trust row */}
          <div className="flex flex-wrap justify-center gap-8 text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-sky-400/70" />
              CWE-mapped findings
            </span>
            <span className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-sky-400/70" />
              12 vulnerability categories
            </span>
            <span className="flex items-center gap-2">
              <MessageSquareCode className="w-3.5 h-3.5 text-sky-400/70" />
              Inline PR comments
            </span>
          </div>
        </div>
      </main>

      {/* What it posts */}
      <AnimatedSection className="border-t border-white/5 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">What CodeSentry posts on your PRs</h2>
              <p className="text-slate-400 mb-6 leading-relaxed">
                Every pull request gets an inline summary with severity badges, file-level findings, and a clear call to fix before merge.
              </p>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0"></span>
                  Sorted by Critical, High, Medium — reviewers know what to fix first
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0"></span>
                  Posts directly on the PR — no dashboards to check
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0"></span>
                  You keep ownership of your repos and review flow
                </li>
              </ul>
            </div>

            {/* Mock PR comment */}
            <div className="relative rounded-xl border border-white/10 bg-white/5 overflow-hidden shadow-[0_0_60px_-15px_rgba(14,165,233,0.15)] lg:scale-105">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />
              <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
                <span className="text-sm font-medium text-slate-300">Security Analysis</span>
                <span className="text-xs text-slate-500 font-mono">auth.py</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex gap-2 text-xs font-medium">
                  <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">Critical 2</span>
                  <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">High 2</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Medium 1</span>
                </div>
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                    <span className="text-slate-300">SQL injection via string concatenation</span>
                    <span className="ml-auto font-mono text-slate-600">CWE-89 L:7</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                    <span className="text-slate-300">Hardcoded credential in source</span>
                    <span className="ml-auto font-mono text-slate-600">CWE-798 L:16</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500"></span>
                    <span className="text-slate-300">Command injection with shell=True</span>
                    <span className="ml-auto font-mono text-slate-600">CWE-78 L:11</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500"></span>
                    <span className="text-slate-300">Path traversal from user input</span>
                    <span className="ml-auto font-mono text-slate-600">CWE-22 L:12</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                    <span className="text-slate-300">Weak hash in auth context</span>
                    <span className="ml-auto font-mono text-slate-600">CWE-327 L:23</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-white/5 text-[10px] text-slate-600">
                  Posted by CodeSentry
                </div>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Social proof / metrics */}
      <AnimatedSection className="border-t border-white/5 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-2xl font-bold text-white">500+</p>
              <p className="text-xs text-slate-500 mt-1">PRs analyzed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">12</p>
              <p className="text-xs text-slate-500 mt-1">CWE categories</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">&lt;30s</p>
              <p className="text-xs text-slate-500 mt-1">Avg scan time</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">Zero</p>
              <p className="text-xs text-slate-500 mt-1">Code stored</p>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Features */}
      <AnimatedSection className="border-t border-white/5 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-2 text-center">How it works</h2>
          <p className="text-sm text-slate-500 text-center mb-8">Built for security teams and developers who ship code that matters</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-5 hover:border-sky-500/30 hover:from-white/[0.08] transition-all duration-300 group">
                <div className="mb-3 flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-500/20">
                  <f.icon className="w-5 h-5 text-sky-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Steps */}
      <AnimatedSection className="border-t border-white/5 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">2-minute setup</h2>
          <div className="space-y-5">
            {steps.map((s) => (
              <div key={s.step} className="flex gap-4 items-start">
                <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-500/20 text-sm font-bold text-white">{s.step}</span>
                <div>
                  <h3 className="text-base font-semibold text-white">{s.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Pricing */}
      <AnimatedSection className="border-t border-white/5 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-2 text-center">Simple pricing</h2>
          <p className="text-sm text-slate-500 text-center mb-10">Free while in beta. No credit card required.</p>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Free tier */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="text-lg font-bold mb-1">Free</h3>
              <p className="text-xs text-slate-500 mb-3">For individual developers</p>
              <p className="text-3xl font-bold mb-4">$0<span className="text-sm text-slate-500 font-normal">/mo</span></p>
              <ul className="space-y-2.5 text-sm text-slate-400 mb-6">
                {freeFeatures.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-sky-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={loginWithGitHub}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-sky-500 rounded-lg hover:bg-sky-400 transition-all duration-200"
              >
                Get started
              </button>
            </div>

            {/* Pro tier */}
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/[0.05] p-6 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-semibold bg-sky-500 text-white rounded-full">Popular</span>
              <h3 className="text-lg font-bold mb-1">Pro</h3>
              <p className="text-xs text-slate-500 mb-3">For professional developers</p>
              <p className="text-3xl font-bold mb-4">$29<span className="text-sm text-slate-500 font-normal">/mo</span></p>
              <ul className="space-y-2.5 text-sm text-slate-400 mb-6">
                {proFeatures.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-sky-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={loginWithGitHub}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-sky-500 rounded-lg hover:bg-sky-400 transition-all duration-200"
              >
                Upgrade to Pro
              </button>
            </div>

            {/* Enterprise tier */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="text-lg font-bold mb-1">Enterprise</h3>
              <p className="text-xs text-slate-500 mb-3">For teams and organizations</p>
              <p className="text-3xl font-bold mb-4">Custom</p>
              <ul className="space-y-2.5 text-sm text-slate-400 mb-6">
                {enterpriseFeatures.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-sky-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="mailto:support@codesentry.dev"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-300 border border-white/10 rounded-lg hover:border-white/20 hover:text-white transition-colors"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* CTA */}
      <AnimatedSection className="border-t border-white/5 py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-3">Stop shipping vulnerabilities</h2>
          <p className="text-slate-400 mb-6">Security review on every pull request. Install the GitHub App and go.</p>
          <button
            onClick={loginWithGitHub}
            className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-white bg-sky-500 rounded-lg hover:bg-sky-400 transition-all duration-200"
          >
            <GitHubIcon />
            Connect with GitHub
          </button>
          <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-slate-600">
            <span>Free for public repos</span>
            <span>No credit card</span>
            <span>60-second setup</span>
          </div>
        </div>
      </AnimatedSection>

      <Footer />
    </div>
  )
}

export default HomePage
