import { Link } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import Logo from './Logo'

const Header = () => {
  const { loginWithGitHub, user } = useAuth()

  return (
    <nav className="sticky top-0 z-50 border-b border-neutral-800/60 bg-neutral-950/80 backdrop-blur-md" role="navigation" aria-label="Main navigation">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/*
          One DOM node per link. The nav links wrap onto their own full-width
          row on small screens instead of disappearing behind a `hidden md:flex`.
        */}
        <div className="flex flex-wrap items-center justify-between gap-y-3 py-3 md:h-16 md:flex-nowrap md:py-0">
          <a href="/" aria-label="Mitig8it home">
            <Logo variant="dark" />
          </a>
          <div className="order-last flex w-full items-center gap-6 border-t border-neutral-800/60 pt-3 text-sm font-medium text-neutral-400 md:order-none md:w-auto md:border-0 md:pt-0">
            <a href="/examples" className="transition-colors hover:text-white">Examples</a>
            <a href="/security" className="transition-colors hover:text-white">Security</a>
            <a href="/about" className="transition-colors hover:text-white">About</a>
          </div>
          {user ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
            >
              Open Workspace
            </Link>
          ) : (
            <button
              onClick={loginWithGitHub}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
              aria-label="Sign in with GitHub"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Header
