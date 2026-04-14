const statusClasses = {
  live: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  progress: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  upcoming: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
}

const statusLabels = {
  live: 'Live now',
  progress: 'In progress',
  upcoming: 'Coming soon',
}

export default function StatusBadge({ status, className = '' }) {
  const tone = statusClasses[status] || statusClasses.live
  const label = statusLabels[status] || statusLabels.live

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${tone} ${className}`.trim()}
    >
      {label}
    </span>
  )
}
