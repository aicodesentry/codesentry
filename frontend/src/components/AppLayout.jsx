import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { label: 'Repositories', path: '/app/repositories' },
  { label: 'Suppressions', path: '/app/suppressions' },
  { label: 'Settings', path: '/app/settings' }
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/app/repositories" className="text-lg font-semibold tracking-tight text-slate-900">
            CodeSentry
          </Link>
          <nav className="flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-medium ${
                  location.pathname.startsWith(item.path) ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{user?.github_username}</span>
            <button onClick={logout} className="text-sm font-medium text-slate-500 hover:text-rose-700">
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
