import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950/20 dark:focus:ring-slate-50/20',
  {
    variants: {
      variant: {
        default: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900',
        secondary: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
        destructive: 'bg-rose-500 text-white',
        outline: 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

const Badge = ({ className, variant, ...props }) => (
  <div className={cn(badgeVariants({ variant }), className)} {...props} />
)

export { Badge, badgeVariants }
