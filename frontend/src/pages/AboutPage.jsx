import Header from '../components/Header'
import Footer from '../components/Footer'

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Header />

      <main>
        {/* Hero */}
        <section className="border-b border-neutral-800/60">
          <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">About Mitig8it</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              An AI security collaborator for code
              <span className="block text-neutral-400">review and safer merges.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-[15px] leading-7 text-neutral-400">
              Mitig8it is a GitHub-native AI security collaborator built to help engineering teams detect exploitable vulnerabilities in pull requests today, then grow toward full-repository analysis and AI-assisted remediation over time.
            </p>
          </div>
        </section>

        {/* The Problem */}
        <section className="border-b border-neutral-800/60 bg-neutral-900/40 py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">The problem</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">Security checks today are either too late or too noisy</h2>
            <div className="mt-6 space-y-4 text-[15px] leading-7 text-neutral-400">
              <p>
                Most tools run after code is merged or deployed, when fixing issues is expensive and disruptive. At the same time, many static analysis tools generate large volumes of false positives, forcing developers to ignore or bypass them entirely.
              </p>
              <p>
                Real vulnerabilities slip through — not because teams don't care about security, but because existing tools don't fit how developers actually work.
              </p>
            </div>
          </div>
        </section>

        {/* What We're Building */}
        <section className="border-b border-neutral-800/60 py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">What we're building</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">Security review that starts in the pull request and expands into the repository</h2>
            <div className="mt-6 space-y-4 text-[15px] leading-7 text-neutral-400">
              <p>
                Mitig8it integrates directly into the pull request workflow to analyze code before it merges. It combines multiple analysis approaches, maps findings to standards like CWE, and delivers actionable feedback directly inside GitHub.
              </p>
              <p>
                The long-term goal is broader than PR comments alone: full-repository analysis, stronger context across code changes, and AI-assisted fixes with developers staying in control.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                {
                  title: 'GitHub-native',
                  desc: 'Findings appear as inline PR comments and check runs where teams already review code.',
                },
                {
                  title: 'Collaborative by design',
                  desc: 'Mitig8it reviews, explains, and guides fixes without taking developers out of control.',
                },
                {
                  title: '3-tier detection pipeline',
                  desc: 'Regex pattern matching, OpenGrep AST analysis with taint tracking, and LLM-powered triage work together to maximize accuracy and minimize false positives.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why This Approach */}
        <section className="border-b border-neutral-800/60 bg-neutral-900/40 py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">Why this approach</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">Security should happen where code is reviewed, not after it ships</h2>
            <div className="mt-6 space-y-4 text-[15px] leading-7 text-neutral-400">
              <p>
                Most security tools fail because they operate outside the developer workflow. They run in separate pipelines, surface results in separate dashboards, and require context-switching that slows teams down.
              </p>
              <p>
                Mitig8it is built around a different principle: integrate into code review, reduce noise through cross-validation and dedup clustering, and become useful enough to earn developer trust instead of demanding it.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-neutral-800/60 py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">Roadmap</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">What Mitig8it does now and where it is going</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
                <p className="text-sm font-semibold text-white">Today</p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  GitHub-native pull request security review with inline findings, check runs, dashboard visibility, deduping, and developer-controlled remediation.
                </p>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
                <p className="text-sm font-semibold text-white">Future direction</p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  Full-repository analysis, richer codebase context, and AI-assisted fixes that help teams merge safer code without removing human approval.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Who It's For */}
        <section className="border-b border-neutral-800/60 py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">Who it's for</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">Built for teams that ship fast and care about security</h2>
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {[
                'Startups and small engineering teams',
                'Developers without dedicated security engineers',
                'Teams that want security without slowing delivery',
                'Organizations adopting shift-left security practices',
              ].map((item) => (
                <div key={item} className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-300">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Current Stage */}
        <section className="border-b border-neutral-800/60 bg-neutral-900/40 py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">Current stage</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">Early stage, live product</h2>
            <div className="mt-6 space-y-4 text-[15px] leading-7 text-neutral-400">
              <p>
                Mitig8it is live and in beta. The GitHub App, PR analysis pipeline, inline findings, and dashboard are all functional. The current focus is improving reliability, reducing false positives, and building toward a security collaborator developers can depend on inside their normal workflow.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-4">
              {[
                { label: 'GitHub App', status: 'Live' },
                { label: 'PR analysis', status: 'Live' },
                { label: 'Dashboard', status: 'Live' },
                { label: 'Repo analysis + AI fixes', status: 'Roadmap' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-center">
                  <p className="text-lg font-semibold text-white">{item.status}</p>
                  <p className="mt-1 text-xs text-neutral-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 px-8 py-10 shadow-2xl shadow-black/30">
              <h2 className="text-2xl font-semibold tracking-tight">Get involved</h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-neutral-400">
                If you're interested in improving how your team handles security during development, or open to sharing your workflow and challenges, we'd love to connect.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <a
                  href="mailto:support@mitig8it.com"
                  className="inline-flex items-center justify-center rounded-md bg-white px-6 py-2.5 text-sm font-semibold text-neutral-950 shadow-sm transition hover:bg-neutral-200"
                >
                  Get in touch
                </a>
                <a
                  href="https://www.linkedin.com/company/mitig8it"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-md border border-neutral-700 px-6 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-neutral-500 hover:text-white"
                >
                  Follow on LinkedIn
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default AboutPage
