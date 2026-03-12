import { useAuth } from '../contexts/AuthContext'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { installationAPI, repositoryAPI } from '../services/api'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Activity, ArrowUpRight, CheckCircle2, Clock, FileCode, FolderGit2, GitPullRequest, Sparkles, TriangleAlert } from 'lucide-react'

const DashboardPage = () => {
  const { user } = useAuth()
  const [connectedRepoCount, setConnectedRepoCount] = useState(0)
  const [analysisSummary, setAnalysisSummary] = useState({
    total_analyses: 0,
    completed: 0,
    failed: 0,
    recent_7_days: 0
  })
  const [loading, setLoading] = useState(true)
  const [prInsights, setPrInsights] = useState([])
  const [insightsLoading, setInsightsLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        await installationAPI.sync().catch(() => null)
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
        await installationAPI.sync().catch(() => null)
        const reposResponse = await repositoryAPI.list()
        const repositories = reposResponse.repositories || []
        const prLists = await Promise.allSettled(
          repositories.slice(0, 12).map(async (repo) => {
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
            const critical = Number(prItem.critical_count || 0)
            const high = Number(prItem.high_count || 0)
            const totalVulns = Number(prItem.open_findings_count || 0)
            const medium = Math.max(0, totalVulns - critical - high)

            if (!prMap.has(prKey)) {
              prMap.set(prKey, {
                repository: repo.full_name,
                pr_number: prItem.pr_number,
                timestamp: prItem.updated_at || prItem.created_at,
                files_count: 1,
                total_vulnerabilities: totalVulns,
                severity_counts: { critical, high, medium, low: 0 }
              })
              return
            }

            const existing = prMap.get(prKey)
            existing.total_vulnerabilities += totalVulns
            existing.severity_counts.critical += critical
            existing.severity_counts.high += high
            existing.severity_counts.medium += medium
            if (prItem.updated_at && new Date(prItem.updated_at) > new Date(existing.timestamp)) {
              existing.timestamp = prItem.updated_at
            }
          })
        })

        const groupedPRs = Array.from(prMap.values())
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 8)

        setPrInsights(groupedPRs)
      } catch (error) {
        console.error('Failed to fetch PR insights:', error)
      } finally {
        setInsightsLoading(false)
      }
    }

    fetchDashboardData()
    fetchPRInsights()
  }, [])

  const severityMeta = {
    critical: {
      label: 'Critical',
      className: 'border-rose-200/70 bg-rose-500/10 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-200'
    },
    high: {
      label: 'High',
      className: 'border-amber-200/70 bg-amber-500/10 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-200'
    },
    medium: {
      label: 'Medium',
      className: 'border-orange-200/70 bg-orange-500/10 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/20 dark:text-orange-200'
    },
    low: {
      label: 'Low',
      className: 'border-sky-200/70 bg-sky-500/10 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/20 dark:text-sky-200'
    }
  }

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

  const completionRate = useMemo(() => {
    if (!analysisSummary.total_analyses) return 0
    return Math.round((analysisSummary.completed / analysisSummary.total_analyses) * 100)
  }, [analysisSummary])

  const formatRelativeTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const buildAISuggestions = (pr) => {
    if (!pr.total_vulnerabilities) {
      return ['No issues detected. Merge after standard review and CI checks.']
    }

    const suggestions = []

    if (pr.severity_counts.critical > 0) {
      suggestions.push('Block merge until auth, secrets, and data access checks are tightened.')
    }
    if (pr.severity_counts.high > 0) {
      suggestions.push('Add guardrails for input validation and boundary checks on touched endpoints.')
    }
    if (pr.severity_counts.medium > 0) {
      suggestions.push('Harden error handling and rate limiting to reduce exploit surface.')
    }
    if (pr.severity_counts.low > 0) {
      suggestions.push('Follow up with refactors and docs to prevent drift in future changes.')
    }

    return suggestions.slice(0, 3)
  }

  const StatCard = ({ title, value, description, icon: Icon, accent }) => (
    <Card className="group border-slate-200/80 bg-white/80 shadow-sm shadow-slate-200/60 transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/70">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{title}</p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-white">{loading ? '—' : value}</p>
          {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Overview</p>
          <h2 className="text-3xl font-semibold text-slate-900 dark:text-white">
            Welcome back{user?.github_username ? `, ${user.github_username}` : ''}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Your CodeSentry workspace is tracking pull request risk, severity trends, and AI guidance for every connected repo.
          </p>
        </div>
        <Button asChild size="lg">
          <Link to="/dashboard/analysis">
            Run new analysis
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Repos Connected"
          value={connectedRepoCount}
          description="Active GitHub installations"
          icon={FolderGit2}
          accent="bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-200"
        />
        <StatCard
          title="Analyses (7d)"
          value={analysisSummary.recent_7_days}
          description="Fresh scans this week"
          icon={Activity}
          accent="bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200"
        />
        <StatCard
          title="Total Findings"
          value={severityTotals.total}
          description="Across recent PRs"
          icon={TriangleAlert}
          accent="bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-200"
        />
        <StatCard
          title="Completion Rate"
          value={`${completionRate}%`}
          description={`${analysisSummary.completed} completed · ${analysisSummary.failed} failed`}
          icon={CheckCircle2}
          accent="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800/80 dark:bg-slate-900/70">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <GitPullRequest className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  Pull Request Insights
                </CardTitle>
                <CardDescription>Latest scans with severity context and AI recommendations.</CardDescription>
              </div>
              <Button asChild variant="secondary" className="hidden sm:inline-flex">
                <Link to="/dashboard/reports">
                  View reports
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {insightsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                  ))}
                </div>
              ) : prInsights.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  No recent pull request analyses yet. Connect repositories and run a scan to populate insights.
                </div>
              ) : (
                prInsights.map((pr) => {
                  const suggestions = buildAISuggestions(pr)
                  const hasIssues = pr.total_vulnerabilities > 0
                  return (
                    <div
                      key={`${pr.repository}-${pr.pr_number}`}
                      className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40 transition hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-950/50"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="text-[11px]">
                              {pr.repository}
                            </Badge>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              PR #{pr.pr_number}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                              <Clock className="h-3.5 w-3.5" />
                              {formatRelativeTime(pr.timestamp)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <FileCode className="h-4 w-4" />
                              {pr.files_count} files touched
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <TriangleAlert className="h-4 w-4" />
                              {pr.total_vulnerabilities} findings
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(pr.severity_counts).map(([level, count]) => {
                              if (!count) return null
                              return (
                                <Badge key={level} className={severityMeta[level].className}>
                                  {severityMeta[level].label} · {count}
                                </Badge>
                              )
                            })}
                            {!hasIssues && (
                              <Badge variant="secondary" className="border border-emerald-200/70 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-200">
                                Clean scan
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button asChild variant="outline" size="sm">
                          <Link to="/dashboard/reports">
                            Open report
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                      <div className="mt-4 rounded-xl border border-slate-200/70 bg-slate-50 px-4 py-3 dark:border-slate-800/80 dark:bg-slate-900/60">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                          <Sparkles className="h-4 w-4 text-amber-500" />
                          AI Suggestions
                        </div>
                        <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-200">
                          {suggestions.map((suggestion) => (
                            <li key={suggestion} className="leading-relaxed">
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800/80 dark:bg-slate-900/70">
            <CardHeader>
              <CardTitle className="text-xl">Severity Breakdown</CardTitle>
              <CardDescription>High-risk findings spotted in recent activity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {['critical', 'high', 'medium', 'low'].map((level) => (
                <div key={level} className="flex items-center justify-between rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-sm dark:border-slate-800/60 dark:bg-slate-950/40">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{severityMeta[level].label}</span>
                  <Badge className={severityMeta[level].className}>{severityTotals[level]}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800/80 dark:bg-slate-900/70">
            <CardHeader>
              <CardTitle className="text-xl">AI Focus Areas</CardTitle>
              <CardDescription>Suggested priorities for the next review cycle.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
              <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-4 dark:border-slate-800/70 dark:bg-slate-950/40">
                <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-white">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Reduce critical exposure
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Prioritize auth, secrets, and data access flows in PRs with critical findings. Enforce a merge block until fixes land.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-4 dark:border-slate-800/70 dark:bg-slate-950/40">
                <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-white">
                  <Activity className="h-4 w-4 text-indigo-500" />
                  Keep scans moving
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Triage failed analyses quickly to maintain coverage. Share summaries with reviewers before approvals.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

export default DashboardPage
