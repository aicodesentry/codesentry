import { useEffect, useState } from 'react'
import { suppressionAPI } from '../services/api'

export default function SuppressionsPage() {
  const [suppressions, setSuppressions] = useState([])

  const load = async () => {
    const data = await suppressionAPI.list()
    setSuppressions(data.suppressions || [])
  }

  useEffect(() => {
    load().catch((err) => console.error(err))
  }, [])

  const remove = async (id) => {
    await suppressionAPI.remove(id)
    await load()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Suppressions</h1>
      <div className="space-y-3">
        {suppressions.length === 0 && (
          <div className="rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-500">No suppressions configured.</div>
        )}
        {suppressions.map((suppression) => (
          <div key={suppression.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4">
            <div>
              <p className="font-medium text-neutral-900">{suppression.title || suppression.fingerprint.slice(0, 12)}</p>
              <p className="text-sm text-neutral-500">{suppression.reason} • {suppression.category || 'Unmapped category'}</p>
            </div>
            <button onClick={() => remove(suppression.id)} className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700">
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
