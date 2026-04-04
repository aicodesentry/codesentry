import { useAuth } from '../contexts/AuthContext'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useOnboarding } from '../contexts/OnboardingContext'
import { repositoryAPI } from '../services/api'
import { EmptyPanel, PageHeader, PageStats } from '../components/PageSection'
import { Pagination } from '../components/ui/pagination'
import { ArrowUpRight, GitPullRequest, Shield, ShieldAlert, Server, Search } from 'lucide-react'

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
  const { loading: onboardingLoading, status: onboardingStatus } = useOnboarding()
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
                },
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
        acc.total +=
          pr.severity_counts.critical +
          pr.severity_counts.high +
          pr.severity_counts.medium +
          pr.severity_counts.low
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

  const statVal = (v) => (loading || onboardingLoading ? '-' : v)

  if (onboardingStatus.needsOnboarding) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="First Value"
          title="Finish setup before you use the workspace"
          description="The dashboard is only useful after one repo is active and the first PR analysis has landed."
          actions={
            <Link
              to="/dashboard/onboarding"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Continue onboarding
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          }
        />

        <EmptyPanel
          title="This workspace is not live yet"
          description="Connect one repository, open one pull request, and come back once Mitig8it has produced the first review."
          action={
            <Link
              to={onboardingStatus.hasActiveRepo ? '/dashboard/reports' : '/dashboard/repositories'}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-900"
            >
              {onboardingStatus.hasActiveRepo ? 'Check reports' : 'Choose a repository'}
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {onboardingStatus.needsFirstReview ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100">
          Your workspace is connected. Open or update a pull request in an active repository to generate the first review.
        </div>
      ) : null}

      <PageHeader
        title={user?.github_username ? `${user.github_username}'s workspace` : 'Dashboard'}
        description="Security posture across your repositories"
        actions={
          <Link
            to="/dashboard/reports"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            View reports
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <PageStats
        items={[
          { label: 'Active repos', value: statVal(onboardingStatus.activeRepositoryCount), icon: <Server className="h-4 w-4 text-slate-600 dark:text-slate-300" /> },
          { label: 'PRs tracked', value: statVal(prInsights.length), icon: <GitPullRequest className="h-4 w-4 text-slate-600 dark:text-slate-300" /> },
          { label: 'Scans run', value: statVal(analysisSummary.total_analyses), icon: <Search className="h-4 w-4 text-slate-600 dark:text-slate-300" /> },
          { label: 'Open findings', value: statVal(severityTotals.total), icon: <ShieldAlert className="h-4 w-4 text-slate-600 dark:text-slate-300" /> },
        ]}
      />

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
