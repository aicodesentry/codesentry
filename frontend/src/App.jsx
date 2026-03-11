import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LandingPage from './pages/LandingPage'
import AppLayout from './components/AppLayout'
import RepositoriesPage from './pages/RepositoriesPage'
import RepositoryDetailsPage from './pages/RepositoryDetailsPage'
import PullRequestFindingsPage from './pages/PullRequestFindingsPage'
import FindingDetailPage from './pages/FindingDetailPage'
import SuppressionsPage from './pages/SuppressionsPage'
import SettingsPage from './pages/SettingsPage'
import OnboardingPage from './pages/OnboardingPage'

const Protected = ({ children }) => {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/app"
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route index element={<Navigate to="repositories" replace />} />
        <Route path="onboarding" element={<OnboardingPage />} />
        <Route path="repositories" element={<RepositoriesPage />} />
        <Route path="repositories/:repositoryId" element={<RepositoryDetailsPage />} />
        <Route path="pull-requests/:pullRequestId/findings" element={<PullRequestFindingsPage />} />
        <Route path="findings/:findingId" element={<FindingDetailPage />} />
        <Route path="suppressions" element={<SuppressionsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
