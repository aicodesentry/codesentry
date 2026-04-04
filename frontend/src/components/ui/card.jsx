import { cn } from '../../lib/utils'

const Card = ({ className, ...props }) => (
  <div
    className={cn(
      'rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900',
      className
    )}
    {...props}
  />
)

const CardHeader = ({ className, ...props }) => (
  <div className={cn('flex flex-col gap-2 p-6 pb-4', className)} {...props} />
)

const CardTitle = ({ className, ...props }) => (
  <h3 className={cn('text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50', className)} {...props} />
)

const CardDescription = ({ className, ...props }) => (
  <p className={cn('text-sm text-neutral-500 dark:text-neutral-400', className)} {...props} />
)

const CardContent = ({ className, ...props }) => (
  <div className={cn('p-6 pt-0', className)} {...props} />
)

const CardFooter = ({ className, ...props }) => (
  <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
)

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
