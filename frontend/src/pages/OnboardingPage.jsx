import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Compass, GitFork, KeyRound, RefreshCcw, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useOnboarding } from '../contexts/OnboardingContext'
import { EmptyPanel } from '../components/PageSection'

const INSTALLATIONS_SETTINGS_URL = 'https://github.com/settings/installations'
const GITHUB_APP_URL = 'https://github.com/apps/mitig8it'

const samplePullRequest = {
  repo: 'codesentry/demo-storefront',
  number: 14,
  title: 'Tighten checkout redirect handling',
  summary: 'See how Mitig8it turns one PR into inline findings, a summary review, and taxonomy-backed remediation.',
  findings: [
    { label: 'Critical', count: 2, tint: 'bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-neutral-900 dark:text-neutral-200 dark:border-neutral-700' },
    { label: 'High', count: 1, tint: 'bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-neutral-900 dark:text-neutral-200 dark:border-neutral-700' },
    { label: 'Medium', count: 1, tint: 'bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-neutral-900 dark:text-neutral-200 dark:border-neutral-700' },
  ],
}

export default function OnboardingPage() {
  const { githubAppInstallUrl } = useAuth()
  const { error, lastSyncedAt, refresh, status, syncing } = useOnboarding()

  const checklist = useMemo(
    () => [
      {
        id: 'install',
        title: 'Install the GitHub App',
        detail: status.hasInstall
          ? `${status.installationCount} installation${status.installationCount === 1 ? '' : 's'} detected`
          : 'Connect Mitig8it to one repository or one organization first',
        done: status.hasInstall,
      },
      {
        id: 'access',
        title: 'Grant repository access',
        detail: status.hasRepoAccess
          ? `${status.repositoryCount} repos visible to Mitig8it`
          : 'Grant repo permissions in GitHub installation settings and sync again',
        done: status.hasRepoAccess,
      },
      {
        id: 'connect',
        title: 'Activate one repository',
        detail: status.hasActiveRepo
          ? `${status.activeRepositoryCount} repo${status.activeRepositoryCount === 1 ? '' : 's'} connected to the review pipeline`
          : 'Choose the first repo that should receive PR reviews',
        done: status.hasActiveRepo,
      },
      {
        id: 'review',
        title: 'Open a test pull request',
        detail: status.hasFirstReview
          ? `${status.analysisCount} analysis run${status.analysisCount === 1 ? '' : 's'} recorded`
          : status.hasFirstPullRequest
            ? 'PR detected. Waiting for the first review to land.'
            : 'Open or update a PR in the connected repo to trigger the first review',
        done: status.hasFirstReview,
      },
      {
        id: 'byok',
        title: 'Optional: bring your own model key',
        detail: 'Treat AI explanations as an upgrade after the core GitHub review loop is working.',
        done: false,
        optional: true,
      },
    ],
    [status]
  )

  const nextAction = !status.hasInstall
    ? {
        label: 'Install GitHub App',
        href: githubAppInstallUrl || GITHUB_APP_URL,
        external: true,
      }
    : !status.hasRepoAccess
      ? {
          label: 'Fix GitHub access',
          href: INSTALLATIONS_SETTINGS_URL,
          external: true,
        }
      : !status.hasActiveRepo
        ? {
            label: 'Choose first repository',
            href: '/dashboard/repositories',
          }
        : !status.hasFirstReview
          ? {
              label: 'Watch reports',
              href: '/dashboard/reports',
            }
          : {
              label: 'Open dashboard',
              href: '/dashboard/home',
            }

  const formatSyncTime = () => {
    if (!lastSyncedAt) return 'Not synced yet'
    return new Date(lastSyncedAt).toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
            Get from install to first security review
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Connect GitHub, activate one repository, and confirm that one pull request receives a review.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refresh({ sync: true })}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-100 dark:hover:border-neutral-500 dark:hover:bg-neutral-900"
          >
            <RefreshCcw className="h-4 w-4" />
            {syncing ? 'Syncing...' : 'Sync GitHub'}
          </button>
          {nextAction.external ? (
            <a
              href={nextAction.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
            >
              <GitFork className="h-4 w-4" />
              {nextAction.label}
            </a>
          ) : (
            <Link
              to={nextAction.href}
              className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
            >
              <ArrowRight className="h-4 w-4" />
              {nextAction.label}
            </Link>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
              <ShieldCheck className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-neutral-900 dark:text-white">{status.installationCount}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Installations</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
              <Compass className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-neutral-900 dark:text-white">{status.repositoryCount}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Repos Visible</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
              <Sparkles className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-neutral-900 dark:text-white">{status.analysisCount}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">PR Reviews</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
              <KeyRound className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-neutral-900 dark:text-white">{lastSyncedAt ? 'Live' : 'Pending'}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Last Sync</p>
            </div>
          </div>
        </div>
      </div>

      {!status.hasInstall ? (
        <div className="rounded-xl border border-yellow-300 bg-yellow-50/60 p-5 text-sm text-neutral-900 dark:border-yellow-500 dark:bg-yellow-950/50" role="region" aria-live="polite">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Install Mitig8it to start seeing reviews</p>
              <p className="text-xs text-neutral-600 dark:text-neutral-300">Connect your GitHub app so we can read PR data and backfill your first insights.</p>
            </div>
            <a
              href={githubAppInstallUrl || GITHUB_APP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-yellow-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yellow-500"
            >
              <GitFork className="mr-2 h-4 w-4" />
              Connect GitHub App
            </a>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-5">
          <p className="text-sm font-medium text-rose-100">{error}</p>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        {/* Launch checklist */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Launch checklist</h2>
            <a
              href={INSTALLATIONS_SETTINGS_URL}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              Manage installation
            </a>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="space-y-3">
              {checklist.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-4 rounded-xl border px-4 py-4 ${
                    item.done
                      ? 'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50'
                      : item.optional
                        ? 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/30'
                        : 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/40'
                  }`}
                >
                  <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full ${item.done ? 'bg-neutral-200 dark:bg-neutral-700' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
                    {item.done ? (
                      <CheckCircle2 className="h-5 w-5 text-neutral-900 dark:text-white" />
                    ) : (
                      <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">{item.title}</p>
                      {item.optional ? (
                        <span className="rounded-full border border-neutral-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                          Optional
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {status.needsPermissionFix ? (
              <div className="mt-3 rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-4 dark:border-neutral-700 dark:bg-neutral-800/50">
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">The app is installed, but GitHub access is still too narrow.</p>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  Expand repository access in GitHub installation settings, then sync again. Until then the rest of the product will look empty.
                </p>
              </div>
            ) : null}

            {status.hasFirstReview ? (
              <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-50 px-4 py-4 dark:bg-emerald-950/20">
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-100">The first review has landed.</p>
                <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-200/80">
                  The activation loop is complete. You can move into the live dashboard and reports now.
                </p>
                <Link
                  to="/dashboard/home"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                >
                  Open workspace
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        {/* What users should expect */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">What users should expect</h2>
            <Link
              to="/examples"
              className="text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              See examples
            </Link>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Sample PR</p>
                <h3 className="mt-2 text-lg font-semibold text-neutral-900 dark:text-white">
                  #{samplePullRequest.number} {samplePullRequest.title}
                </h3>
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{samplePullRequest.repo}</p>
              </div>
              <div className="rounded-full border border-neutral-300 bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                Review ready
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-neutral-700 dark:text-neutral-300">{samplePullRequest.summary}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {samplePullRequest.findings.map((item) => (
                <span
                  key={item.label}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${item.tint}`}
                >
                  {item.count} {item.label}
                </span>
              ))}
            </div>
            <div className="mt-5 space-y-3">
              {[
                'Inline comments point to the risky line and the recommended fix.',
                'A GitHub check summary rolls up severity and taxonomy context.',
                'Reports becomes the operating log once the first scan lands.',
              ].map((line) => (
                <div key={line} className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-800/40">
                  <Sparkles className="mt-0.5 h-4 w-4 text-neutral-500 dark:text-neutral-300" />
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">{line}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!status.hasInstall ? (
        <EmptyPanel
          title="Mitig8it starts after the GitHub App is installed"
          description="Install the app on one repo, then sync here. Everything else stays hidden until the first review loop is working."
          action={
            <a
              href={githubAppInstallUrl || GITHUB_APP_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
            >
              Install Mitig8it
            </a>
          }
        />
      ) : null}
    </div>
  )
}
