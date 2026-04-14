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
    hasActiveRepo: false,
    activeRepositoryCount: 0,
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
  EmptyPanel: ({ title, description, action }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
      <div>{action}</div>
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
      hasActiveRepo: false,
      activeRepositoryCount: 0,
    }
  })

  it('allows signed-in users to browse the dashboard before installing the GitHub App', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )

    expect(screen.getByText("neha's workspace")).toBeInTheDocument()
    expect(screen.getByText(/GitHub App install is optional/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Install GitHub App' })).toHaveAttribute(
      'href',
      authState.githubAppInstallUrl
    )
    expect(await screen.findByText(/No pull requests yet/i)).toBeInTheDocument()
  })
})
