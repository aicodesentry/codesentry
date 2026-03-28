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
      'relative overflow-hidden rounded-[28px] border border-slate-800/90 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.88))] px-6 py-7 shadow-[0_35px_80px_rgba(2,6,23,0.7)] sm:px-8',
      className
    )}
  >
    <div className="pointer-events-none absolute inset-y-0 right-0 w-40 bg-[radial-gradient(circle_at_center,_rgba(14,165,233,0.14),_transparent_58%)]" />
    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl space-y-3">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-200/80">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[2.25rem]">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm text-slate-300 sm:text-[15px]">
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
      <Card
        key={item.label}
        className="overflow-hidden border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-slate-950/70 to-slate-950/90"
      >
        <CardContent className="flex items-center gap-4 p-5">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', item.iconWrapClassName)}>
            {item.icon}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
              {item.label}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-3xl font-semibold tracking-tight text-white">{item.value}</p>
              {item.meta ? <span className="text-xs text-slate-400">{item.meta}</span> : null}
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
)

export const PagePanel = ({ title, description, action, className, contentClassName, children }) => (
  <Card className={cn('border-slate-800/80 bg-slate-950/55', className)}>
    <CardContent className={cn('space-y-5 p-6', contentClassName)}>
      {(title || description || action) ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            {title ? <h2 className="text-lg font-semibold text-white">{title}</h2> : null}
            {description ? <p className="text-sm text-slate-400">{description}</p> : null}
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
      'rounded-[24px] border border-dashed border-slate-700 bg-slate-950/40 px-6 py-10 text-center',
      className
    )}
  >
    <h3 className="text-lg font-semibold text-white">{title}</h3>
    <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">{description}</p>
    {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
  </div>
)
