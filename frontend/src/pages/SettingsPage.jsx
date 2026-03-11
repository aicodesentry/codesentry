import { useEffect, useState } from 'react'
import { installationAPI } from '../services/api'

export default function SettingsPage() {
  const [installations, setInstallations] = useState([])
  const [syncResult, setSyncResult] = useState(null)

  const load = async () => {
    const data = await installationAPI.list()
    setInstallations(data.installations || [])
  }

  useEffect(() => {
    load().catch((err) => console.error(err))
  }, [])

  const sync = async () => {
    const result = await installationAPI.sync()
    setSyncResult(result)
    await load()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">GitHub App Installations</h2>
            <p className="text-sm text-slate-500">Sync installation metadata from GitHub App API.</p>
          </div>
          <button onClick={sync} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Sync now</button>
        </div>

        {syncResult && (
          <p className="mt-3 text-sm text-slate-600">Synced installations: {syncResult.synced_installations}</p>
        )}

        <div className="mt-4 space-y-2">
          {installations.length === 0 && <p className="text-sm text-slate-500">No installations found.</p>}
          {installations.map((installation) => (
            <div key={installation.id} className="rounded-lg border border-slate-200 px-4 py-3">
              <p className="font-medium text-slate-900">{installation.account_login}</p>
              <p className="text-xs text-slate-500">{installation.account_type} • {installation.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
