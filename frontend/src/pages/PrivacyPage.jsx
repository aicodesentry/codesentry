import Header from '../components/Header'
import Footer from '../components/Footer'

const PrivacyPage = () => {
  return (
    <div className="bg-slate-950 text-white min-h-screen">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <div className="space-y-6 text-sm text-slate-400 leading-relaxed">
          <p className="text-slate-300">Last updated: March 2026</p>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">What we collect</h2>
            <p>
              When you sign in with GitHub, we receive your GitHub username, email address, and avatar
              through GitHub OAuth. We use this to authenticate you and associate your repositories
              with your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">How we access your code</h2>
            <p>
              Mitig8it reads pull request diffs through the GitHub API. We only access the changed
              lines in a pull request — we do not clone, store, or retain your source code. Analysis
              is performed on the diff content and results are stored as findings metadata (file path,
              line number, CWE ID, description).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Data storage</h2>
            <p>
              We store analysis findings, repository metadata, and your account information in a
              secured PostgreSQL database hosted on Google Cloud. We do not store your source code,
              credentials, or secrets found during analysis.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Third-party services</h2>
            <p>
              We use GitHub (authentication and repository access), Google Cloud Platform (hosting
              and infrastructure), and optionally Google Gemini (AI-assisted analysis contextualization).
              No code is shared with third parties beyond what is necessary for analysis.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Data deletion</h2>
            <p>
              You can disconnect repositories at any time from your dashboard. When you uninstall
              the GitHub App, we remove your repository data and findings. To delete your account
              entirely, contact us at support@mitig8it.com.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Contact</h2>
            <p>
              Questions about this policy? Reach us at{' '}
              <a href="mailto:support@mitig8it.com" className="text-primary-400 hover:text-primary-300 transition-colors">
                support@mitig8it.com
              </a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default PrivacyPage
