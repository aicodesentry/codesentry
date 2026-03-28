import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import HomePage from './components/HomePage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import DashboardLayout from './components/DashboardLayout'
import DashboardPage from './pages/DashboardPage'
import ReportsPage from './pages/ReportsPage'
import CodeAnalysisTest from './pages/CodeAnalysisTest'
import RepositoriesPage from './pages/RepositoriesPage'
import RepositoryDetailsPage from './pages/RepositoryDetailsPage'
import PullRequestFindingsPage from './pages/PullRequestFindingsPage'
import FindingDetailPage from './pages/FindingDetailPage'
import SuppressionsPage from './pages/SuppressionsPage'
import SettingsPage from './pages/SettingsPage'
import OnboardingPage from './pages/OnboardingPage'
import SubscriptionPage from './pages/SubscriptionPage'
import SupportPage from './pages/SupportPage'
import ProfilePage from './pages/ProfilePage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import ExamplesPage from './pages/ExamplesPage'
import BenchmarksPage from './pages/BenchmarksPage'
import CustomersPage from './pages/CustomersPage'
import SecurityPage from './pages/SecurityPage'

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
      <Route path="/" element={<HomePage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/examples" element={<ExamplesPage />} />
      <Route path="/benchmarks" element={<BenchmarksPage />} />
      <Route path="/customers" element={<CustomersPage />} />
      <Route path="/security" element={<SecurityPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route
        path="/dashboard"
        element={
          <Protected>
            <DashboardLayout />
          </Protected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="analysis" element={<CodeAnalysisTest />} />
        <Route path="onboarding" element={<OnboardingPage />} />
        <Route path="repositories" element={<RepositoriesPage />} />
        <Route path="repositories/:repositoryId" element={<RepositoryDetailsPage />} />
        <Route path="pull-requests/:pullRequestId/findings" element={<PullRequestFindingsPage />} />
        <Route path="findings/:findingId" element={<FindingDetailPage />} />
        <Route path="suppressions" element={<SuppressionsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="subscription" element={<SubscriptionPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="/app/*" element={<Navigate to="/dashboard/repositories" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  )
}
