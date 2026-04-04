import Logo from './Logo'

const Footer = ({ variant = 'landing' }) => {
  if (variant === 'dashboard') {
    return (
      <footer className="border-t border-slate-200 dark:border-slate-800 mt-8">
        <div className="px-8 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 dark:text-slate-400">
            <span>Mitig8it</span>
            <div className="flex gap-4 mt-2 md:mt-0">
              <a href="/privacy" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-slate-900 dark:hover:text-white transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="border-t border-white/5" role="contentinfo">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Logo variant="dark" />
            <p className="mt-2 text-xs text-neutral-500">Security vulnerability reviewer for pull requests.</p>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">Product</h4>
            <ul className="space-y-2 text-xs text-neutral-500">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="/examples" className="hover:text-white transition-colors">Examples</a></li>
              <li><a href="/benchmarks" className="hover:text-white transition-colors">Benchmarks</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">Company</h4>
            <ul className="space-y-2 text-xs text-neutral-500">
              <li><a href="/customers" className="hover:text-white transition-colors">Customers</a></li>
              <li><a href="/security" className="hover:text-white transition-colors">Security</a></li>
              <li><a href="/privacy" className="hover:text-white transition-colors">Privacy</a></li>
              <li><a href="/terms" className="hover:text-white transition-colors">Terms</a></li>
              <li><a href="mailto:support@mitig8it.com" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">Connect</h4>
            <ul className="space-y-2 text-xs text-neutral-500">
              <li><a href="mailto:support@mitig8it.com" className="hover:text-white transition-colors">Email</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-white/5 pt-6 text-center text-xs text-neutral-600">
          &copy; {new Date().getFullYear()} Mitig8it. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export default Footer
