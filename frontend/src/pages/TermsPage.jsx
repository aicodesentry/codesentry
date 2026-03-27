import Header from '../components/Header'
import Footer from '../components/Footer'

const TermsPage = () => {
  return (
    <div className="bg-slate-950 text-white min-h-screen">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        <div className="space-y-6 text-sm text-slate-400 leading-relaxed">
          <p className="text-slate-300">Last updated: March 2026</p>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Service description</h2>
            <p>
              CodeSentry is a security analysis tool that reviews pull requests on GitHub for
              potential vulnerabilities. The service is provided as-is and identifies possible
              security issues — it does not guarantee the absence of vulnerabilities in your code.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Your responsibilities</h2>
            <p>
              You are responsible for reviewing and acting on findings. CodeSentry provides
              recommendations, not guarantees. You retain full ownership of your code and
              repositories. Security decisions remain yours.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">GitHub access</h2>
            <p>
              By installing the CodeSentry GitHub App, you grant us read access to pull request
              diffs and the ability to post check runs and review comments on your repositories.
              You can revoke this access at any time by uninstalling the GitHub App.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Acceptable use</h2>
            <p>
              Do not use CodeSentry to scan repositories you do not own or have authorization
              to analyze. Do not attempt to circumvent rate limits or abuse the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Limitation of liability</h2>
            <p>
              CodeSentry is provided without warranty. We are not liable for security incidents,
              data breaches, or vulnerabilities that are not detected by the service. Use
              CodeSentry as one layer in your security process, not the only one.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Changes to terms</h2>
            <p>
              We may update these terms as the service evolves. Continued use after changes
              constitutes acceptance. Material changes will be communicated via the email
              associated with your GitHub account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Contact</h2>
            <p>
              Questions? Reach us at{' '}
              <a href="mailto:support@codesentry.dev" className="text-primary-400 hover:text-primary-300 transition-colors">
                support@codesentry.dev
              </a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default TermsPage
