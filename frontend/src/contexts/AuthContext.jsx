import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'

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
      try {
        const data = await authAPI.getMe()
        if (!data?.user) {
          throw new Error('Invalid auth response')
        }
        setUser(data.user)
        setGithubAppInstallUrl(data.github_app_install_url)
      } catch (_error) {
        setUser(null)
        setGithubAppInstallUrl(null)
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [])

  const logout = async () => {
    await authAPI.logout()
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
