import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import OnboardingPage from '../pages/OnboardingPage'

const authState = vi.hoisted(() => ({ githubAppInstallUrl: 'https://github.com/apps/mitig8it/installations/new' }))
const onboardingState = vi.hoisted(() => ({
  status: {
    hasInstall: false,
    hasRepoAccess: false,
    hasActiveRepo: false,
    needsOnboarding: true,
  },
  error: null,
  lastSyncedAt: null,
  refresh: vi.fn(),
  syncing: false,
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('../contexts/OnboardingContext', () => ({
  useOnboarding: () => onboardingState,
}))

vi.mock('../components/PageSection', () => ({
  EmptyPanel: ({ children }) => <div>{children}</div>,
}))

describe('OnboardingPage', () => {
  beforeEach(() => {
    authState.githubAppInstallUrl = 'https://github.com/apps/mitig8it/installations/new'
    Object.assign(onboardingState, {
      status: {
        hasInstall: false,
        hasRepoAccess: false,
        hasActiveRepo: false,
        needsOnboarding: true,
      },
      error: null,
      lastSyncedAt: null,
      refresh: vi.fn(),
      syncing: false,
    })
  })

  it('renders GitHub App connect panel when installation is missing', () => {
    const { githubAppInstallUrl } = authState
    const { status } = onboardingState
    status.hasInstall = false

    render(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Install Mitig8it to start seeing reviews')).toBeInTheDocument()
    const installLink = screen.getByRole('link', { name: /Connect GitHub App/i })
    expect(installLink).toHaveAttribute('href', githubAppInstallUrl)
  })

  it('hides the GitHub App callout when the app is already installed', () => {
    onboardingState.status.hasInstall = true

    render(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>
    )

    expect(screen.queryByText('Install Mitig8it to start seeing reviews')).toBeNull()
    expect(screen.queryByRole('link', { name: /Connect GitHub App/i })).toBeNull()
  })
})
