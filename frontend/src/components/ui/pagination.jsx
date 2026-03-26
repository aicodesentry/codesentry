import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

const Pagination = ({ currentPage, totalPages, onPageChange, className }) => {
  if (totalPages <= 1) return null

  const getVisiblePages = () => {
    const pages = []
    const maxVisible = 5

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
      return pages
    }

    pages.push(1)

    let start = Math.max(2, currentPage - 1)
    let end = Math.min(totalPages - 1, currentPage + 1)

    if (currentPage <= 3) {
      start = 2
      end = Math.min(maxVisible, totalPages - 1)
    } else if (currentPage >= totalPages - 2) {
      start = Math.max(2, totalPages - maxVisible + 1)
      end = totalPages - 1
    }

    if (start > 2) pages.push('...')
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < totalPages - 1) pages.push('...')

    pages.push(totalPages)
    return pages
  }

  const visiblePages = getVisiblePages()

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {visiblePages.map((page, idx) =>
          page === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-1 text-sm text-slate-400 dark:text-slate-500">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(
                'inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg text-sm font-medium transition-colors',
                page === currentPage
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              )}
            >
              {page}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export { Pagination }
