import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { installationAPI, repositoryAPI, reportsAPI } from '../services/api'

const OnboardingContext = createContext(null)

const EMPTY_SUMMARY = {
  total_analyses: 0,
  completed: 0,
  failed: 0,
  recent_7_days: 0,
}

export function OnboardingProvider({ children }) {
  const [installations, setInstallations] = useState([])
  const [repositories, setRepositories] = useState([])
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
      setRepositories(repositoriesData.repositories || [])
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
    const repositoryCount = repositories.length
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
  }, [installations, repositories, summary, loading, syncing, error, lastSyncedAt, refresh])

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used inside OnboardingProvider')
  }
  return context
}
