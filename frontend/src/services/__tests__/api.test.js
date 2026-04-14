import { beforeEach, describe, expect, it, vi } from 'vitest'

const setLocationHref = (value) => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...window.location,
      href: value,
      hostname: 'localhost',
      pathname: '/',
    },
  })
}

describe('authAPI GitHub login/logout helpers', () => {
  beforeEach(() => {
    vi.resetModules()
    window.localStorage.clear()
    setLocationHref('http://localhost:5173/')
  })

  it('marks the next login for GitHub reauthentication after logout', async () => {
    const post = vi.fn().mockResolvedValue({ data: { success: true } })
    vi.doMock('axios', () => {
      const create = () => ({
        post,
        get: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      })
      return { default: { create } }
    })

    const { authAPI, consumeGithubReauthRequired } = await import('../api')

    await authAPI.logout()

    expect(consumeGithubReauthRequired()).toBe(true)
    expect(consumeGithubReauthRequired()).toBe(false)
  })

  it('adds prompt=select_account on the first login after logout', async () => {
    vi.doMock('axios', () => {
      const create = () => ({
        post: vi.fn(),
        get: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      })
      return { default: { create } }
    })

    const { authAPI, markGithubReauthRequired } = await import('../api')

    markGithubReauthRequired()
    authAPI.loginWithGitHub()
    expect(window.location.href).toBe('http://localhost:3000/auth/github?prompt=select_account')

    authAPI.loginWithGitHub()
    expect(window.location.href).toBe('http://localhost:3000/auth/github')
  })
})
