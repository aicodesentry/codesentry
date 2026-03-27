import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000'
    : 'https://codesentry-api-bv5j37b5tq-uc.a.run.app')

const AuthCallbackPage = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const exchangeCode = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const error = params.get('error')

      if (error) {
        navigate(`/?error=${error}`)
        return
      }

      if (!code) {
        navigate('/?error=no_auth_code')
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/exchange`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })

        if (!response.ok) {
          navigate('/?error=auth_exchange_failed')
          return
        }

        navigate('/dashboard', { replace: true })
      } catch (_err) {
        navigate('/?error=auth_exchange_failed')
      }
    }

    exchangeCode()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-slate-400 text-sm">Signing in...</div>
    </div>
  )
}

export default AuthCallbackPage
