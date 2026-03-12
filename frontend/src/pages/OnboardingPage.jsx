import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { installationAPI, repositoryAPI } from '../services/api'

const INSTALLATIONS_SETTINGS_URL = 'https://github.com/settings/installations'
const GITHUB_APP_URL = 'https://github.com/apps/aicodesentry'

export default function OnboardingPage() {
  const { githubAppInstallUrl } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [installations, setInstallations] = useState([])
  const [repositories, setRepositories] = useState([])
  const [syncSummary, setSyncSummary] = useState({ synced_installations: 0, synced_repositories: 0 })

  const loadStatus = async () => {
    setLoading(true)
    setError(null)

    let syncData = { synced_installations: 0, synced_repositories: 0 }
    try {
      syncData = await installationAPI.sync()
    } catch (syncError) {
      setError(syncError.response?.data?.error || syncError.message)
    }

    try {
      const [installationsData, repositoriesData] = await Promise.all([
        installationAPI.list().catch(() => ({ installations: [] })),
        repositoryAPI.list().catch(() => ({ repositories: [] }))
      ])
      setInstallations(installationsData.installations || [])
      setRepositories(repositoriesData.repositories || [])
      setSyncSummary({
        synced_installations: Number(syncData?.synced_installations || 0),
        synced_repositories: Number(syncData?.synced_repositories || 0)
      })
      setLastSyncedAt(new Date().toISOString())
    } catch (listError) {
      setError(listError.response?.data?.error || listError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const status = useMemo(() => {
    const installationCount = installations.length
    const repositoryCount = repositories.length
    const hasInstall = installationCount > 0
    const hasRepoAccess = repositoryCount > 0
    const needsPermissionFix = hasInstall && !hasRepoAccess

    return { installationCount, repositoryCount, hasInstall, hasRepoAccess, needsPermissionFix }
  }, [installations, repositories])

  const formatSyncTime = () => {
    if (!lastSyncedAt) return 'Not synced yet'
    return new Date(lastSyncedAt).toLocaleString()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Onboarding</h1>

      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Connection Status</h2>
          <button
            onClick={loadStatus}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Re-sync
          </button>
        </div>

        {loading && <p className="text-sm text-slate-500">Syncing GitHub installation data...</p>}
        {error && <p className="text-sm text-rose-700">{error}</p>}

        {!loading && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">App Installed</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{status.hasInstall ? 'Yes' : 'No'}</p>
              <p className="text-xs text-slate-500">{status.installationCount} installation(s)</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Repo Access</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{status.hasRepoAccess ? 'Granted' : 'Not granted'}</p>
              <p className="text-xs text-slate-500">{status.repositoryCount} repos available</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4 sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Last Sync</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatSyncTime()}</p>
              <p className="text-xs text-slate-500">
                Synced installations: {syncSummary.synced_installations} • Synced repositories: {syncSummary.synced_repositories}
              </p>
            </div>
          </div>
        )}

        {status.needsPermissionFix && !loading && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">
              CodeSentry is installed, but no repositories are accessible yet.
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Open GitHub installation settings and grant repository access, then return and click Re-sync.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={INSTALLATIONS_SETTINGS_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-amber-900 px-3 py-2 text-xs font-semibold text-white"
              >
                Fix GitHub App Access
              </a>
              <a
                href={GITHUB_APP_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-900"
              >
                Open App Page
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-700">
          Install the CodeSentry GitHub App on your repositories or organization to enable webhook-driven PR analysis.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {githubAppInstallUrl ? (
            <a
              href={githubAppInstallUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Install CodeSentry GitHub App
            </a>
          ) : (
            <a
              href={GITHUB_APP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Open GitHub App
            </a>
          )}
          <a
            href={INSTALLATIONS_SETTINGS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Manage Installation
          </a>
        </div>
      </div>
    </div>
  )
}
