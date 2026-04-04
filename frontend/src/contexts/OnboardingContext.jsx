import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { installationAPI, repositoryAPI, reportsAPI } from '../services/api'

const OnboardingContext = createContext(null)

const EMPTY_SUMMARY = {
  total_analyses: 0,
  completed: 0,
  failed: 0,
  recent_7_days: 0,
}

function getRepositoryKey(repo) {
  return repo.id || repo.github_id || repo.full_name
}

function mergeRepositoryRecord(current, next) {
  if (!current) return next

  return {
    ...current,
    ...next,
    is_active: Boolean(current.is_active || next.is_active),
    pull_request_count: Math.max(
      Number(current.pull_request_count || 0),
      Number(next.pull_request_count || 0)
    ),
    open_findings_count: Math.max(
      Number(current.open_findings_count || 0),
      Number(next.open_findings_count || 0)
    ),
    accepted_risk_count: Math.max(
      Number(current.accepted_risk_count || 0),
      Number(next.accepted_risk_count || 0)
    ),
    updated_at: next.updated_at || current.updated_at,
  }
}

function normalizeRepositories(items = []) {
  const repositoriesById = new Map()

  items.forEach((repo) => {
    const key = getRepositoryKey(repo)
    if (!key) return
    repositoriesById.set(key, mergeRepositoryRecord(repositoriesById.get(key), repo))
  })

  return Array.from(repositoriesById.values())
}

export function OnboardingProvider({ children }) {
  const [installations, setInstallations] = useState([])
  const [repositories, setRepositories] = useState([])
  const [githubRepoCount, setGithubRepoCount] = useState(0)
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)
  const [lastSyncedAt, setLastSyncedAt] = useState(null)

  const refresh = useCallback(async ({ sync = false } = {}) => {
    setError(null)
    if (sync) {
      setSyncing(true)
    } else {
      setLoading(true)
    }

    let syncError = null
    try {
      if (sync) {
        try {
          await installationAPI.sync()
          setLastSyncedAt(new Date().toISOString())
        } catch (err) {
          syncError = err
        }
      }

      const [installationsData, repositoriesData, summaryData] = await Promise.all([
        installationAPI.list().catch(() => ({ installations: [] })),
        repositoryAPI.list().catch(() => ({ repositories: [] })),
        reportsAPI.getSummary().catch(() => ({ summary: EMPTY_SUMMARY })),
      ])

      setInstallations(installationsData.installations || [])
      const repoData = repositoriesData.repositories || []
      const normalized = normalizeRepositories(repoData)
      setRepositories(normalized)
      setGithubRepoCount(repositoriesData.total_count ?? normalized.length)
      setSummary(summaryData.summary || EMPTY_SUMMARY)

      if (syncError) {
        setError(syncError.response?.data?.error || syncError.message)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }, [])

  useEffect(() => {
    refresh({ sync: true })
  }, [refresh])

  const value = useMemo(() => {
    const installationCount = installations.length
    // Use the server-provided total_count which reflects GitHub's authoritative count,
    // not just the local DB snapshot length.
    const repositoryCount = githubRepoCount || repositories.length
    const activeRepositoryCount = repositories.filter((repo) => repo.is_active).length
    const openPullRequestCount = repositories.reduce(
      (count, repo) => count + Number(repo.pull_request_count || 0),
      0
    )
    const analysisCount = Number(summary?.total_analyses || 0)
    const hasInstall = installationCount > 0
    const hasRepoAccess = repositoryCount > 0
    const hasActiveRepo = activeRepositoryCount > 0
    const hasFirstPullRequest = openPullRequestCount > 0
    const hasFirstReview = analysisCount > 0
    const needsPermissionFix = hasInstall && !hasRepoAccess
    const needsOnboarding = !hasInstall || !hasRepoAccess || !hasActiveRepo || !hasFirstReview
    const nextStep = !hasInstall
      ? 'install'
      : !hasRepoAccess
        ? 'grant-access'
        : !hasActiveRepo
          ? 'connect-repo'
          : !hasFirstPullRequest
            ? 'open-pr'
            : !hasFirstReview
              ? 'wait-review'
              : 'done'

    return {
      installations,
      repositories,
      summary,
      loading,
      syncing,
      error,
      lastSyncedAt,
      refresh,
      status: {
        installationCount,
        repositoryCount,
        activeRepositoryCount,
        openPullRequestCount,
        analysisCount,
        hasInstall,
        hasRepoAccess,
        hasActiveRepo,
        hasFirstPullRequest,
        hasFirstReview,
        needsPermissionFix,
        needsOnboarding,
        nextStep,
      },
    }
  }, [installations, repositories, githubRepoCount, summary, loading, syncing, error, lastSyncedAt, refresh])

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used inside OnboardingProvider')
  }
  return context
}
