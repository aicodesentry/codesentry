import { useMemo } from 'react'
import { Link } from 'react-router'
import { ArrowRight, CheckCircle2, ExternalLink, RefreshCcw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useOnboarding } from '../contexts/OnboardingContext'

const INSTALLATIONS_SETTINGS_URL = 'https://github.com/settings/installations'
const GITHUB_APP_URL = 'https://github.com/apps/mitig8it'

function getChecklist(status) {
  return [
    {
      id: 'install',
      title: 'Install GitHub App',
      detail: status.hasInstall
        ? `${status.installationCount} installation${status.installationCount === 1 ? '' : 's'} connected`
        : 'Install Mitig8it on one repository or organization.',
      done: status.hasInstall,
      current: status.nextStep === 'install',
    },
    {
      id: 'access',
      title: 'Grant repository access',
      detail: status.hasRepoAccess
        ? `${status.repositoryCount} repos visible to Mitig8it`
        : 'Grant repository access in GitHub, then sync here once.',
      done: status.hasRepoAccess,
      current: status.nextStep === 'grant-access',
    },
    {
      id: 'activate',
      title: 'Activate one repository',
      detail: status.hasActiveRepo
        ? `${status.activeRepositoryCount} repo${status.activeRepositoryCount === 1 ? '' : 's'} ready for review`
        : 'Choose the first repository that should receive reviews.',
      done: status.hasActiveRepo,
      current: status.nextStep === 'connect-repo',
    },
    {
      id: 'review',
      title: 'Open a pull request',
      detail: status.hasFirstReview
        ? `${status.analysisCount} review${status.analysisCount === 1 ? '' : 's'} completed`
        : status.hasFirstPullRequest
          ? 'Pull request detected. Waiting for the first review.'
          : 'Open or update a PR to trigger the first review.',
      done: status.hasFirstReview,
      current: status.nextStep === 'open-pr' || status.nextStep === 'wait-review',
    },
  ]
}

function getCurrentStep(status, githubAppInstallUrl) {
  if (!status.hasInstall) {
    return {
      eyebrow: 'Step 1',
      title: 'Install the GitHub App',
      description: 'Start by connecting Mitig8it to GitHub. Install it on one repository now and broaden access later if needed.',
      primaryLabel: 'Install GitHub App',
      primaryHref: githubAppInstallUrl || GITHUB_APP_URL,
      primaryExternal: true,
      secondaryLabel: null,
      secondaryHref: null,
      secondaryExternal: false,
    }
  }

  if (!status.hasRepoAccess) {
    return {
      eyebrow: 'Step 2',
      title: 'Grant repository access',
      description: 'The app is installed, but Mitig8it still cannot see a repository to review. Expand access in GitHub, then sync here.',
      primaryLabel: 'Manage GitHub access',
      primaryHref: INSTALLATIONS_SETTINGS_URL,
      primaryExternal: true,
      secondaryLabel: 'Sync GitHub',
      secondaryHref: null,
      secondaryExternal: false,
    }
  }

  if (!status.hasActiveRepo) {
    return {
      eyebrow: 'Step 3',
      title: 'Activate your first repository',
      description: 'Pick one repository to turn on reviews. Keep the first pass small, then expand after the workflow is proven.',
      primaryLabel: 'Choose repository',
      primaryHref: '/dashboard/repositories',
      primaryExternal: false,
      secondaryLabel: 'Sync GitHub',
      secondaryHref: null,
      secondaryExternal: false,
    }
  }

  if (!status.hasFirstReview) {
    return {
      eyebrow: 'Step 4',
      title: status.hasFirstPullRequest ? 'Waiting for the first review' : 'Open a pull request',
      description: status.hasFirstPullRequest
        ? 'Mitig8it has enough access. The first report will appear here as soon as the pull request review completes.'
        : 'Open or update a pull request in the active repository to trigger the first review.',
      primaryLabel: 'Go to reports',
      primaryHref: '/dashboard/reports',
      primaryExternal: false,
      secondaryLabel: status.hasFirstPullRequest ? 'Sync GitHub' : 'View repositories',
      secondaryHref: status.hasFirstPullRequest ? null : '/dashboard/repositories',
      secondaryExternal: false,
    }
  }

  return {
    eyebrow: 'Ready',
    title: 'Your setup is complete',
    description: 'Mitig8it is connected and the first review has landed. Continue in the dashboard.',
    primaryLabel: 'Open dashboard',
    primaryHref: '/dashboard/home',
    primaryExternal: false,
    secondaryLabel: 'View reports',
    secondaryHref: '/dashboard/reports',
    secondaryExternal: false,
  }
}

function ActionButton({ action, children }) {
  if (action.primaryExternal) {
    return (
      <a
        href={action.primaryHref}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
      >
        {children}
        <ExternalLink className="h-4 w-4" />
      </a>
    )
  }

  return (
    <Link
      to={action.primaryHref}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  )
}

function SecondaryAction({ action, onSync, syncing }) {
  if (!action.secondaryLabel) return null

  if (action.secondaryHref) {
    return (
      <Link
        to={action.secondaryHref}
        className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
      >
        {action.secondaryLabel}
      </Link>
    )
  }

  return (
    <button
      onClick={() => onSync({ sync: true })}
      className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
    >
      <RefreshCcw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
      {syncing ? 'Syncing...' : action.secondaryLabel}
    </button>
  )
}

export default function OnboardingPage() {
  const { githubAppInstallUrl } = useAuth()
  const { error, refresh, status, syncing } = useOnboarding()

  const checklist = useMemo(() => getChecklist(status), [status])
  const currentStep = useMemo(
    () => getCurrentStep(status, githubAppInstallUrl),
    [githubAppInstallUrl, status]
  )

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="max-w-2xl space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">
          Setup
        </p>
        <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white">
          Set up Mitig8it
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Connect GitHub, activate one repository, and get the first pull request review without a cluttered setup page.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4">
          <p className="text-sm font-medium text-rose-100">{error}</p>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">
                {currentStep.eyebrow}
              </p>
              <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">
                {currentStep.title}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                {currentStep.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <ActionButton action={currentStep}>{currentStep.primaryLabel}</ActionButton>
              <SecondaryAction action={currentStep} onSync={refresh} syncing={syncing} />
            </div>

            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                What you get once setup is complete
              </h3>
              <div className="mt-3 space-y-3">
                {[
                  'Inline pull request comments that point to risky code and explain the fix.',
                  'GitHub review summaries with severity and remediation context.',
                  'Reports that become the operating view once the first review finishes.',
                ].map((line) => (
                  <div key={line} className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-neutral-900 dark:bg-white" />
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">{line}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Setup checklist
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Follow the current step and ignore the rest for now.
              </p>
            </div>
            <button
              onClick={() => refresh({ sync: true })}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-100 dark:hover:border-neutral-500 dark:hover:bg-neutral-950"
            >
              <RefreshCcw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync'}
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {checklist.map((item, index) => (
              <div
                key={item.id}
                className={`rounded-xl border px-4 py-4 ${
                  item.done
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20'
                    : item.current
                      ? 'border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-950'
                      : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                      item.done
                        ? 'bg-emerald-600 text-white'
                        : item.current
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                          : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                    }`}
                  >
                    {item.done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {item.title}
                      </p>
                      {item.current ? (
                        <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white dark:bg-white dark:text-neutral-900">
                          Current
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                      {item.detail}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {status.needsPermissionFix ? (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                GitHub is connected, but repository access is still too narrow.
              </p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                Expand repository permissions in GitHub installation settings, then sync once here.
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
