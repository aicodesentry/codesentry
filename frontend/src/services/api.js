import axios from 'axios'

const DEFAULT_LOCAL_API_URL = 'http://localhost:3000'
const DEFAULT_PROD_API_URL = 'https://codesentry-api-bv5j37b5tq-uc.a.run.app'
const isBrowser = typeof window !== 'undefined'
const isLocalHost =
  isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
const API_BASE_URL =
  import.meta.env.VITE_API_URL || (isLocalHost ? DEFAULT_LOCAL_API_URL : DEFAULT_PROD_API_URL)
const ANALYSIS_BASE_URL = import.meta.env.VITE_ANALYSIS_SERVICE_URL || API_BASE_URL

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
  },
  getRepositories: async () => {
    const { data } = await api.get('/api/repositories')
    return data
  },
  getConnectedCount: async () => {
    const { data } = await api.get('/api/repositories')
    return { count: data.repositories?.length || 0 }
  },
  getSummary: async () => {
    const { data } = await api.get('/api/reports/summary')
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

export const reportsAPI = {
  getPRAnalyses: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const { data } = await api.get(`/api/reports/pr-analyses${q ? `?${q}` : ''}`)
    return data
  },
  getPRAnalysisDetails: async (analysisId) => {
    const { data } = await api.get(`/api/reports/pr-analyses/${analysisId}`)
    return data
  },
  getSummary: async () => {
    const { data } = await api.get('/api/reports/summary')
    return data
  }
}

export const analysisAPI = {
  healthCheck: async () => {
    const { data } = await axios.get(`${ANALYSIS_BASE_URL}/health`)
    return data
  },
  getHistory: async (limit = 10) => {
    try {
      const { data } = await axios.get(`${ANALYSIS_BASE_URL}/api/analysis/history?limit=${limit}`)
      return data
    } catch (_error) {
      return { analyses: [], total: 0 }
    }
  },
  analyzeCode: async (payload) => {
    try {
      const { data } = await axios.post(`${ANALYSIS_BASE_URL}/api/analysis/analyze`, payload)
      return data
    } catch (error) {
      if (error?.response?.status !== 404) throw error
      const mappedPayload = {
        repository_full_name: payload.repository || 'playground',
        pull_request_number: Number(payload.pr_number || 0),
        commit_sha: 'playground',
        files: [
          {
            path: payload.file_path || 'playground.py',
            patch: payload.code || '',
            additions: 0,
            deletions: 0,
            status: 'modified'
          }
        ]
      }
      const fallback = await axios.post(`${ANALYSIS_BASE_URL}/analyze/pr`, mappedPayload)
      return fallback.data
    }
  }
}

export const webhookAPI = {
  getEvents: async (limit = 50, offset = 0) => {
    try {
      const q = new URLSearchParams({ limit: String(limit), offset: String(offset) }).toString()
      const { data } = await api.get(`/api/webhooks/events?${q}`)
      return data
    } catch (_error) {
      return { events: [] }
    }
  }
}

export default api
