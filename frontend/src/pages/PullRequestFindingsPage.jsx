import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { findingAPI, suppressionAPI } from '../services/api'

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }

export default function PullRequestFindingsPage() {
  const { pullRequestId } = useParams()
  const [findings, setFindings] = useState([])

  const load = useCallback(async () => {
    const data = await findingAPI.listByPR(pullRequestId, { status: 'all', min_confidence: 0 })
    setFindings(data.findings || [])
  }, [pullRequestId])

  useEffect(() => {
    load().catch((err) => console.error(err))
  }, [load])

  const ordered = useMemo(() => {
    return [...findings].sort((a, b) => {
      const sevDiff = (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99)
      if (sevDiff !== 0) return sevDiff
      return Number(b.confidence) - Number(a.confidence)
    })
  }, [findings])

  const suppress = async (finding) => {
    await suppressionAPI.create({
      finding_id: finding.id,
      repository_id: finding.repository_id,
      reason: 'false_positive',
      notes: 'Suppressed from PR findings page'
    })
    await load()
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-neutral-900">Pull Request Findings</h1>

      {ordered.length === 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
          No findings detected for this pull request.
        </div>
      )}

      {ordered.map((finding) => (
        <div key={finding.id} className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">{finding.title}</h2>
              <p className="text-sm text-neutral-500">
                {finding.category} • {finding.severity} • confidence {Math.round(Number(finding.confidence) * 100)}%
              </p>
              {finding.remediation_patch && (
                <p className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  Suggested fix available
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={`/dashboard/findings/${finding.id}`}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700"
              >
                Details
              </Link>
              <button
                onClick={() => suppress(finding)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700"
              >
                Suppress
              </button>
            </div>
          </div>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-neutral-900 p-3 text-xs text-neutral-100">{finding.code_snippet || 'No snippet'}</pre>
          <p className="mt-3 text-sm text-neutral-700">{finding.evidence}</p>
          {finding.remediation && (
            <p className="mt-3 text-sm text-neutral-700">{finding.remediation}</p>
          )}
        </div>
      ))}
    </div>
  )
}
