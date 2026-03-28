import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Compass, GitFork, KeyRound, RefreshCcw, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { installationAPI, repositoryAPI } from '../services/api'
import { EmptyPanel, PageHeader, PagePanel, PageStats } from '../components/PageSection'

const INSTALLATIONS_SETTINGS_URL = 'https://github.com/settings/installations'
const GITHUB_APP_URL = 'https://github.com/apps/aicodesentry'

const samplePullRequest = {
  repo: 'codesentry/demo-storefront',
  number: 14,
  title: 'Tighten checkout redirect handling',
  summary: 'See how CodeSentry turns one PR into inline findings, a summary review, and taxonomy-backed remediation.',
  findings: [
    { label: 'Critical', count: 2, tint: 'bg-rose-500/15 text-rose-200 border-rose-500/30' },
    { label: 'High', count: 1, tint: 'bg-orange-500/15 text-orange-200 border-orange-500/30' },
    { label: 'Medium', count: 1, tint: 'bg-amber-500/15 text-amber-200 border-amber-500/30' },
  ],
}

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
    const checklist = [
      {
        id: 'install',
        title: 'Install the GitHub App',
        detail: hasInstall
          ? `${installationCount} installation${installationCount === 1 ? '' : 's'} detected`
          : 'Connect CodeSentry to an org or repository first',
        done: hasInstall,
      },
      {
        id: 'access',
        title: 'Grant repository access',
        detail: hasRepoAccess
          ? `${repositoryCount} repos available for scanning`
          : 'Grant repo permissions in GitHub installation settings',
        done: hasRepoAccess,
      },
      {
        id: 'review',
        title: 'Open or sync a PR',
        detail: hasRepoAccess
          ? 'Push a test PR and CodeSentry will review it automatically'
          : 'Repo access unlocks automatic PR analysis',
        done: false,
      },
      {
        id: 'byok',
        title: 'Optional: connect your LLM key',
        detail: 'Bring your own model key later for richer explanations and remediation',
        done: false,
      },
    ]

    return { installationCount, repositoryCount, hasInstall, hasRepoAccess, needsPermissionFix, checklist }
  }, [installations, repositories])

  const formatSyncTime = () => {
    if (!lastSyncedAt) return 'Not synced yet'
    return new Date(lastSyncedAt).toLocaleString()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="First Value"
        title="Get from install to first security review in one pass"
        description="Connect GitHub, sync repository access, open a test PR, and then decide whether you want AI-assisted remediation with your own model key."
        actions={
          <>
            <button
              onClick={loadStatus}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-sky-400/50 hover:bg-slate-900"
            >
              <RefreshCcw className="h-4 w-4" />
              {loading ? 'Syncing...' : 'Re-sync'}
            </button>
            <a
              href={githubAppInstallUrl || GITHUB_APP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              <GitFork className="h-4 w-4" />
              Install GitHub App
            </a>
          </>
        }
      />

      <PageStats
        items={[
          {
            label: 'Installations',
            value: loading ? '...' : status.installationCount,
            meta: status.hasInstall ? 'connected' : 'not yet',
            icon: <ShieldCheck className="h-5 w-5 text-sky-300" />,
            iconWrapClassName: 'bg-sky-500/10',
          },
          {
            label: 'Repos Ready',
            value: loading ? '...' : status.repositoryCount,
            meta: status.hasRepoAccess ? 'analysis ready' : 'needs access',
            icon: <Compass className="h-5 w-5 text-emerald-300" />,
            iconWrapClassName: 'bg-emerald-500/10',
          },
          {
            label: 'Last Sync',
            value: loading ? '...' : (lastSyncedAt ? 'Live' : 'Pending'),
            meta: formatSyncTime(),
            icon: <RefreshCcw className="h-5 w-5 text-violet-300" />,
            iconWrapClassName: 'bg-violet-500/10',
          },
          {
            label: 'AI Add-on',
            value: 'BYOK',
            meta: 'optional next step',
            icon: <KeyRound className="h-5 w-5 text-amber-300" />,
            iconWrapClassName: 'bg-amber-500/10',
          },
        ]}
      />

      {error ? (
        <PagePanel className="border-rose-500/40 bg-rose-950/30" contentClassName="p-5">
          <p className="text-sm font-medium text-rose-100">{error}</p>
        </PagePanel>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <PagePanel
          title="Launch checklist"
          description="The product should explain what happens next, not leave the user staring at a dashboard."
          action={
            <a
              href={INSTALLATIONS_SETTINGS_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Manage installation
            </a>
          }
        >
          <div className="space-y-3">
            {status.checklist.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-start gap-4 rounded-2xl border px-4 py-4 ${
                  item.done
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-900/60'
                }`}
              >
                <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full ${item.done ? 'bg-emerald-400/20' : 'bg-slate-800'}`}>
                  {item.done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                  ) : (
                    <span className="text-sm font-semibold text-slate-300">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {status.needsPermissionFix ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-4">
              <p className="text-sm font-semibold text-amber-100">Installation found, but GitHub access is too narrow.</p>
              <p className="mt-1 text-sm text-amber-200/80">
                Grant repository access in GitHub settings, then re-sync. Until then, the dashboard will stay empty even though the app is installed.
              </p>
            </div>
          ) : null}
        </PagePanel>

        <PagePanel
          title="See the finished experience"
          description="A sample PR preview so users immediately understand what CodeSentry produces."
          action={
            <a
              href="/dashboard/reports"
              className="rounded-xl bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 transition hover:bg-slate-200"
            >
              View live reports
            </a>
          }
        >
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Sample PR</p>
                <h3 className="mt-2 text-lg font-semibold text-white">
                  #{samplePullRequest.number} {samplePullRequest.title}
                </h3>
                <p className="mt-2 text-sm text-slate-400">{samplePullRequest.repo}</p>
              </div>
              <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                Review ready
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">{samplePullRequest.summary}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {samplePullRequest.findings.map((item) => (
                <span
                  key={item.label}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${item.tint}`}
                >
                  {item.count} {item.label}
                </span>
              ))}
            </div>
            <div className="mt-5 space-y-3">
              {[
                'Inline comment with exact vulnerable line and remediation.',
                'Check run summary with critical/high counts and taxonomy metadata.',
                'Optional AI explanation layer once BYOK is enabled.',
              ].map((line) => (
                <div key={line} className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                  <Sparkles className="mt-0.5 h-4 w-4 text-sky-300" />
                  <p className="text-sm text-slate-300">{line}</p>
                </div>
              ))}
            </div>
          </div>
        </PagePanel>
      </div>

      {!status.hasInstall && !loading ? (
        <EmptyPanel
          title="CodeSentry starts after the GitHub App is installed"
          description="Install the app on one repo, open a test PR, and the rest of the product becomes obvious. Until then, every other page is guesswork."
          action={
            <a
              href={githubAppInstallUrl || GITHUB_APP_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              Install CodeSentry
            </a>
          }
        />
      ) : null}
    </div>
  )
}
