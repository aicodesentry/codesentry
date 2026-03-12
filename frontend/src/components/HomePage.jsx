import { useAuth } from '../contexts/AuthContext'
import Header from './Header'
import Footer from './Footer'

const HomePage = () => {
  const { loginWithGitHub } = useAuth()

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md"
      >
        Skip to main content
      </a>
      <Header />

      {/* Hero Section */}
      <main id="main-content" className="relative overflow-hidden pt-16 pb-24 sm:pt-24 sm:pb-32">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute left-[50%] top-0 -translate-x-1/2 blur-3xl opacity-30">
            <div className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-blue-400 to-indigo-500"></div>
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-8">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              AI-Powered Code Analysis
            </div>

            {/* Main heading */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6">
              Elevate Your Code Quality
              <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mt-2">
                With AI Precision
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              Automated security scans, code quality checks, and intelligent suggestions for Python projects.
              Ship safer code faster.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={loginWithGitHub}
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:scale-105 duration-200"
                aria-label="Sign in with GitHub to get started"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                Start Free with GitHub
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              <a
                href="https://www.youtube.com/watch?v=ygxZAEhTOJc"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-slate-700 bg-white rounded-xl hover:bg-slate-50 transition-all border-2 border-slate-200 hover:border-slate-300"
              >
                See How It Works
              </a>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 pt-12 border-t border-slate-200">
              <p className="text-sm text-slate-500 mb-6">Trusted by development teams worldwide</p>
              <div className="flex flex-wrap justify-center gap-8 items-center opacity-60">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-sm font-medium text-slate-700">10k+ PRs Analyzed</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-slate-700">500+ Vulnerabilities Caught</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-slate-700">98% Satisfaction</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Proof Section */}
      <section className="py-16 bg-slate-50" aria-labelledby="proof-heading">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8 lg:items-center">
            <div className="flex-1">
              <h2 id="proof-heading" className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                See What CodeSentry Posts on Your PRs
              </h2>
              <p className="text-lg text-slate-600 mb-6">
                Every pull request gets an inline summary with severity badges, file-level findings, and a clear call to fix issues before merge.
              </p>
              <ul className="space-y-3 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-green-500"></span>
                  Auto-sorted by Critical, High, Medium so reviewers know what to tackle first.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-blue-500"></span>
                  Works on every PR—no dashboards to babysit. Fix in GitHub, ship with confidence.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-amber-500"></span>
                  Powered by CodeSentry; you keep ownership of your repos and review flow.
                </li>
              </ul>
            </div>

            <div className="flex-1">
              <div className="bg-slate-900 text-slate-50 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
                <div className="p-4 flex items-center justify-between border-b border-slate-800">
                  <div className="font-semibold text-lg">Security Analysis</div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 rounded-full text-xs bg-slate-800 border border-slate-700">text.py</span>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex flex-wrap gap-2 text-xs font-medium">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-900/30 text-red-300 border border-red-700">Critical 2</span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-900/30 text-orange-200 border border-orange-700">High 2</span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-900/30 text-amber-200 border border-amber-700">Medium 1</span>
                  </div>
                  <div className="text-sm text-amber-100 flex items-start gap-2">
                    <svg className="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 5a7 7 0 00-7 7v5a2 2 0 002 2h10a2 2 0 002-2v-5a7 7 0 00-7-7z" />
                    </svg>
                    Action required: 4 high-priority issues should be addressed before merging.
                  </div>
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="flex items-center gap-2 text-red-200 font-semibold">Critical Priority</div>
                      <ul className="mt-2 space-y-1 text-slate-100">
                        <li>• Unknown (Line 7)</li>
                        <li>• Unknown (Line 16)</li>
                      </ul>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-orange-200 font-semibold">High Priority</div>
                      <ul className="mt-2 space-y-1 text-slate-100">
                        <li>• Unknown (Line 11)</li>
                        <li>• Unknown (Line 12)</li>
                      </ul>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-amber-200 font-semibold">Medium Priority</div>
                      <ul className="mt-2 space-y-1 text-slate-100">
                        <li>• Unknown (Line 23)</li>
                      </ul>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                    Powered by <span className="font-semibold text-slate-200">CodeSentry</span> · Posts directly on your PRs
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white" aria-labelledby="features-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 id="features-heading" className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Enterprise-grade code analysis powered by AI to keep your codebase secure and maintainable
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="group relative bg-gradient-to-br from-slate-50 to-white p-8 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-100 text-blue-600 mb-5 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Automated Analysis</h3>
              <p className="text-slate-600 leading-relaxed">
                Instant feedback on Python code with AI-powered analysis for vulnerabilities and quality issues
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative bg-gradient-to-br from-slate-50 to-white p-8 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-red-100 text-red-600 mb-5 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Security Scanning</h3>
              <p className="text-slate-600 leading-relaxed">
                Detect secrets, SQL injection, and vulnerabilities before they reach production
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative bg-gradient-to-br from-slate-50 to-white p-8 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-green-100 text-green-600 mb-5 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Performance Insights</h3>
              <p className="text-slate-600 leading-relaxed">
                Identify bottlenecks and get optimization suggestions for faster Python code
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group relative bg-gradient-to-br from-slate-50 to-white p-8 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-purple-100 text-purple-600 mb-5 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Smart Suggestions</h3>
              <p className="text-slate-600 leading-relaxed">
                AI-powered recommendations and best practices to improve code quality
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 bg-slate-50" aria-labelledby="how-it-works-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
              <h2 id="how-it-works-heading" className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
                Simple, 2-Minute Integration
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Connect GitHub, pick a repo, and let CodeSentry post AI review comments on every PR.
              </p>
            </div>

          <div className="relative">
            {/* Connection line for desktop */}
            <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-200 to-transparent" aria-hidden="true"></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-8">
              {/* Step 1 */}
              <div className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="relative flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg mb-6">
                    <span className="text-3xl font-bold">1</span>
                    <div className="absolute -inset-1 bg-gradient-to-br from-blue-400 to-blue-500 rounded-2xl -z-10 blur opacity-50"></div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Connect</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Sign in with GitHub, select the repos you want us to watch. No manual config.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="relative flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg mb-6">
                    <span className="text-3xl font-bold">2</span>
                    <div className="absolute -inset-1 bg-gradient-to-br from-indigo-400 to-indigo-500 rounded-2xl -z-10 blur opacity-50"></div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Analyze</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Every PR is scanned automatically; we sort findings by severity and link to the lines.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="relative flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg mb-6">
                    <span className="text-3xl font-bold">3</span>
                    <div className="absolute -inset-1 bg-gradient-to-br from-purple-400 to-purple-500 rounded-2xl -z-10 blur opacity-50"></div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Improve</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Review fixes directly in the PR thread. Merge only when you’re green.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 sm:py-28 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden" aria-labelledby="cta-heading">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 id="cta-heading" className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Start Improving Your Code Today
            </h2>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              Get instant code analysis on every pull request. No setup required.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
              <button
                onClick={loginWithGitHub}
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-slate-900 bg-white rounded-xl hover:bg-slate-50 transition-all shadow-xl hover:shadow-2xl hover:scale-105 duration-200"
                aria-label="Get started with GitHub authentication"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                Connect with GitHub
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-slate-400 text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Free for public repos</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Setup in 60 seconds</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default HomePage
