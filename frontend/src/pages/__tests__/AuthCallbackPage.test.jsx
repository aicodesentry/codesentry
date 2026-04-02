import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import AuthCallbackPage from '../AuthCallbackPage'

describe('AuthCallbackPage', () => {
  it('sends successful callbacks to onboarding', async () => {
    render(
      <MemoryRouter initialEntries={['/auth/callback?code=123']}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/dashboard/onboarding" element={<div>Onboarding Route</div>} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Onboarding Route')).toBeInTheDocument()
    })
  })

  it('returns to home when callback contains an error', async () => {
    render(
      <MemoryRouter initialEntries={['/auth/callback?error=oauth_failed']}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="*" element={<div>Home Route</div>} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Home Route')).toBeInTheDocument()
    })
  })
})
