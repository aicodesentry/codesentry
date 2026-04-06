import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { OnboardingProvider, useOnboarding } from '../OnboardingContext'

const syncMock = vi.fn()
const installationsListMock = vi.fn()
const repositoriesListMock = vi.fn()
const summaryMock = vi.fn()

vi.mock('../../services/api', () => ({
  installationAPI: {
    sync: (...args) => syncMock(...args),
    list: (...args) => installationsListMock(...args),
  },
  repositoryAPI: {
    list: (...args) => repositoriesListMock(...args),
  },
  reportsAPI: {
    getSummary: (...args) => summaryMock(...args),
  },
}))

function Probe() {
  const { status } = useOnboarding()
  return (
    <div>
      <div>installs:{status.installationCount}</div>
      <div>repos:{status.repositoryCount}</div>
      <div>active:{status.activeRepositoryCount}</div>
      <div>analyses:{status.analysisCount}</div>
      <div>needsOnboarding:{String(status.needsOnboarding)}</div>
      <div>nextStep:{status.nextStep}</div>
    </div>
  )
}

describe('OnboardingProvider', () => {
  beforeEach(() => {
    syncMock.mockReset()
    installationsListMock.mockReset()
    repositoriesListMock.mockReset()
    summaryMock.mockReset()

    syncMock.mockResolvedValue({ synced_installations: 1, synced_repositories: 1 })
    installationsListMock.mockResolvedValue({
      installations: [{ id: 1 }],
    })
    repositoriesListMock.mockResolvedValue({
      repositories: [{ id: 'repo-1', is_active: true, pull_request_count: 1 }],
    })
    summaryMock.mockResolvedValue({
      summary: { total_analyses: 1, completed: 1, failed: 0, recent_7_days: 1 },
    })
  })

  it('derives a completed onboarding state when install, repo, and analysis exist', async () => {
    render(
      <OnboardingProvider>
        <Probe />
      </OnboardingProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('needsOnboarding:false')).toBeInTheDocument()
    })

    expect(syncMock).not.toHaveBeenCalled()
    expect(screen.getByText('installs:1')).toBeInTheDocument()
    expect(screen.getByText('repos:1')).toBeInTheDocument()
    expect(screen.getByText('active:1')).toBeInTheDocument()
    expect(screen.getByText('analyses:1')).toBeInTheDocument()
    expect(screen.getByText('nextStep:done')).toBeInTheDocument()
  })

  it('keeps users in onboarding until an active repository exists', async () => {
    repositoriesListMock.mockResolvedValue({
      repositories: [{ id: 'repo-1', is_active: false, pull_request_count: 0 }],
    })
    summaryMock.mockResolvedValue({
      summary: { total_analyses: 0, completed: 0, failed: 0, recent_7_days: 0 },
    })

    render(
      <OnboardingProvider>
        <Probe />
      </OnboardingProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('needsOnboarding:true')).toBeInTheDocument()
    })

    expect(screen.getByText('nextStep:connect-repo')).toBeInTheDocument()
  })

  it('does not force users back into onboarding once a workspace is connected', async () => {
    repositoriesListMock.mockResolvedValue({
      repositories: [{ id: 'repo-1', is_active: true, pull_request_count: 0 }],
    })
    summaryMock.mockResolvedValue({
      summary: { total_analyses: 0, completed: 0, failed: 0, recent_7_days: 0 },
    })

    render(
      <OnboardingProvider>
        <Probe />
      </OnboardingProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('needsOnboarding:false')).toBeInTheDocument()
    })

    expect(screen.getByText('nextStep:open-pr')).toBeInTheDocument()
  })

  it('runs a background sync only when no installations are visible after the first load', async () => {
    installationsListMock.mockResolvedValue({
      installations: [],
    })
    repositoriesListMock.mockResolvedValue({
      repositories: [],
    })
    summaryMock.mockResolvedValue({
      summary: { total_analyses: 0, completed: 0, failed: 0, recent_7_days: 0 },
    })

    render(
      <OnboardingProvider>
        <Probe />
      </OnboardingProvider>
    )

    await waitFor(() => {
      expect(syncMock).toHaveBeenCalledTimes(1)
    })
  })

  it('treats deleted installations as disconnected for onboarding state', async () => {
    installationsListMock.mockResolvedValue({
      installations: [{ id: 1, status: 'deleted' }],
    })
    repositoriesListMock.mockResolvedValue({
      repositories: [],
    })
    summaryMock.mockResolvedValue({
      summary: { total_analyses: 0, completed: 0, failed: 0, recent_7_days: 0 },
    })

    render(
      <OnboardingProvider>
        <Probe />
      </OnboardingProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('installs:0')).toBeInTheDocument()
    })

    expect(screen.getByText('needsOnboarding:true')).toBeInTheDocument()
    expect(screen.getByText('nextStep:install')).toBeInTheDocument()
  })

  it('deduplicates repository rows before deriving counts', async () => {
    repositoriesListMock.mockResolvedValue({
      repositories: [
        { id: 'repo-1', github_id: 101, full_name: 'org/repo-1', is_active: false, pull_request_count: 0 },
        { id: 'repo-1', github_id: 101, full_name: 'org/repo-1', is_active: true, pull_request_count: 2 },
      ],
    })
    summaryMock.mockResolvedValue({
      summary: { total_analyses: 2, completed: 2, failed: 0, recent_7_days: 2 },
    })

    render(
      <OnboardingProvider>
        <Probe />
      </OnboardingProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('repos:1')).toBeInTheDocument()
    })

    expect(screen.getByText('active:1')).toBeInTheDocument()
    expect(screen.getByText('analyses:2')).toBeInTheDocument()
    expect(screen.getByText('needsOnboarding:false')).toBeInTheDocument()
  })
})
