import { Link, Outlet, useLocation } from 'react-router-dom'
import { Code2, CreditCard, FileText, FolderGit2, LayoutDashboard, LifeBuoy, Moon, Sparkles, Sun, UserCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { OnboardingProvider, useOnboarding } from '../contexts/OnboardingContext'
import { useTheme } from '../contexts/ThemeContext'
import Footer from './Footer'
import Logo from './Logo'
import { Button } from './ui/button'

const DashboardShell = () => {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { status } = useOnboarding()
  const location = useLocation()

  const navigation = status.needsOnboarding
    ? [
        { name: 'Onboarding', href: '/dashboard/onboarding', icon: Sparkles },
        { name: 'Repositories', href: '/dashboard/repositories', icon: FolderGit2 },
      ]
    : [
        { name: 'Dashboard', href: '/dashboard/home', icon: LayoutDashboard },
        { name: 'Onboarding', href: '/dashboard/onboarding', icon: Sparkles },
        { name: 'Repositories', href: '/dashboard/repositories', icon: FolderGit2 },
        { name: 'Reports', href: '/dashboard/reports', icon: FileText },
        { name: 'Code Playground', href: '/dashboard/analysis', icon: Code2 },
        { name: 'Subscription', href: '/dashboard/subscription', icon: CreditCard },
        { name: 'Support', href: '/dashboard/support', icon: LifeBuoy },
        { name: 'Profile', href: '/dashboard/profile', icon: UserCircle },
      ]

  const pageName = navigation.find((item) => location.pathname === item.href)?.name || 'Dashboard'

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors">
      <div className="relative flex">
        <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-neutral-200/70 bg-neutral-950 text-neutral-100 dark:border-neutral-800/80 dark:bg-neutral-950 lg:flex">
          <a href="/" className="flex items-center gap-3 border-b border-neutral-800/80 px-6 py-6">
            <Logo variant="dark" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
              {status.needsOnboarding ? 'First Run' : 'Beta'}
            </span>
          </a>

          <nav className="flex-1 space-y-1 px-4 py-6">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    location.pathname === item.href
                      ? 'bg-neutral-800/80 text-white shadow-sm shadow-black/20'
                      : 'text-neutral-300 hover:bg-neutral-800/40 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          <div className="px-4 pb-6">
            <Button
              onClick={toggleTheme}
              variant="ghost"
              className="w-full justify-start text-neutral-300 hover:text-white"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </Button>

            <div className="mt-4 rounded-xl border border-neutral-800/80 bg-neutral-900/60 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                {status.needsOnboarding ? 'Activation' : 'Live workspace'}
              </p>
              <p className="mt-2 text-sm text-neutral-300">
                {status.needsOnboarding
                  ? 'Connect one repo, open one PR, and confirm the first review lands.'
                  : 'Your GitHub app is connected and reviews are flowing through the workspace.'}
              </p>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-xl border border-neutral-800/80 bg-neutral-900/60 px-3 py-3">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.github_username} className="h-10 w-10 rounded-full border border-neutral-700" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 text-neutral-300">
                  <UserCircle className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{user?.github_username || user?.name || 'User'}</p>
                <button onClick={logout} className="text-xs text-neutral-400 hover:text-rose-300">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen w-full flex-col lg:pl-72">
          <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/80 backdrop-blur dark:border-neutral-800/80 dark:bg-neutral-950/80">
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 md:px-10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">Mitig8it</p>
                <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">{pageName}</h1>
              </div>
              <div className="rounded-full border border-neutral-200/70 bg-white/80 px-4 py-2 text-xs font-medium capitalize text-neutral-600 dark:border-neutral-800/80 dark:bg-neutral-900/80 dark:text-neutral-300">
                {status.needsOnboarding
                  ? `Next step: ${status.nextStep.replace('-', ' ')}`
                  : `${status.analysisCount} analyses recorded`}
              </div>
            </div>
          </header>

          <main className="flex-1 px-6 py-8 md:px-10">
            <Outlet />
          </main>

          <Footer variant="dashboard" />
        </div>
      </div>
    </div>
  )
}

const DashboardLayout = () => (
  <OnboardingProvider>
    <DashboardShell />
  </OnboardingProvider>
)

export default DashboardLayout
