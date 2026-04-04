import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Compass, GitFork, ShieldAlert, Sparkles } from 'lucide-react'
import { repositoryAPI } from '../services/api'
import { useOnboarding } from '../contexts/OnboardingContext'
import { Pagination } from '../components/ui/pagination'

export default function RepositoriesPage() {
  const { error, refresh, repositories, status, syncing } = useOnboarding()
  const [connecting, setConnecting] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const reposPerPage = 8

  const handleConnect = async (repoId, enabled) => {
    setConnecting(repoId)
    setActionError(null)
    try {
      if (enabled) {
        await repositoryAPI.connect(repoId)
      } else {
        await repositoryAPI.disconnect(repoId)
      }
      await refresh()
    } catch (err) {
      setActionError(err.response?.data?.error || err.message)
    } finally {
      setConnecting(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(repositories.length / reposPerPage))
  const paginatedRepos = useMemo(
    () => repositories.slice((currentPage - 1) * reposPerPage, currentPage * reposPerPage),
    [repositories, currentPage]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Repositories</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Connect repositories to start receiving PR reviews</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refresh({ sync: true })}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {syncing ? 'Syncing...' : 'Sync GitHub'}
          </button>
          <Link
            to="/dashboard/onboarding"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            Setup guide
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: Compass, value: status.repositoryCount, label: 'Visible repos' },
          { icon: GitFork, value: status.activeRepositoryCount, label: 'Connected' },
          { icon: ShieldAlert, value: repositories.reduce((sum, r) => sum + Number(r.open_findings_count || 0), 0), label: 'Open findings' },
          { icon: Sparkles, value: status.hasActiveRepo ? 'Open PR' : 'Connect', label: 'Next move' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                <stat.icon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(error || actionError) && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 dark:border-red-500/30 dark:bg-red-500/10">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">{actionError || error}</p>
        </div>
      )}

      {status.repositoryCount === 0 && status.installationCount > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-900 dark:text-white">The app is installed, but GitHub has not granted repository access yet.</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Expand repository access in GitHub installation settings, then sync again.
          </p>
          <a
            href="https://github.com/settings/installations"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-slate-900 hover:underline dark:text-white"
          >
            Fix GitHub App access
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {/* Repo list */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Repository roster</h2>
          {status.hasFirstReview && (
            <Link to="/dashboard/reports" className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              View reports
            </Link>
          )}
        </div>

        {repositories.length === 0 && status.installationCount === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            No repositories yet. Install the GitHub App first, then sync to see your repos.
          </div>
        ) : (
          <div className="space-y-2">
            {paginatedRepos.map((repo) => (
              <div
                key={repo.id}
                className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition ${
                  repo.is_active
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-950/10'
                    : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/50'
                }`}
              >
                {repo.is_active && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500" />}

                <Link to={`/dashboard/repositories/${repo.id}`} className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{repo.full_name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {repo.language || 'Unknown'} · {repo.private ? 'Private' : 'Public'} · {repo.open_findings_count || 0} findings · {repo.pull_request_count || 0} PRs
                  </p>
                </Link>

                <div className="flex-shrink-0">
                  {repo.is_active ? (
                    <button
                      onClick={() => handleConnect(repo.id, false)}
                      disabled={connecting === repo.id}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      {connecting === repo.id ? 'Updating...' : 'Connected'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(repo.id, true)}
                      disabled={connecting === repo.id}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                    >
                      {connecting === repo.id ? 'Connecting...' : 'Connect'}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {repositories.length > reposPerPage && (
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} className="pt-2" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
