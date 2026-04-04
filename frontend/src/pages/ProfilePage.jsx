import { useMemo, useState } from 'react'
import { Bell, Bot, Github, ShieldAlert, UserRound } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { PageHeader, PageStats } from '../components/PageSection'

const toggleClassName = (enabled) =>
  `relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
    enabled ? 'bg-slate-900 dark:bg-white' : 'bg-slate-200 dark:bg-slate-700'
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
      description: 'Post Mitig8it findings back into pull requests.',
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
        title={user?.github_username ? `${user.github_username}'s profile` : 'Profile'}
        description="Account identity and notification preferences"
      />

      <PageStats
        items={[
          {
            label: 'GitHub login',
            value: user?.github_username || 'unknown',
            icon: <Github className="h-4 w-4 text-slate-600 dark:text-slate-300" />,
          },
          {
            label: 'Active toggles',
            value: activeSettings,
            icon: <Bell className="h-4 w-4 text-slate-600 dark:text-slate-300" />,
          },
          {
            label: 'Plan',
            value: 'Beta',
            icon: <ShieldAlert className="h-4 w-4 text-slate-600 dark:text-slate-300" />,
          },
          {
            label: 'AI setup',
            value: 'BYOK',
            icon: <Bot className="h-4 w-4 text-slate-600 dark:text-slate-300" />,
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        {/* Identity */}
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Identity</h2>
          <div className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.github_username}
                className="h-20 w-20 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <UserRound className="h-8 w-8 text-slate-400" />
              </div>
            )}
            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Username</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{user?.github_username || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{user?.github_email || user?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">GitHub ID</p>
                <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">{user?.github_id || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Member since</p>
                <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Notifications</h2>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {rows.map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{row.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{row.description}</p>
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
        </div>
      </div>

      {/* Danger zone */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-red-600 dark:text-red-400">Danger zone</h2>
        <div className="flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-red-500/20 dark:bg-red-500/5">
          <div>
            <p className="text-sm font-medium text-red-900 dark:text-red-200">Delete account</p>
            <p className="text-xs text-red-700 dark:text-red-300/70">Permanently delete your account and all workspace data.</p>
          </div>
          <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
