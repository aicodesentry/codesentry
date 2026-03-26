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
              <a href="#privacy" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy</a>
              <a href="#terms" className="hover:text-slate-900 dark:hover:text-white transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="border-t border-white/5" role="contentinfo">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Logo variant="dark" />
            <span className="text-xs text-slate-600">Security vulnerability reviewer for pull requests</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <a href="https://github.com/aicodesentry/codesentry" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
            <a href="#privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="#terms" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
