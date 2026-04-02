import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Compass, GitFork, KeyRound, RefreshCcw, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useOnboarding } from '../contexts/OnboardingContext'
import { EmptyPanel, PageHeader, PagePanel, PageStats } from '../components/PageSection'

const INSTALLATIONS_SETTINGS_URL = 'https://github.com/settings/installations'
const GITHUB_APP_URL = 'https://github.com/apps/aicodesentry'

const samplePullRequest = {
  repo: 'codesentry/demo-storefront',
  number: 14,
  title: 'Tighten checkout redirect handling',
  summary: 'See how CodeSentry turns one PR into inline findings, a summary review, and taxonomy-backed remediation.',
  findings: [
    { label: 'Critical', count: 2, tint: 'bg-slate-900 text-slate-200 border-slate-700' },
    { label: 'High', count: 1, tint: 'bg-slate-900 text-slate-200 border-slate-700' },
    { label: 'Medium', count: 1, tint: 'bg-slate-900 text-slate-200 border-slate-700' },
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
          : 'Connect CodeSentry to one repository or one organization first',
        done: status.hasInstall,
      },
      {
        id: 'access',
        title: 'Grant repository access',
        detail: status.hasRepoAccess
          ? `${status.repositoryCount} repos visible to CodeSentry`
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
      <PageHeader
        eyebrow="First Value"
        title="Get from install to first security review in one pass"
        description="The only job here is to connect GitHub, activate one repository, and confirm that one pull request receives a review."
        actions={
          <>
            <button
              onClick={() => refresh({ sync: true })}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-900"
            >
              <RefreshCcw className="h-4 w-4" />
              {syncing ? 'Syncing...' : 'Sync GitHub'}
            </button>
            {nextAction.external ? (
              <a
                href={nextAction.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                <GitFork className="h-4 w-4" />
                {nextAction.label}
              </a>
            ) : (
              <Link
                to={nextAction.href}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                <ArrowRight className="h-4 w-4" />
                {nextAction.label}
              </Link>
            )}
          </>
        }
      />

      <PageStats
        items={[
          {
            label: 'Installations',
            value: status.installationCount,
            meta: status.hasInstall ? 'connected' : 'not yet',
            icon: <ShieldCheck className="h-5 w-5 text-slate-300" />,
            iconWrapClassName: 'bg-slate-800',
          },
          {
            label: 'Repos Visible',
            value: status.repositoryCount,
            meta: status.hasRepoAccess ? `${status.activeRepositoryCount} active` : 'needs access',
            icon: <Compass className="h-5 w-5 text-slate-300" />,
            iconWrapClassName: 'bg-slate-800',
          },
          {
            label: 'PR Reviews',
            value: status.analysisCount,
            meta: status.hasFirstReview ? 'first value reached' : 'waiting for first run',
            icon: <Sparkles className="h-5 w-5 text-slate-300" />,
            iconWrapClassName: 'bg-slate-800',
          },
          {
            label: 'Last Sync',
            value: lastSyncedAt ? 'Live' : 'Pending',
            meta: formatSyncTime(),
            icon: <KeyRound className="h-5 w-5 text-slate-300" />,
            iconWrapClassName: 'bg-slate-800',
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
          description="Each step should move the user toward a visible GitHub review, not toward another settings page."
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
            {checklist.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-start gap-4 rounded-2xl border px-4 py-4 ${
                  item.done
                    ? 'border-slate-700 bg-slate-900/90'
                    : item.optional
                      ? 'border-slate-800 bg-slate-950/70'
                      : 'border-slate-800 bg-slate-900/60'
                }`}
              >
                <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full ${item.done ? 'bg-slate-700' : 'bg-slate-800'}`}>
                  {item.done ? (
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  ) : (
                    <span className="text-sm font-semibold text-slate-300">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    {item.optional ? (
                      <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Optional
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {status.needsPermissionFix ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-4">
              <p className="text-sm font-semibold text-white">The app is installed, but GitHub access is still too narrow.</p>
              <p className="mt-1 text-sm text-slate-400">
                Expand repository access in GitHub installation settings, then sync again. Until then the rest of the product will look empty.
              </p>
            </div>
          ) : null}

          {status.hasFirstReview ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-4">
              <p className="text-sm font-semibold text-emerald-100">The first review has landed.</p>
              <p className="mt-1 text-sm text-emerald-200/80">
                The activation loop is complete. You can move into the live dashboard and reports now.
              </p>
              <Link
                to="/dashboard/home"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-950"
              >
                Open workspace
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : null}
        </PagePanel>

        <PagePanel
          title="What users should expect"
          description="A sample PR preview so the value is obvious before the first real review shows up."
          action={
            <Link
              to="/examples"
              className="rounded-xl bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 transition hover:bg-slate-200"
            >
              See examples
            </Link>
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
              <div className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
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
                'Inline comments point to the risky line and the recommended fix.',
                'A GitHub check summary rolls up severity and taxonomy context.',
                'Reports becomes the operating log once the first scan lands.',
              ].map((line) => (
                <div key={line} className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                  <Sparkles className="mt-0.5 h-4 w-4 text-slate-300" />
                  <p className="text-sm text-slate-300">{line}</p>
                </div>
              ))}
            </div>
          </div>
        </PagePanel>
      </div>

      {!status.hasInstall ? (
        <EmptyPanel
          title="CodeSentry starts after the GitHub App is installed"
          description="Install the app on one repo, then sync here. Everything else stays hidden until the first review loop is working."
          action={
            <a
              href={githubAppInstallUrl || GITHUB_APP_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Install CodeSentry
            </a>
          }
        />
      ) : null}
    </div>
  )
}
