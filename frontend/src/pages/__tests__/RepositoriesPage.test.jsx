import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RepositoriesPage from '../RepositoriesPage'

const onboardingState = vi.hoisted(() => ({
  error: null,
  refresh: vi.fn(),
  syncing: false,
  repositories: [],
  status: {
    activeRepositoryCount: 0,
    hasActiveRepo: false,
    hasFirstReview: false,
    installationCount: 0,
    repositoryCount: 0,
  },
}))

vi.mock('../../contexts/OnboardingContext', () => ({
  useOnboarding: () => onboardingState,
}))

vi.mock('../../services/api', () => ({
  repositoryAPI: {
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}))

describe('RepositoriesPage', () => {
  beforeEach(() => {
    onboardingState.error = null
    onboardingState.refresh = vi.fn()
    onboardingState.syncing = false
    onboardingState.repositories = []
    onboardingState.status = {
      activeRepositoryCount: 0,
      hasActiveRepo: false,
      hasFirstReview: false,
      installationCount: 0,
      repositoryCount: 0,
    }
  })

  it('renders profile status metadata from the repository list response', () => {
    onboardingState.repositories = [
      {
        id: 'repo-1',
        full_name: 'acme/api',
        language: 'TypeScript',
        private: true,
        is_active: true,
        open_findings_count: 2,
        pull_request_count: 5,
        profile_status: 'ready',
        profile_confidence: 0.82,
        profile_updated_at: '2026-04-09T12:34:56Z',
      },
      {
        id: 'repo-2',
        full_name: 'acme/worker',
        language: 'Go',
        private: false,
        is_active: false,
        open_findings_count: 0,
        pull_request_count: 1,
        profile_status: 'failed',
        profile_confidence: null,
        profile_updated_at: null,
      },
    ]
    onboardingState.status = {
      activeRepositoryCount: 1,
      hasActiveRepo: true,
      hasFirstReview: false,
      installationCount: 1,
      repositoryCount: 2,
    }

    render(
      <MemoryRouter>
        <RepositoriesPage />
      </MemoryRouter>
    )

    expect(screen.getByText('ready')).toBeInTheDocument()
    expect(screen.getByText('82%')).toBeInTheDocument()
    expect(screen.getByText('failed')).toBeInTheDocument()
  })
})
