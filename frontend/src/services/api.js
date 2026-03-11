import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && window.location.pathname.startsWith('/app')) {
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  loginWithGitHub: () => {
    window.location.href = `${API_BASE_URL}/auth/github`
  },
  getMe: async () => {
    const { data } = await api.get('/auth/me')
    return data
  },
  logout: async () => {
    await api.post('/auth/logout')
  }
}

export const installationAPI = {
  list: async () => {
    const { data } = await api.get('/api/installations')
    return data
  },
  sync: async () => {
    const { data } = await api.post('/api/installations/sync')
    return data
  }
}

export const repositoryAPI = {
  list: async () => {
    const { data } = await api.get('/api/repositories')
    return data
  },
  get: async (repositoryId) => {
    const { data } = await api.get(`/api/repositories/${repositoryId}`)
    return data
  },
  listPRs: async (repositoryId) => {
    const { data } = await api.get(`/api/repositories/${repositoryId}/pull-requests`)
    return data
  },
  setBaseline: async (repositoryId, enabled) => {
    const { data } = await api.patch(`/api/repositories/${repositoryId}/baseline`, { enabled })
    return data
  }
}

export const findingAPI = {
  listByPR: async (pullRequestId, params = {}) => {
    const q = new URLSearchParams(params).toString()
    const { data } = await api.get(`/api/pull-requests/${pullRequestId}/findings${q ? `?${q}` : ''}`)
    return data
  },
  list: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const { data } = await api.get(`/api/findings${q ? `?${q}` : ''}`)
    return data
  },
  get: async (findingId) => {
    const { data } = await api.get(`/api/findings/${findingId}`)
    return data
  },
  updateStatus: async (findingId, status, dismissalReason = null) => {
    const { data } = await api.patch(`/api/findings/${findingId}/status`, {
      status,
      dismissal_reason: dismissalReason
    })
    return data
  }
}

export const suppressionAPI = {
  list: async (repositoryId) => {
    const q = repositoryId ? `?repository_id=${repositoryId}` : ''
    const { data } = await api.get(`/api/suppressions${q}`)
    return data
  },
  create: async (payload) => {
    const { data } = await api.post('/api/suppressions', payload)
    return data
  },
  remove: async (suppressionId) => {
    const { data } = await api.delete(`/api/suppressions/${suppressionId}`)
    return data
  }
}

export default api
