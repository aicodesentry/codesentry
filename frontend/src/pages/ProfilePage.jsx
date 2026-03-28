import { useMemo, useState } from 'react'
import { Bell, Bot, Github, ShieldAlert, UserRound } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { PageHeader, PagePanel, PageStats } from '../components/PageSection'

const toggleClassName = (enabled) =>
  `relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
    enabled ? 'bg-sky-500' : 'bg-slate-700'
  }`

const ProfilePage = () => {
  const { user } = useAuth()
  const [settings, setSettings] = useState({
    emailNotifications: true,
    prComments: true,
    weeklyReport: false,
    autoAnalysis: true,
  })

  const handleSettingChange = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const activeSettings = useMemo(
    () => Object.values(settings).filter(Boolean).length,
    [settings]
  )

  const rows = [
    {
      key: 'emailNotifications',
      label: 'Email notifications',
      description: 'Receive updates about repo activity, failed scans, and pipeline regressions.',
    },
    {
      key: 'prComments',
      label: 'PR comments',
      description: 'Post CodeSentry findings back into pull requests.',
    },
    {
      key: 'weeklyReport',
      label: 'Weekly digest',
      description: 'Get a weekly summary of findings and newly active repositories.',
    },
    {
      key: 'autoAnalysis',
      label: 'Automatic PR analysis',
      description: 'Run analysis every time a PR opens, syncs, or reopens.',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title={user?.github_username ? `${user.github_username}'s workspace profile` : 'Workspace profile'}
        description="This page should explain who owns the workspace, how notifications behave, and what the next security workflow upgrade is."
      />

      <PageStats
        items={[
          {
            label: 'GitHub Login',
            value: user?.github_username || 'unknown',
            meta: 'primary identity',
            icon: <Github className="h-5 w-5 text-slate-200" />,
            iconWrapClassName: 'bg-slate-700/70',
          },
          {
            label: 'Active Toggles',
            value: activeSettings,
            meta: `${rows.length} available`,
            icon: <Bell className="h-5 w-5 text-sky-300" />,
            iconWrapClassName: 'bg-sky-500/10',
          },
          {
            label: 'Plan Mode',
            value: 'Beta',
            meta: 'pricing hidden for now',
            icon: <ShieldAlert className="h-5 w-5 text-amber-300" />,
            iconWrapClassName: 'bg-amber-500/10',
          },
          {
            label: 'AI Setup',
            value: 'BYOK',
            meta: 'next P2 slice',
            icon: <Bot className="h-5 w-5 text-violet-300" />,
            iconWrapClassName: 'bg-violet-500/10',
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <PagePanel
          title="Identity and access"
          description="Ground the user in which GitHub account is actually connected."
        >
          <div className="flex flex-col gap-5 rounded-xl border border-slate-800 bg-slate-900/70 p-5 sm:flex-row sm:items-center">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.github_username}
                className="h-24 w-24 rounded-full object-cover ring-1 ring-white/10"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-800">
                <UserRound className="h-10 w-10 text-slate-400" />
              </div>
            )}
            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Username</p>
                <p className="mt-1 text-lg font-semibold text-white">{user?.github_username || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Email</p>
                <p className="mt-1 text-lg font-semibold text-white">{user?.github_email || user?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">GitHub ID</p>
                <p className="mt-1 text-sm font-medium text-slate-300">{user?.github_id || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Member since</p>
                <p className="mt-1 text-sm font-medium text-slate-300">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'}
                </p>
              </div>
            </div>
          </div>
        </PagePanel>

        <PagePanel
          title="Notification behavior"
          description="Keep the toggles, but make the page explain what each one changes in the product."
        >
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-4"
              >
                <div className="pr-4">
                  <p className="text-sm font-semibold text-white">{row.label}</p>
                  <p className="mt-1 text-sm text-slate-400">{row.description}</p>
                </div>
                <button onClick={() => handleSettingChange(row.key)} className={toggleClassName(settings[row.key])}>
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings[row.key] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </PagePanel>
      </div>

      <PagePanel
        title="Danger zone"
        description="This stays visible, but it should feel deliberate instead of looking like a default alert box."
        className="border-rose-500/35 bg-rose-950/20"
      >
        <div className="flex flex-col gap-4 rounded-xl border border-rose-500/20 bg-rose-950/30 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-rose-100">Delete account</p>
            <p className="mt-1 text-sm text-rose-100/75">
              Permanently delete your account and all connected workspace data.
            </p>
          </div>
          <button className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500">
            Delete Account
          </button>
        </div>
      </PagePanel>
    </div>
  )
}

export default ProfilePage
