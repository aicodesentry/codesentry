import { cn } from '../../lib/utils'

const Card = ({ className, ...props }) => (
  <div
    className={cn(
      'rounded-2xl border border-slate-900/80 bg-gradient-to-br from-slate-900/80 to-slate-950/60 shadow-[0_25px_50px_rgba(2,6,23,0.65)] backdrop-blur dark:border-slate-800/90 dark:bg-slate-950/60 dark:shadow-[0_35px_70px_rgba(2,6,23,0.85)]',
      className
    )}
    {...props}
  />
)

const CardHeader = ({ className, ...props }) => (
  <div className={cn('flex flex-col gap-2 p-6 pb-4', className)} {...props} />
)

const CardTitle = ({ className, ...props }) => (
  <h3 className={cn('text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50', className)} {...props} />
)

const CardDescription = ({ className, ...props }) => (
  <p className={cn('text-sm text-slate-500 dark:text-slate-400', className)} {...props} />
)

const CardContent = ({ className, ...props }) => (
  <div className={cn('p-6 pt-0', className)} {...props} />
)

const CardFooter = ({ className, ...props }) => (
  <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
)

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
