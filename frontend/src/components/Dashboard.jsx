import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_SERVICE_URL

const Dashboard = () => {
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: 0
  })

  const updateStats = (analysesData) => {
    const totalStats = analysesData.reduce((acc, pr) => ({
      critical: acc.critical + pr.severity_counts.critical,
      high: acc.high + pr.severity_counts.high,
      medium: acc.medium + pr.severity_counts.medium,
      low: acc.low + pr.severity_counts.low,
      total: acc.total + pr.total_vulnerabilities
    }), { critical: 0, high: 0, medium: 0, low: 0, total: 0 });
    setStats(totalStats);
  };

  const fetchAnalyses = useCallback(async (isBackgroundFetch = false) => {
    try {
      if (!isBackgroundFetch) {
        setLoading(true);
      }
      // Fetch a smaller, more relevant set of recent analyses
      const response = await axios.get(`${API_URL}/api/analysis/history?limit=20`, {
        withCredentials: true
      });

      const analysesData = response.data.analyses || [];

      // Group by PR (repository + pr_number)
      const prMap = new Map();

      analysesData.forEach(analysis => {
        if (analysis.repository === 'playground') return;

        const prKey = `${analysis.repository}#${analysis.pr_number}`;

        if (!prMap.has(prKey)) {
          prMap.set(prKey, {
            repository: analysis.repository,
            pr_number: analysis.pr_number,
            timestamp: analysis.timestamp,
            files_count: 0,
            total_vulnerabilities: 0,
            severity_counts: { critical: 0, high: 0, medium: 0, low: 0 }
          });
        }

        const pr = prMap.get(prKey);
        pr.files_count++;
        pr.total_vulnerabilities += (analysis.total_vulnerabilities || 0);

        const counts = analysis.severity_counts || {};
        pr.severity_counts.critical += (counts.critical || 0);
        pr.severity_counts.high += (counts.high || 0);
        pr.severity_counts.medium += (counts.medium || 0);
        pr.severity_counts.low += (counts.low || 0);
      });

      const groupedPRs = Array.from(prMap.values())
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10); // Display the top 10 most recent PRs

      setAnalyses(groupedPRs);
      updateStats(groupedPRs);

      // Cache the new results
      try {
        localStorage.setItem('prAnalysesCache', JSON.stringify(groupedPRs));
      } catch (e) {
        console.error('Failed to cache analyses:', e);
      }

    } catch (error) {
      console.error('Failed to fetch analyses:', error);
    } finally {
      if (!isBackgroundFetch) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const loadAnalyses = async () => {
      try {
        setLoading(true)
        const cachedAnalyses = localStorage.getItem('prAnalysesCache')
        if (cachedAnalyses) {
          const parsedAnalyses = JSON.parse(cachedAnalyses)
          setAnalyses(parsedAnalyses)
          updateStats(parsedAnalyses)
        }
      } catch (error) {
        console.error('Failed to load cached analyses:', error)
        localStorage.removeItem('prAnalysesCache')
      } finally {
        setLoading(false)
        await fetchAnalyses(true)
      }
    }

    loadAnalyses()
  }, [fetchAnalyses])

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div>
      {/* Severity Count Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.critical}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{stats.high}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Medium</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.medium}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.low}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Recent PR Analyses */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Pull Request Analyses</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-sm text-gray-500">Loading analyses...</p>
          </div>
        ) : analyses.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-4 text-sm font-medium text-gray-900">No analyses yet</h3>
            <p className="mt-2 text-sm text-gray-500">Pull request analyses will appear here once your repositories are connected.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Repository</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PR #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Files</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Critical</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">High</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medium</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Low</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analyses.map((pr) => (
                  <tr key={`${pr.repository}-${pr.pr_number}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {pr.repository}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      #{pr.pr_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pr.files_count} file{pr.files_count !== 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(pr.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                      {pr.severity_counts.critical || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-orange-600">
                      {pr.severity_counts.high || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-yellow-600">
                      {pr.severity_counts.medium || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                      {pr.severity_counts.low || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
