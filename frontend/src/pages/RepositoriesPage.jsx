import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { installationAPI, repositoryAPI } from '../services/api'

export default function RepositoriesPage() {
  const [repositories, setRepositories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      await installationAPI.sync().catch(() => null)
      const { repositories: repos } = await repositoryAPI.list()
      setRepositories(repos || [])
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
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
