import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

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
        navigate('/dashboard/onboarding', { replace: true })
      } catch (_err) {
        navigate('/')
      }
    }

    finishCallback()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950">
      <div className="text-neutral-400 text-sm">Signing in...</div>
    </div>
  )
}

export default AuthCallbackPage
