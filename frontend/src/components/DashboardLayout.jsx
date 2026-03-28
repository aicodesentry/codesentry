import { Link, useLocation, Outlet } from 'react-router-dom'
import { LayoutDashboard, Code2, FolderGit2, FileText, CreditCard, LifeBuoy, UserCircle, Moon, Sun, Search } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import Footer from './Footer'
import Logo from './Logo'
import { Button } from './ui/button'

const DashboardLayout = () => {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Code Playground', href: '/dashboard/analysis', icon: Code2 },
    { name: 'Repositories', href: '/dashboard/repositories', icon: FolderGit2 },
    { name: 'Reports', href: '/dashboard/reports', icon: FileText },
    { name: 'Subscription', href: '/dashboard/subscription', icon: CreditCard },
    { name: 'Support', href: '/dashboard/support', icon: LifeBuoy },
    { name: 'Profile', href: '/dashboard/profile', icon: UserCircle },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="relative flex">
        <aside className="hidden lg:flex fixed inset-y-0 left-0 w-72 flex-col border-r border-slate-200/70 bg-slate-950 text-slate-100 dark:border-slate-800/80 dark:bg-slate-950">
          <a href="/" className="flex items-center gap-3 px-6 py-6 border-b border-slate-800/80">
            <Logo variant="dark" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Beta</span>
          </a>

          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-slate-800/80 text-white shadow-sm shadow-black/20'
                      : 'text-slate-300 hover:bg-slate-800/40 hover:text-white'
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
              className="w-full justify-start text-slate-300 hover:text-white"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </Button>

            <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/60 px-3 py-3">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.github_username} className="h-10 w-10 rounded-full border border-slate-700" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300">
                  <UserCircle className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{user?.github_username || user?.name || 'User'}</p>
                <button onClick={logout} className="text-xs text-slate-400 hover:text-rose-300">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen w-full flex-col lg:pl-72">
          <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/80">
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 md:px-10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">CodeSentry</p>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {navigation.find(item => isActive(item.href))?.name || 'Dashboard'}
                </h1>
              </div>
              <div className="flex flex-1 items-center justify-end gap-3 md:max-w-md">
                <div className="relative w-full max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="search"
                    placeholder="Search pull requests, repos, alerts"
                    className="w-full rounded-lg border border-slate-200/70 bg-white/80 py-2 pl-9 pr-3 text-sm text-slate-700 shadow-sm shadow-slate-200/40 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-800/80 dark:bg-slate-900/80 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-slate-700 dark:focus:ring-slate-800"
                  />
                </div>
                <span className="hidden text-xs text-slate-500 dark:text-slate-400 md:inline">
                  {user?.github_email || user?.email || ''}
                </span>
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

export default DashboardLayout
