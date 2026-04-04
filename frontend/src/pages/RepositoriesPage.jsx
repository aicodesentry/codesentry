import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Compass, GitFork, ShieldAlert, Sparkles } from 'lucide-react'
import { repositoryAPI } from '../services/api'
import { useOnboarding } from '../contexts/OnboardingContext'
import { EmptyPanel, PageHeader, PagePanel, PageStats } from '../components/PageSection'
import { Pagination } from '../components/ui/pagination'

export default function RepositoriesPage() {
  const { error, refresh, repositories, status, syncing } = useOnboarding()
  const [connecting, setConnecting] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const reposPerPage = 8

  const handleConnect = async (repoId, enabled) => {
    setConnecting(repoId)
    setActionError(null)
    try {
      if (enabled) {
        await repositoryAPI.connect(repoId)
      } else {
        await repositoryAPI.disconnect(repoId)
      }
      await refresh()
    } catch (err) {
      setActionError(err.response?.data?.error || err.message)
    } finally {
      setConnecting(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(repositories.length / reposPerPage))
  const paginatedRepos = useMemo(
    () => repositories.slice((currentPage - 1) * reposPerPage, currentPage * reposPerPage),
    [repositories, currentPage]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Repository Access"
        title="Pick one repository and turn on the review loop"
        description="This page should feel like activation, not administration. Choose the first repo that should send pull requests into Mitig8it."
        actions={
          <>
            <button
              onClick={() => refresh({ sync: true })}
              disabled={syncing}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-900 disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync GitHub'}
            </button>
            <Link
              to="/dashboard/onboarding"
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Setup guide
            </Link>
          </>
        }
      />

      <PageStats
        items={[
          {
            label: 'Visible Repos',
            value: status.repositoryCount,
            meta: status.installationCount > 0 ? `${status.installationCount} install${status.installationCount === 1 ? '' : 's'}` : 'no installs',
            icon: <Compass className="h-5 w-5 text-slate-300" />,
            iconWrapClassName: 'bg-slate-800',
          },
          {
            label: 'Connected',
            value: status.activeRepositoryCount,
            meta: status.activeRepositoryCount > 0 ? 'ready for PR reviews' : 'pick your first repo',
            icon: <GitFork className="h-5 w-5 text-slate-300" />,
            iconWrapClassName: 'bg-slate-800',
          },
          {
            label: 'Open Findings',
            value: repositories.reduce((sum, repo) => sum + Number(repo.open_findings_count || 0), 0),
            meta: 'across visible repos',
            icon: <ShieldAlert className="h-5 w-5 text-slate-300" />,
            iconWrapClassName: 'bg-slate-800',
          },
          {
            label: 'Next Move',
            value: status.hasActiveRepo ? 'Open PR' : 'Connect',
            meta: status.hasActiveRepo ? 'push a test change' : 'enable one repository',
            icon: <Sparkles className="h-5 w-5 text-slate-300" />,
            iconWrapClassName: 'bg-slate-800',
          },
        ]}
      />

      {error || actionError ? (
        <PagePanel className="border-rose-500/40 bg-rose-950/30" contentClassName="p-5">
          <p className="text-sm font-medium text-rose-100">{actionError || error}</p>
        </PagePanel>
      ) : null}

      {status.repositoryCount === 0 && status.installationCount > 0 ? (
        <PagePanel className="border-slate-700 bg-slate-950">
          <p className="text-sm font-semibold text-white">The app is installed, but GitHub has not granted repository access yet.</p>
          <p className="mt-1 text-sm text-slate-400">
            Expand repository access in GitHub installation settings, then sync again. Until then the roster will stay empty.
          </p>
          <a
            href="https://github.com/settings/installations"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex rounded-xl bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-950"
          >
            Fix GitHub App Access
          </a>
        </PagePanel>
      ) : null}

      <PagePanel
        title="Repository roster"
        description="Connect exactly what should receive PR reviews. One active repo is enough to complete onboarding."
        action={
          status.hasFirstReview ? (
            <Link
              to="/dashboard/reports"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              View reports
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          ) : null
        }
      >
        <div className="grid gap-4">
          {repositories.length === 0 && status.installationCount === 0 ? (
            <EmptyPanel
              title="No repositories yet"
              description="Install the GitHub App first. Once GitHub grants repo access, this page becomes the source of truth for activation."
              action={
                <Link
                  to="/dashboard/onboarding"
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  Open onboarding
                </Link>
              }
            />
          ) : null}

          {paginatedRepos.map((repo) => (
            <div
              key={repo.id}
              className={`rounded-xl border p-5 transition ${
                repo.is_active
                  ? 'border-emerald-500/30 bg-emerald-950/10 hover:border-emerald-400/40'
                  : 'border-slate-800 bg-slate-900/70 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <Link to={`/dashboard/repositories/${repo.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-white">{repo.full_name}</h2>
                    {repo.is_active ? (
                      <span className="rounded-full border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                        Active
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-slate-400">
                    {repo.language || 'Unknown language'} · {repo.private ? 'Private' : 'Public'} · default: {repo.default_branch}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    Open findings: <span className="font-semibold">{repo.open_findings_count || 0}</span> · PRs seen: <span className="font-semibold">{repo.pull_request_count || 0}</span>
                  </p>
                </Link>
                <div className="flex-shrink-0">
                  {repo.is_active ? (
                    <button
                      onClick={() => handleConnect(repo.id, false)}
                      disabled={connecting === repo.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
                    >
                      {connecting === repo.id ? 'Updating...' : 'Connected'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(repo.id, true)}
                      disabled={connecting === repo.id}
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-200 disabled:opacity-50"
                    >
                      {connecting === repo.id ? 'Connecting...' : 'Connect first repo'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {repositories.length > reposPerPage ? (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              className="pt-2"
            />
          ) : null}
        </div>
      </PagePanel>
    </div>
  )
}
