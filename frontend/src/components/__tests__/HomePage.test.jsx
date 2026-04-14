import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HomePage from '../HomePage'

const authState = vi.hoisted(() => ({
  loginWithGitHub: vi.fn(),
  user: null,
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('../Logo', () => ({
  default: () => <div>Mitig8it</div>,
}))

vi.mock('../Footer', () => ({
  default: () => <div>Footer</div>,
}))

describe('HomePage', () => {
  beforeEach(() => {
    authState.loginWithGitHub = vi.fn()
    authState.user = null
  })

  it('shows a tighter homepage with a focused nav and proof-first hero', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )

    const navigation = screen.getByRole('navigation', { name: 'Main navigation' })

    expect(within(navigation).getByRole('link', { name: 'Examples' })).toBeInTheDocument()
    expect(within(navigation).getByRole('link', { name: 'Security' })).toBeInTheDocument()
    expect(within(navigation).getByRole('link', { name: 'About' })).toBeInTheDocument()
    expect(within(navigation).queryByRole('link', { name: 'Customers' })).toBeNull()

    expect(screen.getByRole('heading', { name: /Catch exploitable code/i })).toBeInTheDocument()
    expect(screen.getByText(/Mitig8it posts high-signal security findings directly inside pull requests/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See sample review' })).toHaveAttribute('href', '/examples')
    expect(screen.getAllByRole('button', { name: 'Start with GitHub' }).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText(/In beta/i)).toBeNull()
    expect(screen.queryByText(/How we reduce false positives/i)).toBeNull()
  })

  it('shows workspace entry for signed-in users', () => {
    authState.user = { github_username: 'neha' }

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )

    expect(screen.getAllByRole('link', { name: 'Open workspace' })[0]).toHaveAttribute('href', '/dashboard')
  })
})
