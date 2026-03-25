import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { installationAPI, repositoryAPI } from '../services/api'

export default function RepositoriesPage() {
  const [repositories, setRepositories] = useState([])
  const [installationCount, setInstallationCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [connecting, setConnecting] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    setSyncing(true)
    try {
      try {
        await installationAPI.sync()
      } catch (_syncErr) {
        // sync errors are non-fatal
      } finally {
        setSyncing(false)
      }

      const { installations } = await installationAPI.list().catch(() => ({ installations: [] }))
      setInstallationCount((installations || []).length)
      const { repositories: repos } = await repositoryAPI.list()
      setRepositories(repos || [])
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setSyncing(false)
      setLoading(false)
    }
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

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Repositories</h1>
          <p className="text-sm text-slate-500">Connect repositories to enable PR security analysis.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={syncing}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Re-sync'}
          </button>
          <Link to="/dashboard/onboarding" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
            Install Flow
          </Link>
        </div>
      </div>

      {loading && <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading repositories...</div>}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      {!loading && !error && repositories.length === 0 && installationCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">App installed, but no repositories are accessible yet.</p>
          <p className="mt-1 text-sm text-amber-800">Grant repository access for CodeSentry in GitHub, then re-sync.</p>
          <a
            href="https://github.com/settings/installations"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block rounded-lg bg-amber-900 px-3 py-2 text-xs font-semibold text-white"
          >
            Fix GitHub App Access
          </a>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4">
          {repositories.length === 0 && installationCount === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No repositories found. Install the GitHub App first.</div>
          )}
          {repositories.map((repo) => (
            <div
              key={repo.id}
              className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300"
            >
              <div className="flex items-center justify-between gap-4">
                <Link to={`/dashboard/repositories/${repo.id}`} className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-slate-900">{repo.full_name}</h2>
                  <p className="text-sm text-slate-500">
                    {repo.language || 'Unknown language'} · {repo.private ? 'Private' : 'Public'} · default: {repo.default_branch}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Open findings: <span className="font-semibold">{repo.open_findings_count || 0}</span> · PRs: <span className="font-semibold">{repo.pull_request_count || 0}</span>
                  </p>
                </Link>
                <div className="flex-shrink-0">
                  {repo.is_active ? (
                    <button
                      onClick={() => handleDisconnect(repo.id)}
                      disabled={connecting === repo.id}
                      className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
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
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
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
        </div>
      )}
    </div>
  )
}
