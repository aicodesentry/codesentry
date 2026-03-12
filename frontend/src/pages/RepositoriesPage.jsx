import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { installationAPI, repositoryAPI } from '../services/api'

export default function RepositoriesPage() {
  const [repositories, setRepositories] = useState([])
  const [installationCount, setInstallationCount] = useState(0)
  const [syncSummary, setSyncSummary] = useState({ synced_installations: 0, synced_repositories: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncError, setSyncError] = useState(null)
  const [syncing, setSyncing] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    setSyncError(null)
    setSyncing(true)
    try {
      let syncData = { synced_installations: 0, synced_repositories: 0 }
      try {
        syncData = await installationAPI.sync()
      } catch (syncErr) {
        setSyncError(syncErr.response?.data?.error || syncErr.message || 'Failed to sync installations')
      } finally {
        setSyncing(false)
      }

      setSyncSummary({
        synced_installations: Number(syncData?.synced_installations || 0),
        synced_repositories: Number(syncData?.synced_repositories || 0)
      })
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

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Repositories</h1>
          <p className="text-sm text-slate-500">Connected GitHub repositories with PR security activity.</p>
        </div>
        <Link to="/dashboard/onboarding" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
          Install Flow
        </Link>
      </div>

      {loading && <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading repositories...</div>}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {!loading && !error && syncError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">{syncError}</p>
          <p className="mt-1 text-xs text-amber-800">
            Showing repositories from current database state. Re-sync can be retried after GitHub app permissions are fixed.
          </p>
        </div>
      )}
      {!loading && !error && repositories.length === 0 && installationCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            App installed, but no repositories are accessible yet.
          </p>
          <p className="mt-1 text-sm text-amber-800">
            Grant repository access for CodeSentry in GitHub, then re-sync.
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Last sync: {syncSummary.synced_installations} installations, {syncSummary.synced_repositories} repositories
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="https://github.com/settings/installations"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-amber-900 px-3 py-2 text-xs font-semibold text-white"
            >
              Fix GitHub App Access
            </a>
            <button
              onClick={load}
              disabled={syncing}
              className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-900"
            >
              {syncing ? 'Re-syncing...' : 'Re-sync'}
            </button>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4">
          {repositories.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No repositories found.</div>
          )}
          {repositories.map((repo) => (
            <Link
              key={repo.id}
              to={`/dashboard/repositories/${repo.id}`}
              className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{repo.full_name}</h2>
                  <p className="text-sm text-slate-500">{repo.language || 'Unknown language'} • default: {repo.default_branch}</p>
                </div>
                <div className="text-right text-sm text-slate-600">
                  <p>Open findings: <span className="font-semibold text-slate-900">{repo.open_findings_count}</span></p>
                  <p>PRs tracked: <span className="font-semibold text-slate-900">{repo.pull_request_count}</span></p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
