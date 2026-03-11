import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { repositoryAPI } from '../services/api'

export default function RepositoryDetailsPage() {
  const { repositoryId } = useParams()
  const [repository, setRepository] = useState(null)
  const [summary, setSummary] = useState(null)
  const [pullRequests, setPullRequests] = useState([])

  useEffect(() => {
    const load = async () => {
      const repoData = await repositoryAPI.get(repositoryId)
      const prData = await repositoryAPI.listPRs(repositoryId)
      setRepository(repoData.repository)
      setSummary(repoData.summary)
      setPullRequests(prData.pull_requests || [])
    }

    load().catch((err) => {
      console.error(err)
    })
  }, [repositoryId])

  if (!repository) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading repository...</div>
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-slate-900">{repository.full_name}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Open: {summary?.open_findings || 0} • Dismissed: {summary?.dismissed_findings || 0} • Accepted risk: {summary?.accepted_risk_findings || 0}
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Pull Requests</h2>
        {pullRequests.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No pull requests yet.</div>
        )}
        {pullRequests.map((pr) => (
          <Link
            key={pr.id}
            to={`/app/pull-requests/${pr.id}/findings`}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300"
          >
            <div>
              <p className="font-medium text-slate-900">#{pr.pr_number} {pr.title}</p>
              <p className="text-sm text-slate-500">{pr.state} • {pr.author}</p>
            </div>
            <div className="text-right text-sm text-slate-600">
              <p>Open findings: <span className="font-semibold text-slate-900">{pr.open_findings_count}</span></p>
              <p>Critical/High: <span className="font-semibold text-slate-900">{(pr.critical_count || 0) + (pr.high_count || 0)}</span></p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
