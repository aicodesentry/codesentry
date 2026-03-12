import axios from 'axios'

const DEFAULT_LOCAL_API_URL = 'http://localhost:3000'
const DEFAULT_PROD_API_URL = 'https://codesentry-api-bv5j37b5tq-uc.a.run.app'
const AUTH_TOKEN_KEY = 'codesentry_auth_token'
const isBrowser = typeof window !== 'undefined'
const isLocalHost =
  isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
const API_BASE_URL =
  import.meta.env.VITE_API_URL || (isLocalHost ? DEFAULT_LOCAL_API_URL : DEFAULT_PROD_API_URL)
const ANALYSIS_BASE_URL = import.meta.env.VITE_ANALYSIS_SERVICE_URL || API_BASE_URL

const mapFindingToLegacyVulnerability = (finding) => ({
  type: finding.category || 'security',
  severity: finding.severity || 'low',
  title: finding.title || finding.rule_id || 'Security finding',
  description: finding.description || finding.evidence || '',
  line: finding.line_start || 1,
  code_snippet: finding.code_snippet || '',
  recommendation: finding.remediation || '',
  confidence: finding.confidence || 0
})

const normalizeAnalyzePrResponse = (raw, payload) => {
  const findings = raw.findings || []
  const severityCounts = findings.reduce(
    (acc, finding) => {
      const severity = String(finding.severity || '').toLowerCase()
      if (severity === 'critical') acc.critical += 1
      else if (severity === 'high') acc.high += 1
      else if (severity === 'medium') acc.medium += 1
      else acc.low += 1
      return acc
    },
    { critical: 0, high: 0, medium: 0, low: 0 }
  )

  return {
    analysis_id: `${raw.commit_sha || 'playground'}:${raw.pull_request_number || 0}`,
    timestamp: new Date().toISOString(),
    vulnerabilities: findings.map(mapFindingToLegacyVulnerability),
    total_vulnerabilities: findings.length,
    critical_count: severityCounts.critical,
    high_count: severityCounts.high,
    medium_count: severityCounts.medium,
    low_count: severityCounts.low,
    style_issues: [],
    total_style_issues: 0,
    style_categories: {},
    status: 'completed',
    language: payload.language || 'unknown'
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

const getStoredAuthToken = () => {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(AUTH_TOKEN_KEY)
}

export const setAuthToken = (token) => {
  if (typeof window === 'undefined') return
  if (!token) {
    window.localStorage.removeItem(AUTH_TOKEN_KEY)
    return
  }
  window.localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export const clearAuthToken = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
}

api.interceptors.request.use((config) => {
  const token = getStoredAuthToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error?.response?.status === 401 &&
      (window.location.pathname.startsWith('/app') || window.location.pathname.startsWith('/dashboard'))
    ) {
      clearAuthToken()
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
    const { data } = await api.get('/auth/me', {
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache'
      }
    })
    return data
  },
  logout: async () => {
    await api.post('/auth/logout')
    clearAuthToken()
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
      return normalizeAnalyzePrResponse(fallback.data, payload)
    }
  }
}

export const webhookAPI = {
  getEvents: async (limit = 50, offset = 0) => {
    const q = new URLSearchParams({ limit: String(limit), offset: String(offset) }).toString()
    const { data } = await api.get(`/api/webhooks/events?${q}`)
    return data
  }
}

export default api
