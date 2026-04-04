import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-950/20 dark:focus:ring-neutral-50/20',
  {
    variants: {
      variant: {
        default: 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900',
        secondary: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200',
        destructive: 'bg-rose-500 text-white',
        outline: 'border-neutral-200 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300'
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
