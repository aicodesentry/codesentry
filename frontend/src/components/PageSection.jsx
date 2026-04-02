import { cn } from '../lib/utils'
import { Card, CardContent } from './ui/card'

export const PageHeader = ({
  eyebrow,
  title,
  description,
  actions,
  className,
}) => (
  <div
    className={cn(
      'relative overflow-hidden rounded-xl border border-slate-200 bg-white px-6 py-5 shadow dark:border-slate-800 dark:bg-slate-900 dark:shadow-card-dark sm:px-8',
      className
    )}
  >
    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl space-y-3">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-600 dark:text-sky-400">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="relative flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  </div>
)

export const PageStats = ({ items }) => (
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {items.map((item) => (
      <Card key={item.label} className="overflow-hidden">
        <CardContent className="flex items-center gap-4 p-5">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', item.iconWrapClassName)}>
            {item.icon}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {item.label}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{item.value}</p>
              {item.meta ? <span className="text-xs text-slate-500 dark:text-slate-400">{item.meta}</span> : null}
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
)

export const PagePanel = ({ title, description, action, className, contentClassName, children }) => (
  <Card className={cn('', className)}>
    <CardContent className={cn('space-y-5 p-6', contentClassName)}>
      {(title || description || action) ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            {title ? <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2> : null}
            {description ? <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
          </div>
          {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </CardContent>
  </Card>
)

export const EmptyPanel = ({ title, description, action, className }) => (
  <div
    className={cn(
      'rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/40',
      className
    )}
  >
    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
    <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">{description}</p>
    {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
  </div>
)
