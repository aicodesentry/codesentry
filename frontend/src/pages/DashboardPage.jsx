import { useAuth } from '../contexts/AuthContext'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { repositoryAPI } from '../services/api'
import { Pagination } from '../components/ui/pagination'
import { ArrowUpRight, Clock, GitPullRequest, Shield, ShieldAlert, Server, Search } from 'lucide-react'

const statusConfig = {
  merged: { label: 'Merged', dot: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400' },
  open: { label: 'Open', dot: 'bg-green-500', text: 'text-green-600 dark:text-green-400' },
  closed: { label: 'Closed', dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
  draft: { label: 'Draft', dot: 'bg-slate-400', text: 'text-slate-500 dark:text-slate-400' },
}

const severityConfig = {
  critical: { label: 'C', bg: 'bg-red-500', text: 'text-white' },
  high: { label: 'H', bg: 'bg-orange-500', text: 'text-white' },
  medium: { label: 'M', bg: 'bg-amber-400', text: 'text-amber-900' },
  low: { label: 'L', bg: 'bg-sky-400', text: 'text-sky-900' },
}

const DashboardPage = () => {
  const { user } = useAuth()
  const [connectedRepoCount, setConnectedRepoCount] = useState(0)
  const [analysisSummary, setAnalysisSummary] = useState({
    total_analyses: 0, completed: 0, failed: 0, recent_7_days: 0
  })
  const [loading, setLoading] = useState(true)
  const [prInsights, setPrInsights] = useState([])
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [insightsPage, setInsightsPage] = useState(1)
  const insightsPerPage = 8

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const repoData = await repositoryAPI.getConnectedCount()
        setConnectedRepoCount(repoData.count)
        const summaryData = await repositoryAPI.getSummary()
        setAnalysisSummary(summaryData.summary)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    const fetchPRInsights = async () => {
      try {
        setInsightsLoading(true)
        const reposResponse = await repositoryAPI.list()
        const repositories = reposResponse.repositories || []
        const prLists = await Promise.allSettled(
          repositories.map(async (repo) => {
            const response = await repositoryAPI.listPRs(repo.id)
            return { repo, prs: response.pull_requests || [] }
          })
        )
        const prMap = new Map()
        prLists.forEach((result) => {
          if (result.status !== 'fulfilled') return
          const { repo, prs } = result.value
          prs.forEach((prItem) => {
            const prKey = `${repo.full_name}#${prItem.pr_number}`
            if (!prMap.has(prKey)) {
              prMap.set(prKey, {
                repository: repo.full_name,
                pr_number: prItem.pr_number,
                title: prItem.title,
                html_url: prItem.html_url,
                author: prItem.author,
                status: prItem.draft ? 'draft' : prItem.merged_at ? 'merged' : prItem.state || 'open',
                timestamp: prItem.created_at,
                severity_counts: {
                  critical: Number(prItem.critical_count || 0),
                  high: Number(prItem.high_count || 0),
                  medium: Number(prItem.medium_count || 0),
                  low: Number(prItem.low_count || 0),
                }
              })
            }
          })
        })
        setPrInsights(
          Array.from(prMap.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        )
      } catch (error) {
        console.error('Failed to fetch PR insights:', error)
      } finally {
        setInsightsLoading(false)
      }
    }

    fetchDashboardData()
    fetchPRInsights()
  }, [])

  const severityTotals = useMemo(() => {
    return prInsights.reduce(
      (acc, pr) => {
        acc.critical += pr.severity_counts.critical
        acc.high += pr.severity_counts.high
        acc.medium += pr.severity_counts.medium
        acc.low += pr.severity_counts.low
        acc.total += pr.total_vulnerabilities
        return acc
      },
      { critical: 0, high: 0, medium: 0, low: 0, total: 0 }
    )
  }, [prInsights])

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`
    if (diffMins < 43200) return `${Math.floor(diffMins / 1440)}d`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const statVal = (v) => (loading ? '-' : v)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {user?.github_username ? `${user.github_username}'s workspace` : 'Dashboard'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Security posture across your repositories</p>
        </div>
        <Link
          to="/dashboard/analysis"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          Quick fix
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <Server className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{statVal(connectedRepoCount)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Repos</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <GitPullRequest className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{statVal(prInsights.length)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">PRs tracked</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <Search className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{statVal(analysisSummary.total_analyses)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Scans run</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <ShieldAlert className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{statVal(severityTotals.total)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Open findings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Severity bar */}
      {severityTotals.total > 0 && (
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
          <Shield className="h-4 w-4 text-slate-400" />
          <div className="flex flex-1 items-center gap-2">
            <div className="flex flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              {severityTotals.critical > 0 && (
                <div className="bg-red-500" style={{ width: `${(severityTotals.critical / severityTotals.total) * 100}%` }} />
              )}
              {severityTotals.high > 0 && (
                <div className="bg-orange-500" style={{ width: `${(severityTotals.high / severityTotals.total) * 100}%` }} />
              )}
              {severityTotals.medium > 0 && (
                <div className="bg-amber-400" style={{ width: `${(severityTotals.medium / severityTotals.total) * 100}%` }} />
              )}
              {severityTotals.low > 0 && (
                <div className="bg-sky-400" style={{ width: `${(severityTotals.low / severityTotals.total) * 100}%` }} />
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            {severityTotals.critical > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />{severityTotals.critical} critical</span>}
            {severityTotals.high > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" />{severityTotals.high} high</span>}
            {severityTotals.medium > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />{severityTotals.medium} medium</span>}
            {severityTotals.low > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-400" />{severityTotals.low} low</span>}
          </div>
        </div>
      )}

      {/* PR list */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Pull Requests</h2>
          <Link to="/dashboard/reports" className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            View reports
          </Link>
        </div>

        {insightsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : prInsights.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            No pull requests yet. Connect repositories and sync to see PR activity.
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {prInsights
                .slice((insightsPage - 1) * insightsPerPage, insightsPage * insightsPerPage)
                .map((pr) => {
                  const st = statusConfig[pr.status] || statusConfig.open
                  return (
                    <div key={`${pr.repository}-${pr.pr_number}`} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      {/* Status dot */}
                      <span className={`h-2 w-2 flex-shrink-0 rounded-full ${st.dot}`} title={st.label} />

                      {/* PR info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          #{pr.pr_number} {pr.title || 'Untitled'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {pr.repository} · {pr.author} · <span className={st.text}>{st.label}</span> · {formatTime(pr.timestamp)}
                        </p>
                      </div>

                      {/* Severity pills */}
                      <div className="hidden sm:flex items-center gap-1">
                        {Object.entries(pr.severity_counts).map(([level, count]) => {
                          if (!count) return null
                          const cfg = severityConfig[level]
                          return (
                            <span key={level} className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded px-1.5 text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                              {count}
                            </span>
                          )
                        })}
                      </div>

                      {/* GitHub link */}
                      <a
                        href={pr.html_url || `https://github.com/${pr.repository}/pull/${pr.pr_number}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title="Open on GitHub"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    </div>
                  )
                })}
            </div>
            {prInsights.length > insightsPerPage && (
              <Pagination
                currentPage={insightsPage}
                totalPages={Math.ceil(prInsights.length / insightsPerPage)}
                onPageChange={setInsightsPage}
                className="pt-3"
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
