const LoadingSkeleton = ({ variant = 'page' }) => {
  if (variant === 'hero') {
    return (
      <div className="animate-pulse bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="space-y-4">
            <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-5/6"></div>
            <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded w-48 mt-8"></div>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'features') {
    return (
      <div className="animate-pulse py-12 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-12 w-12 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Default page skeleton
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-500"></div>
    </div>
  )
}

export default LoadingSkeleton
