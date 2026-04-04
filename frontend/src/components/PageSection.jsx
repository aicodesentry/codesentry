import { cn } from '../lib/utils'

export const PageHeader = ({
  title,
  description,
  actions,
  className,
}) => (
  <div className={cn('flex items-center justify-between', className)}>
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{title}</h1>
      {description ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      ) : null}
    </div>
    {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
  </div>
)

export const PageStats = ({ items }) => (
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    {items.map((item) => (
      <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
            {item.icon}
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-900 dark:text-white">{item.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
          </div>
        </div>
      </div>
    ))}
  </div>
)

export const PagePanel = ({ title, action, className, children }) => (
  <div className={cn('', className)}>
    {(title || action) ? (
      <div className="mb-3 flex items-center justify-between">
        {title ? <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2> : null}
        {action || null}
      </div>
    ) : null}
    {children}
  </div>
)

export const EmptyPanel = ({ title, description, action, className }) => (
  <div
    className={cn(
      'rounded-xl border border-dashed border-slate-200 px-6 py-12 text-center dark:border-slate-800',
      className
    )}
  >
    <h3 className="text-sm font-medium text-slate-900 dark:text-white">{title}</h3>
    <p className="mx-auto mt-1 max-w-xl text-sm text-slate-500 dark:text-slate-400">{description}</p>
    {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
  </div>
)
