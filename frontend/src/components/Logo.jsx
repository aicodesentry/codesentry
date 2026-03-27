const Logo = ({ variant = 'light', className = '', showText = true }) => {
  const textColor = variant === 'dark' ? 'text-white' : 'text-slate-900'
  const hoverClass = variant === 'light' ? 'group-hover:text-blue-600' : ''

  return (
    <div className={`group flex items-center gap-2 ${className}`}>
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500">
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3 L5 7 L5 12 C5 17 8 20.5 12 22 C16 20.5 19 17 19 12 L19 7 Z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.5 12 L11.5 14 L15 10.5" />
        </svg>
      </div>
      {showText && (
        <span className={`text-xl font-bold transition-colors ${textColor} ${hoverClass}`}>
          CodeSentry
        </span>
      )}
    </div>
  )
}

export default Logo
