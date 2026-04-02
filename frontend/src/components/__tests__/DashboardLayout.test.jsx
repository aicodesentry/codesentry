import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardLayout from '../DashboardLayout'

const authState = vi.hoisted(() => ({
  user: { github_username: 'neha', github_email: 'neha@example.com' },
  logout: vi.fn(),
}))

const themeState = vi.hoisted(() => ({
  theme: 'light',
  toggleTheme: vi.fn(),
}))

const onboardingState = vi.hoisted(() => ({
  status: {
    needsOnboarding: true,
    nextStep: 'connect-repo',
    analysisCount: 0,
  },
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => themeState,
}))

vi.mock('../../contexts/OnboardingContext', async () => {
  const actual = await vi.importActual('../../contexts/OnboardingContext')
  return {
    ...actual,
    OnboardingProvider: ({ children }) => children,
    useOnboarding: () => onboardingState,
  }
})

vi.mock('../Footer', () => ({
  default: () => <div>Footer</div>,
}))

vi.mock('../Logo', () => ({
  default: () => <div>Logo</div>,
}))

describe('DashboardLayout', () => {
  beforeEach(() => {
    onboardingState.status = {
      needsOnboarding: true,
      nextStep: 'connect-repo',
      analysisCount: 0,
    }
  })

  it('shows only activation navigation during onboarding', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/onboarding']}>
        <DashboardLayout />
      </MemoryRouter>
    )

    expect(screen.getByRole('link', { name: 'Onboarding' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Repositories' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Reports' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Subscription' })).not.toBeInTheDocument()
    expect(screen.getByText('Next step: connect repo')).toBeInTheDocument()
  })

  it('restores the full navigation after onboarding is complete', () => {
    onboardingState.status = {
      needsOnboarding: false,
      nextStep: 'done',
      analysisCount: 4,
    }

    render(
      <MemoryRouter initialEntries={['/dashboard/home']}>
        <DashboardLayout />
      </MemoryRouter>
    )

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reports' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Subscription' })).toBeInTheDocument()
    expect(screen.getByText('4 analyses recorded')).toBeInTheDocument()
  })
})
