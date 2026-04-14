import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from '../DashboardPage'

const authState = vi.hoisted(() => ({
  user: { github_username: 'neha' },
  githubAppInstallUrl: 'https://github.com/apps/mitig8it/installations/new',
}))

const onboardingState = vi.hoisted(() => ({
  loading: false,
  status: {
    needsOnboarding: true,
    needsFirstReview: false,
    hasInstall: false,
    hasRepoAccess: false,
    hasActiveRepo: false,
    hasFirstPullRequest: false,
    hasFirstReview: false,
    activeRepositoryCount: 0,
    installationCount: 0,
    repositoryCount: 0,
    analysisCount: 0,
    nextStep: 'install',
  },
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('../../contexts/OnboardingContext', () => ({
  useOnboarding: () => onboardingState,
}))

vi.mock('../../services/api', () => ({
  repositoryAPI: {
    getSummary: vi.fn().mockResolvedValue({
      summary: { total_analyses: 0, completed: 0, failed: 0, recent_7_days: 0 },
    }),
    list: vi.fn().mockResolvedValue({ repositories: [] }),
    listPRs: vi.fn(),
  },
}))

vi.mock('../../components/PageSection', () => ({
  PageHeader: ({ title, description, actions }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
      <div>{actions}</div>
    </div>
  ),
  PageStats: ({ items }) => (
    <div>
      {items.map((item) => (
        <div key={item.label}>{`${item.label}:${item.value}`}</div>
      ))}
    </div>
  ),
}))

vi.mock('../../components/ui/pagination', () => ({
  Pagination: () => <div>Pagination</div>,
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    onboardingState.loading = false
    onboardingState.status = {
      needsOnboarding: true,
      needsFirstReview: false,
      hasInstall: false,
      hasRepoAccess: false,
      hasActiveRepo: false,
      hasFirstPullRequest: false,
      hasFirstReview: false,
      activeRepositoryCount: 0,
      installationCount: 0,
      repositoryCount: 0,
      analysisCount: 0,
      nextStep: 'install',
    }
  })

  it('shows a guided first-run workspace instead of dashboard metrics before install', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/get your first review live/i)).toBeInTheDocument()
    expect(screen.getByText('Setup progress')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Install GitHub App' })).toHaveAttribute(
      'href',
      authState.githubAppInstallUrl
    )
    await screen.findByText('View setup guide')
    expect(screen.queryByText('Active repos:0')).toBeNull()
    expect(screen.queryByText(/Recent Pull Requests/i)).toBeNull()
  })

  it('switches the first-run action to waiting state once a PR exists', async () => {
    onboardingState.status = {
      needsOnboarding: false,
      needsFirstReview: true,
      hasInstall: true,
      hasRepoAccess: true,
      hasActiveRepo: true,
      hasFirstPullRequest: true,
      hasFirstReview: false,
      activeRepositoryCount: 1,
      installationCount: 1,
      repositoryCount: 1,
      analysisCount: 0,
      nextStep: 'wait-review',
    }

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Waiting for the first review')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to reports' })).toHaveAttribute('href', '/dashboard/reports')
    expect(screen.getByText('1 repo active')).toBeInTheDocument()
  })

  it('shows the live dashboard once the first review has landed', async () => {
    onboardingState.status = {
      needsOnboarding: false,
      needsFirstReview: false,
      hasInstall: true,
      hasRepoAccess: true,
      hasActiveRepo: true,
      hasFirstPullRequest: true,
      hasFirstReview: true,
      activeRepositoryCount: 1,
      installationCount: 1,
      repositoryCount: 1,
      analysisCount: 3,
      nextStep: 'done',
    }

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )

    expect(screen.getByText("neha's workspace")).toBeInTheDocument()
    expect(screen.getByText('Recent Pull Requests')).toBeInTheDocument()
    expect(await screen.findByText(/No pull requests yet/i)).toBeInTheDocument()
  })
})
