import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AppRoutes } from '../App'

const authState = vi.hoisted(() => ({
  user: { github_username: 'neha' },
  isLoading: false,
}))

const onboardingState = vi.hoisted(() => ({
  loading: false,
  status: { needsOnboarding: true },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('../contexts/OnboardingContext', () => ({
  useOnboarding: () => onboardingState,
}))

vi.mock('../components/HomePage', () => ({
  default: () => <div>Home Page</div>,
}))

vi.mock('../components/DashboardLayout', async () => {
  const { Outlet } = await import('react-router-dom')
  return {
    default: () => (
      <div>
        <div>Dashboard Layout</div>
        <Outlet />
      </div>
    ),
  }
})

vi.mock('../pages/AuthCallbackPage', () => ({ default: () => <div>Auth Callback</div> }))
vi.mock('../pages/DashboardPage', () => ({ default: () => <div>Dashboard Home</div> }))
vi.mock('../pages/OnboardingPage', () => ({ default: () => <div>Onboarding Page</div> }))
vi.mock('../pages/ReportsPage', () => ({ default: () => <div>Reports Page</div> }))
vi.mock('../pages/CodeAnalysisTest', () => ({ default: () => <div>Analysis Page</div> }))
vi.mock('../pages/RepositoriesPage', () => ({ default: () => <div>Repositories Page</div> }))
vi.mock('../pages/RepositoryDetailsPage', () => ({ default: () => <div>Repository Details</div> }))
vi.mock('../pages/PullRequestFindingsPage', () => ({ default: () => <div>PR Findings</div> }))
vi.mock('../pages/FindingDetailPage', () => ({ default: () => <div>Finding Detail</div> }))
vi.mock('../pages/SuppressionsPage', () => ({ default: () => <div>Suppressions</div> }))
vi.mock('../pages/SubscriptionPage', () => ({ default: () => <div>Subscription</div> }))
vi.mock('../pages/SupportPage', () => ({ default: () => <div>Support</div> }))
vi.mock('../pages/ProfilePage', () => ({ default: () => <div>Profile</div> }))
vi.mock('../pages/PrivacyPage', () => ({ default: () => <div>Privacy</div> }))
vi.mock('../pages/TermsPage', () => ({ default: () => <div>Terms</div> }))
vi.mock('../pages/ExamplesPage', () => ({ default: () => <div>Examples</div> }))
vi.mock('../pages/BenchmarksPage', () => ({ default: () => <div>Benchmarks</div> }))
vi.mock('../pages/CustomersPage', () => ({ default: () => <div>Customers</div> }))
vi.mock('../pages/SecurityPage', () => ({ default: () => <div>Security</div> }))
vi.mock('../pages/SettingsPage', () => ({ default: () => <div>Settings</div> }))

describe('AppRoutes onboarding redirects', () => {
  beforeEach(() => {
    authState.user = { github_username: 'neha' }
    authState.isLoading = false
    onboardingState.loading = false
    onboardingState.status = { needsOnboarding: true }
  })

  it('redirects /dashboard to dashboard home when setup is incomplete', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppRoutes />
      </MemoryRouter>
    )

    expect(screen.getByText('Dashboard Home')).toBeInTheDocument()
  })

  it('redirects /dashboard to dashboard home when onboarding is complete', () => {
    onboardingState.status = { needsOnboarding: false }

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppRoutes />
      </MemoryRouter>
    )

    expect(screen.getByText('Dashboard Home')).toBeInTheDocument()
  })

  it('lets connected users into the workspace even before the first review lands', () => {
    onboardingState.status = {
      needsOnboarding: false,
      needsFirstReview: true,
      hasWorkspaceAccess: true,
    }

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppRoutes />
      </MemoryRouter>
    )

    expect(screen.getByText('Dashboard Home')).toBeInTheDocument()
  })

  it('redirects unauthenticated users back to home', () => {
    authState.user = null

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppRoutes />
      </MemoryRouter>
    )

    expect(screen.getByText('Home Page')).toBeInTheDocument()
  })
})
