import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const ProfilePage = () => {
  const { user } = useAuth()
  const [settings, setSettings] = useState({
    emailNotifications: true,
    prComments: true,
    weeklyReport: false,
    autoAnalysis: true,
  })

  const handleSettingChange = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div>
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 transition-colors">
        <div className="flex items-center gap-6">
          {user?.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt={user.github_username} 
              className="w-24 h-24 rounded-full"
            />
          ) : (
            <div className="w-24 h-24 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-4xl">👤</span>
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {user?.github_username || 'User'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">{user?.github_email || user?.email || 'No email'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              GitHub ID: {user?.github_id}
            </p>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 transition-colors">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Information</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Username
              </label>
              <p className="text-gray-900 dark:text-white">{user?.github_username || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Email
              </label>
              <p className="text-gray-900 dark:text-white">{user?.github_email || user?.email || 'N/A'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Account Type
              </label>
              <p className="text-gray-900 dark:text-white">Free Plan</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Member Since
              </label>
              <p className="text-gray-900 dark:text-white">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 transition-colors">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notification Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Receive email updates about your repositories</p>
            </div>
            <button
              onClick={() => handleSettingChange('emailNotifications')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.emailNotifications ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">PR Comments</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Post analysis results as PR comments</p>
            </div>
            <button
              onClick={() => handleSettingChange('prComments')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.prComments ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.prComments ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Weekly Reports</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Receive weekly security findings summary</p>
            </div>
            <button
              onClick={() => handleSettingChange('weeklyReport')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.weeklyReport ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.weeklyReport ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Auto Analysis</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Automatically analyze new pull requests</p>
            </div>
            <button
              onClick={() => handleSettingChange('autoAnalysis')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.autoAnalysis ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.autoAnalysis ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 transition-colors">
        <h3 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-4">Danger Zone</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-red-900 dark:text-red-300">Delete Account</p>
              <p className="text-sm text-red-700 dark:text-red-400">Permanently delete your account and all data</p>
            </div>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
