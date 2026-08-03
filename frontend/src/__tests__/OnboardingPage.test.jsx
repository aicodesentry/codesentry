import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router'

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

describe('OnboardingPage', () => {
  beforeEach(() => {
    authState.githubAppInstallUrl = 'https://github.com/apps/mitig8it/installations/new'
    Object.assign(onboardingState, {
      status: {
        hasInstall: false,
        hasRepoAccess: false,
        hasActiveRepo: false,
        hasFirstPullRequest: false,
        hasFirstReview: false,
        installationCount: 0,
        repositoryCount: 0,
        activeRepositoryCount: 0,
        analysisCount: 0,
        nextStep: 'install',
        needsOnboarding: true,
      },
      error: null,
      lastSyncedAt: null,
      refresh: vi.fn(),
      syncing: false,
    })
  })

  function renderPage() {
    render(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>
    )
  }

  it('shows a single install action when GitHub App installation is missing', () => {
    const { githubAppInstallUrl } = authState
    const { status } = onboardingState
    status.hasInstall = false

    renderPage()

    expect(screen.getByRole('heading', { name: 'Set up Mitig8it' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Install the GitHub App' })).toBeInTheDocument()
    const installLink = screen.getByRole('link', { name: /Install GitHub App/i })
    expect(installLink).toHaveAttribute('href', githubAppInstallUrl)
    expect(screen.queryByText('What users should expect')).toBeNull()
    expect(screen.queryByText('Optional: bring your own model key')).toBeNull()
  })

  it('switches to the repository activation step after install and repo access are done', () => {
    Object.assign(onboardingState.status, {
      hasInstall: true,
      hasRepoAccess: true,
      hasActiveRepo: false,
      installationCount: 1,
      repositoryCount: 1,
      nextStep: 'connect-repo',
    })

    renderPage()

    expect(screen.getByRole('heading', { name: 'Activate your first repository' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Choose repository' })).toHaveAttribute('href', '/dashboard/repositories')
    expect(screen.getByText('Setup checklist')).toBeInTheDocument()
    expect(screen.getByText('What you get once setup is complete')).toBeInTheDocument()
  })

  it('shows the permission-fix state and sync action when install exists but no repos are visible', async () => {
    Object.assign(onboardingState.status, {
      hasInstall: true,
      hasRepoAccess: false,
      hasActiveRepo: false,
      installationCount: 1,
      repositoryCount: 0,
      nextStep: 'grant-access',
      needsPermissionFix: true,
    })

    renderPage()

    expect(screen.getByRole('heading', { name: 'Grant repository access' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Manage GitHub access' })).toHaveAttribute('href', 'https://github.com/settings/installations')
    expect(screen.getByText('GitHub is connected, but repository access is still too narrow.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Sync GitHub' }))
    expect(onboardingState.refresh).toHaveBeenCalledWith({ sync: true })
  })

  it('shows the waiting state once a pull request exists but the first review is pending', () => {
    Object.assign(onboardingState.status, {
      hasInstall: true,
      hasRepoAccess: true,
      hasActiveRepo: true,
      hasFirstPullRequest: true,
      hasFirstReview: false,
      installationCount: 1,
      repositoryCount: 1,
      activeRepositoryCount: 1,
      nextStep: 'wait-review',
    })

    renderPage()

    expect(screen.getByRole('heading', { name: 'Waiting for the first review' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to reports' })).toHaveAttribute('href', '/dashboard/reports')
    expect(screen.getByRole('button', { name: 'Sync GitHub' })).toBeInTheDocument()
  })

  it('shows the completion state after the first review lands', () => {
    Object.assign(onboardingState.status, {
      hasInstall: true,
      hasRepoAccess: true,
      hasActiveRepo: true,
      hasFirstPullRequest: true,
      hasFirstReview: true,
      installationCount: 1,
      repositoryCount: 1,
      activeRepositoryCount: 1,
      analysisCount: 2,
      nextStep: 'done',
    })

    renderPage()

    expect(screen.getByRole('heading', { name: 'Your setup is complete' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open dashboard' })).toHaveAttribute('href', '/dashboard/home')
    expect(screen.getByRole('link', { name: 'View reports' })).toHaveAttribute('href', '/dashboard/reports')
    expect(screen.getByText('2 reviews completed')).toBeInTheDocument()
  })
})
