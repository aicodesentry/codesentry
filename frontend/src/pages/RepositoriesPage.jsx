import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Compass, GitFork, ShieldAlert, Sparkles } from 'lucide-react'
import { installationAPI, repositoryAPI } from '../services/api'
import { EmptyPanel, PageHeader, PagePanel, PageStats } from '../components/PageSection'
import { Pagination } from '../components/ui/pagination'

export default function RepositoriesPage() {
  const [repositories, setRepositories] = useState([])
  const [installationCount, setInstallationCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [connecting, setConnecting] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const reposPerPage = 8

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const { installations } = await installationAPI.list().catch(() => ({ installations: [] }))
      setInstallationCount((installations || []).length)
      const { repositories: repos } = await repositoryAPI.list()
      setRepositories(repos || [])
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    try {
      await installationAPI.sync()
    } catch (_) {
      // non-fatal
    } finally {
      setSyncing(false)
    }
    await fetchData()
  }

  const handleConnect = async (repoId) => {
    setConnecting(repoId)
    try {
      await repositoryAPI.connect(repoId)
      setRepositories((prev) =>
        prev.map((r) => (r.id === repoId ? { ...r, is_active: true } : r))
      )
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setConnecting(null)
    }
  }

  const handleDisconnect = async (repoId) => {
    setConnecting(repoId)
    try {
      await repositoryAPI.disconnect(repoId)
      setRepositories((prev) =>
        prev.map((r) => (r.id === repoId ? { ...r, is_active: false } : r))
      )
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setConnecting(null)
    }
  }

  const totalPages = Math.ceil(repositories.length / reposPerPage)
  const paginatedRepos = useMemo(
    () => repositories.slice((currentPage - 1) * reposPerPage, currentPage * reposPerPage),
    [repositories, currentPage, reposPerPage]
  )

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Repository Access"
        title="Connect the repos that should trigger PR security reviews"
        description="This is the control room for app installations, repo availability, and whether a repo is actively sending pull requests into the analysis pipeline."
        actions={
          <>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-900 disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Re-sync'}
            </button>
            <Link
              to="/dashboard/onboarding"
              className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              Install Flow
            </Link>
          </>
        }
      />

      <PageStats
        items={[
          {
            label: 'Visible Repos',
            value: loading ? '...' : repositories.length,
            meta: installationCount > 0 ? `${installationCount} install${installationCount === 1 ? '' : 's'}` : 'no installs',
            icon: <Compass className="h-5 w-5 text-sky-300" />,
            iconWrapClassName: 'bg-sky-500/10',
          },
          {
            label: 'Connected',
            value: loading ? '...' : repositories.filter((repo) => repo.is_active).length,
            meta: 'actively scanning',
            icon: <GitFork className="h-5 w-5 text-emerald-300" />,
            iconWrapClassName: 'bg-emerald-500/10',
          },
          {
            label: 'Open Findings',
            value: loading ? '...' : repositories.reduce((sum, repo) => sum + Number(repo.open_findings_count || 0), 0),
            meta: 'across visible repos',
            icon: <ShieldAlert className="h-5 w-5 text-rose-300" />,
            iconWrapClassName: 'bg-rose-500/10',
          },
          {
            label: 'Next Move',
            value: installationCount > 0 ? 'PR' : 'Install',
            meta: installationCount > 0 ? 'open a test pull request' : 'grant GitHub access',
            icon: <Sparkles className="h-5 w-5 text-amber-300" />,
            iconWrapClassName: 'bg-amber-500/10',
          },
        ]}
      />

      {loading && (
        <PagePanel title="Fetching repositories" description="Pulling installation state and repository access from GitHub.">
          <p className="text-sm text-slate-400">Loading repositories...</p>
        </PagePanel>
      )}
      {error && (
        <PagePanel className="border-rose-500/40 bg-rose-950/30" contentClassName="p-5">
          <p className="text-sm font-medium text-rose-100">{error}</p>
        </PagePanel>
      )}

      {!loading && !error && repositories.length === 0 && installationCount > 0 && (
        <PagePanel className="border-amber-500/35 bg-amber-950/25">
          <p className="text-sm font-semibold text-amber-100">App installed, but the repo list is still empty.</p>
          <p className="mt-1 text-sm text-amber-200/80">
            That usually means GitHub App permissions are scoped too tightly. Fix access, then re-sync.
          </p>
          <a
            href="https://github.com/settings/installations"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex rounded-xl bg-amber-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-950"
          >
            Fix GitHub App Access
          </a>
        </PagePanel>
      )}

      {!loading && !error && (
        <PagePanel
          title="Repository roster"
          description="Choose what stays active in the review pipeline."
          action={
            repositories.length > 0 ? (
              <Link
                to="/dashboard/reports"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500 hover:text-white"
              >
                View reports
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            ) : null
          }
        >
          <div className="grid gap-4">
          {repositories.length === 0 && installationCount === 0 && (
            <EmptyPanel
              title="No repositories yet"
              description="Install the GitHub App first. Once GitHub sends repo access, this page becomes your source of truth for active scans."
              action={
                <Link
                  to="/dashboard/onboarding"
                  className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                >
                  Open onboarding
                </Link>
              }
            />
          )}
          {paginatedRepos.map((repo) => (
            <div
              key={repo.id}
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-slate-600"
            >
              <div className="flex items-center justify-between gap-4">
                <Link to={`/dashboard/repositories/${repo.id}`} className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-white">{repo.full_name}</h2>
                  <p className="text-sm text-slate-400">
                    {repo.language || 'Unknown language'} · {repo.private ? 'Private' : 'Public'} · default: {repo.default_branch}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    Open findings: <span className="font-semibold">{repo.open_findings_count || 0}</span> · PRs: <span className="font-semibold">{repo.pull_request_count || 0}</span>
                  </p>
                </Link>
                <div className="flex-shrink-0">
                  {repo.is_active ? (
                    <button
                      onClick={() => handleDisconnect(repo.id)}
                      disabled={connecting === repo.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Connected
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(repo.id)}
                      disabled={connecting === repo.id}
                      className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      {connecting === repo.id ? 'Connecting...' : 'Connect'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            className="pt-2"
          />
          </div>
        </PagePanel>
      )}
    </div>
  )
}
