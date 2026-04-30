import StatusBadge from './StatusBadge'

export default function ProductSurface({ eyebrow = 'Product surface', title, intro, items }) {
  return (
    <section className="border-b border-neutral-800/60 bg-neutral-900/25 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-500">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {title}
          </h2>
          {intro ? (
            <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-400">{intro}</p>
          ) : null}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-neutral-800 bg-neutral-900/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.24)]"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-neutral-400">{item.description}</p>
                </div>
                <StatusBadge status={item.status} className="shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
