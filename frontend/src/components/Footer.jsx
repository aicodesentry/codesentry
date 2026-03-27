import Logo from './Logo'

const Footer = ({ variant = 'landing' }) => {
  if (variant === 'dashboard') {
    return (
      <footer className="border-t border-slate-200 dark:border-slate-800 mt-8">
        <div className="px-8 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 dark:text-slate-400">
            <span>CodeSentry</span>
            <div className="flex gap-4 mt-2 md:mt-0">
              <a href="https://github.com/aicodesentry/codesentry" target="_blank" rel="noreferrer" className="hover:text-slate-900 dark:hover:text-white transition-colors">GitHub</a>
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
            <p className="text-xs text-slate-600 mt-2">Security vulnerability reviewer for pull requests.</p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Product</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="https://www.youtube.com/watch?v=ygxZAEhTOJc" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Demo</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Company</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li><a href="/privacy" className="hover:text-white transition-colors">Privacy</a></li>
              <li><a href="/terms" className="hover:text-white transition-colors">Terms</a></li>
              <li><a href="mailto:support@codesentry.dev" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Connect</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li><a href="https://github.com/aicodesentry/codesentry" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a></li>
              <li><a href="https://x.com/codesentry" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">X / Twitter</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 text-xs text-slate-700 text-center">
          &copy; {new Date().getFullYear()} CodeSentry. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export default Footer
