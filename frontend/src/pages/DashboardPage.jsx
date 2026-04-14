import { useAuth } from '../contexts/AuthContext'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useOnboarding } from '../contexts/OnboardingContext'
import { repositoryAPI } from '../services/api'
import { PageHeader, PageStats } from '../components/PageSection'
import { Pagination } from '../components/ui/pagination'
import { ArrowUpRight, GitPullRequest, Shield, ShieldAlert, Server, Search } from 'lucide-react'

const GITHUB_APP_URL = 'https://github.com/apps/mitig8it/installations/new'

const statusConfig = {
  merged: { label: 'Merged', dot: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400' },
  open: { label: 'Open', dot: 'bg-green-500', text: 'text-green-600 dark:text-green-400' },
  closed: { label: 'Closed', dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
  draft: { label: 'Draft', dot: 'bg-neutral-400', text: 'text-neutral-500 dark:text-neutral-400' },
}

const severityConfig = {
  critical: { label: 'C', bg: 'bg-red-500', text: 'text-white' },
  high: { label: 'H', bg: 'bg-orange-500', text: 'text-white' },
  medium: { label: 'M', bg: 'bg-amber-400', text: 'text-amber-900' },
  low: { label: 'L', bg: 'bg-sky-400', text: 'text-sky-900' },
}

const DashboardPage = () => {
  const { githubAppInstallUrl, user } = useAuth()
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

  return (
    <div className="space-y-6">
      {onboardingStatus.needsOnboarding ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-semibold">
                Your account is ready. GitHub App install is optional until you want live repository data.
              </p>
              <p className="mt-1 text-sky-800/80 dark:text-sky-100/80">
                Browse the workspace now, or connect GitHub later to sync repositories and trigger PR reviews.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/dashboard/onboarding"
                className="inline-flex items-center gap-2 rounded-lg border border-sky-300 px-4 py-2 text-sm font-medium text-sky-900 transition hover:bg-sky-100 dark:border-sky-400/40 dark:text-sky-100 dark:hover:bg-sky-400/10"
              >
                View setup guide
              </Link>
              {!onboardingStatus.hasInstall ? (
                <a
                  href={githubAppInstallUrl || GITHUB_APP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-800 dark:bg-sky-100 dark:text-sky-950 dark:hover:bg-white"
                >
                  Install GitHub App
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {onboardingStatus.needsFirstReview ? (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-300">
          Your workspace is connected. Open or update a pull request in an active repository to generate the first review.
        </div>
      ) : null}

      <PageHeader
        title={user?.github_username ? `${user.github_username}'s workspace` : 'Dashboard'}
        description="Security posture across your repositories"
        actions={
          <Link
            to="/dashboard/reports"
            className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          >
            View reports
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <PageStats
        items={[
          { label: 'Active repos', value: statVal(onboardingStatus.activeRepositoryCount), icon: <Server className="h-4 w-4 text-neutral-600 dark:text-neutral-300" /> },
          { label: 'PRs tracked', value: statVal(prInsights.length), icon: <GitPullRequest className="h-4 w-4 text-neutral-600 dark:text-neutral-300" /> },
          { label: 'Scans run', value: statVal(analysisSummary.total_analyses), icon: <Search className="h-4 w-4 text-neutral-600 dark:text-neutral-300" /> },
          { label: 'Open findings', value: statVal(severityTotals.total), icon: <ShieldAlert className="h-4 w-4 text-neutral-600 dark:text-neutral-300" /> },
        ]}
      />

      {/* Severity bar */}
      {severityTotals.total > 0 && (
        <div className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white px-5 py-3 dark:border-neutral-800 dark:bg-neutral-900">
          <Shield className="h-4 w-4 text-neutral-400" />
          <div className="flex flex-1 items-center gap-2">
            <div className="flex flex-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
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
          <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
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
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Recent Pull Requests</h2>
          <Link to="/dashboard/reports" className="text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
            View reports
          </Link>
        </div>

        {insightsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
            ))}
          </div>
        ) : prInsights.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 px-6 py-12 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            {onboardingStatus.hasInstall
              ? 'No pull requests yet. Connect repositories and sync to see PR activity.'
              : 'No pull requests yet. Install the GitHub App when you are ready to bring repository activity into the workspace.'}
          </div>
        ) : (
          <>
            <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
              {prInsights
                .slice((insightsPage - 1) * insightsPerPage, insightsPage * insightsPerPage)
                .map((pr) => {
                  const st = statusConfig[pr.status] || statusConfig.open
                  return (
                    <div key={`${pr.repository}-${pr.pr_number}`} className="flex items-center gap-4 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      {/* Status dot */}
                      <span className={`h-2 w-2 flex-shrink-0 rounded-full ${st.dot}`} title={st.label} />

                      {/* PR info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                          #{pr.pr_number} {pr.title || 'Untitled'}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
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
                        className="flex-shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
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
