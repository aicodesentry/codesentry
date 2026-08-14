import StatusBadge from './StatusBadge'

export default function ProductSurface({ title, intro, items }) {
  return (
    <section className="border-y border-neutral-800 bg-neutral-900/30">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
          {intro ? <p className="mt-4 text-base leading-7 text-neutral-400">{intro}</p> : null}
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-800 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.title} className="bg-neutral-950 p-6">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <StatusBadge status={item.status} className="shrink-0" />
              </div>
              <p className="mt-3 text-base leading-7 text-neutral-400">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
