import { useAuth } from '../contexts/AuthContext'
import Header from './Header'
import Footer from './Footer'

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
      <main id="main-content" className="relative pt-12 pb-14 sm:pt-16 sm:pb-16">
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
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-slate-900 bg-white rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Sign in with GitHub"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
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
          <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-500">
            <span>CWE-mapped findings</span>
            <span className="text-slate-700">|</span>
            <span>12 vulnerability categories</span>
            <span className="text-slate-700">|</span>
            <span>Inline PR comments</span>
          </div>
        </div>
      </main>

      {/* What it posts */}
      <section className="border-t border-white/5 py-12">
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
            <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
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
      </section>

      {/* Features */}
      <section className="border-t border-white/5 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-2 text-center">How it works</h2>
          <p className="text-sm text-slate-500 text-center mb-8">Built for security teams and developers who ship code that matters</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Automated scanning', desc: 'Every PR is scanned for exploitable vulnerabilities. Findings mapped to CWE IDs with evidence.' },
              { title: 'Security-only', desc: 'Injection, secrets, SSRF, XSS, broken auth, unsafe deserialization — no style nits, no noise.' },
              { title: 'Confidence gating', desc: 'High-confidence findings get inline comments. Medium goes to summary. Low is stored silently.' },
              { title: 'Suppressions', desc: 'Mark accepted risks, set baselines, surface only net-new vulnerabilities across PRs.' },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <h3 className="text-sm font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="border-t border-white/5 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">2-minute setup</h2>
          <div className="space-y-5">
            {[
              { step: '1', title: 'Connect', desc: 'Sign in with GitHub. Select the repos you want CodeSentry to watch.' },
              { step: '2', title: 'Analyze', desc: 'Every PR is scanned automatically. Findings sorted by severity, linked to the lines.' },
              { step: '3', title: 'Ship', desc: 'Fix issues in the PR thread. Merge only when the security check is green.' },
            ].map((s) => (
              <div key={s.step} className="flex gap-4 items-start">
                <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-white/10 text-sm font-bold text-white">{s.step}</span>
                <div>
                  <h3 className="text-base font-semibold text-white">{s.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/5 py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-3">Stop shipping vulnerabilities</h2>
          <p className="text-slate-400 mb-6">Security review on every pull request. Install the GitHub App and go.</p>
          <button
            onClick={loginWithGitHub}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-slate-900 bg-white rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            Connect with GitHub
          </button>
          <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-slate-600">
            <span>Free for public repos</span>
            <span>No credit card</span>
            <span>60-second setup</span>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default HomePage
