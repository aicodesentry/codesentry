import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI, setAuthToken, clearAuthToken } from '../services/api'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [githubAppInstallUrl, setGithubAppInstallUrl] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const init = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const queryParams = new URLSearchParams(window.location.search)
      const tokenFromRedirect = hashParams.get('token') || queryParams.get('token')

      if (tokenFromRedirect) {
        setAuthToken(tokenFromRedirect)
        const cleanPath = `${window.location.pathname}${window.location.search.replace(/[?&]token=[^&]*/g, '').replace(/\?$/, '')}`
        window.history.replaceState({}, document.title, cleanPath || '/dashboard')
      }

      try {
        const data = await authAPI.getMe()
        setUser(data.user)
        setGithubAppInstallUrl(data.github_app_install_url)
      } catch (_error) {
        setUser(null)
        setGithubAppInstallUrl(null)
        clearAuthToken()
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [])

  const logout = async () => {
    await authAPI.logout()
    clearAuthToken()
    setUser(null)
    navigate('/')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        loginWithGitHub: authAPI.loginWithGitHub,
        logout,
        githubAppInstallUrl
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
