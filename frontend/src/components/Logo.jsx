const Logo = ({ variant = 'light', className = '' }) => {
  const textColor = variant === 'dark' ? 'text-white' : 'text-neutral-950'

  return (
    <span className={`text-lg font-bold tracking-tight ${textColor} ${className}`}>
      Mitig<span className="text-neutral-400">8</span>it
    </span>
  )
}

export default Logo
