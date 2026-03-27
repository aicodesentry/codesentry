import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000'
    : '')

const AuthCallbackPage = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const finishCallback = async () => {
      const params = new URLSearchParams(window.location.search)
      const error = params.get('error')

      if (error) {
        navigate(`/?error=${error}`)
        return
      }

      try {
        navigate('/dashboard', { replace: true })
      } catch (_err) {
        navigate('/')
      }
    }

    finishCallback()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-slate-400 text-sm">Signing in...</div>
    </div>
  )
}

export default AuthCallbackPage
