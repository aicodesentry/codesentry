import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SecurityPage from '../SecurityPage'

const authState = vi.hoisted(() => ({
  loginWithGitHub: vi.fn(),
  user: null,
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('../../components/Header', () => ({
  default: () => <div>Header</div>,
}))

vi.mock('../../components/Footer', () => ({
  default: () => <div>Footer</div>,
}))

describe('SecurityPage CTA', () => {
  beforeEach(() => {
    authState.loginWithGitHub = vi.fn()
    authState.user = null
  })

  it('starts auth for signed-out visitors', () => {
    render(
      <MemoryRouter>
        <SecurityPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Get started' }))
    expect(authState.loginWithGitHub).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('link', { name: 'Open workspace' })).toBeNull()
  })

  it('opens the workspace for signed-in visitors', () => {
    authState.user = { github_username: 'neha' }

    render(
      <MemoryRouter>
        <SecurityPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('link', { name: 'Open workspace' })).toHaveAttribute('href', '/dashboard')
    expect(screen.queryByRole('button', { name: 'Get started' })).toBeNull()
  })
})
