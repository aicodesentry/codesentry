import { useState, useEffect, useCallback } from 'react';
import { webhookAPI } from '../services/api';
import axios from 'axios';

const ANALYSIS_SERVICE_URL = import.meta.env.VITE_ANALYSIS_SERVICE_URL;

const WebhookEventViewer = () => {
  const [prData, setPrData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  const fetchPRData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Check cache first (1 minute cache)
      const CACHE_KEY = 'pr_analysis_cache';
      const CACHE_DURATION = 1 * 60 * 1000; // 1 minute
      const cached = localStorage.getItem(CACHE_KEY);

      let analysisData = null;

      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          console.log('Using cached analysis data');
          analysisData = { data };
        }
      }

      // Fetch webhook events
      const webhookData = await webhookAPI.getEvents(50, 0);

      // Fetch analysis data if not cached
      if (!analysisData) {
        try {
          analysisData = await axios.get(`${ANALYSIS_SERVICE_URL}/api/analysis/history?limit=50`);
          // Cache the response
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: analysisData.data,
            timestamp: Date.now()
          }));
          console.log('Fetched and cached fresh analysis data');
        } catch (err) {
          console.warn('Analysis API unavailable, using fallback:', err.message);
          analysisData = { data: { analyses: [] } };
        }
      }

      const events = webhookData.events || [];
      const analyses = analysisData.data.analyses || [];

      console.log(`[DEBUG] Fetched ${events.length} webhook events and ${analyses.length} analyses`);

      // Group analyses by PR
      const analysisMap = new Map();
      analyses.forEach(analysis => {
        if (analysis.repository === 'playground') return;
        const key = `${analysis.repository}#${analysis.pr_number}`;
        console.log(`[DEBUG] Analysis key: ${key}, vulnerabilities: ${analysis.total_vulnerabilities}`);

        if (!analysisMap.has(key)) {
          analysisMap.set(key, {
            total_issues: 0,
            highest_severity: 'low',
            severity_counts: { critical: 0, high: 0, medium: 0, low: 0 }
          });
        }

        const data = analysisMap.get(key);
        data.total_issues += (analysis.total_vulnerabilities || 0);

        const counts = analysis.severity_counts || {};
        data.severity_counts.critical += (counts.critical || 0);
        data.severity_counts.high += (counts.high || 0);
        data.severity_counts.medium += (counts.medium || 0);
        data.severity_counts.low += (counts.low || 0);

        if (data.severity_counts.critical > 0) data.highest_severity = 'critical';
        else if (data.severity_counts.high > 0) data.highest_severity = 'high';
        else if (data.severity_counts.medium > 0) data.highest_severity = 'medium';
      });

      // Combine webhook events with analysis data
      const combined = events.map(event => {
        const key = `${event.repository_name}#${event.pr_number}`;
        const analysis = analysisMap.get(key) || {
          total_issues: 0,
          highest_severity: 'low',
          severity_counts: { critical: 0, high: 0, medium: 0, low: 0 }
        };
        console.log(`[DEBUG] Event key: ${key}, matched analysis:`, analysis.total_issues > 0 ? 'YES' : 'NO', 'counts:', analysis.severity_counts);

        return {
          id: event.id,
          repository: event.repository_name,
          branch: event.branch_name || 'main',
          author: event.sender_username,
          pr_number: event.pr_number,
          pr_url: event.pr_url,
          issues_found: analysis.total_issues,
          severity: analysis.highest_severity,
          severity_counts: analysis.severity_counts,
          status: event.action === 'closed' ? 'Closed' : event.action === 'opened' ? 'Waiting for review' : 'In progress',
          timestamp: event.received_at
        };
      });

      // Paginate the data
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedData = combined.slice(startIndex, endIndex);

      setPrData(paginatedData);
      setTotalCount(combined.length);
      setError(null);
    } catch (err) {
      setError('Failed to load PR data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchPRData();
  }, [fetchPRData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.removeItem('pr_analysis_cache');
      fetchPRData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchPRData]);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
        <div className="px-7 py-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Recent Pull Requests
          </h3>
        </div>
        <div className="p-7">
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
        <div className="px-7 py-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Recent Pull Requests
          </h3>
        </div>
        <div className="p-7">
          <div className="text-center py-8 text-red-600 dark:text-red-400">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
      <div className="px-7 py-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Recent Pull Requests
          </h3>
          {totalCount > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
            </p>
          )}
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('pr_analysis_cache');
            setCurrentPage(1);
            fetchPRData();
          }}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
        >
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto">
        {prData.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No pull requests yet. Create a PR to see it here.
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Repo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Author</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Vulnerabilities</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {prData.map((pr) => (
                <tr key={pr.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => window.open(pr.pr_url, '_blank')}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{pr.repository}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">PR #{pr.pr_number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {pr.branch}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <img
                        src={`https://github.com/${pr.author}.png?size=32`}
                        alt={pr.author}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">{pr.author}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-2">
                      {pr.severity_counts.critical > 0 && (
                        <div className="inline-flex items-center rounded overflow-hidden text-xs font-medium">
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">Critical</span>
                          <span className="px-2 py-1 bg-red-600 dark:bg-red-700 text-white">{pr.severity_counts.critical}</span>
                        </div>
                      )}
                      {pr.severity_counts.high > 0 && (
                        <div className="inline-flex items-center rounded overflow-hidden text-xs font-medium">
                          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">High</span>
                          <span className="px-2 py-1 bg-orange-600 dark:bg-orange-700 text-white">{pr.severity_counts.high}</span>
                        </div>
                      )}
                      {pr.severity_counts.medium > 0 && (
                        <div className="inline-flex items-center rounded overflow-hidden text-xs font-medium">
                          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">Medium</span>
                          <span className="px-2 py-1 bg-yellow-600 dark:bg-yellow-700 text-white">{pr.severity_counts.medium}</span>
                        </div>
                      )}
                      {pr.severity_counts.low > 0 && (
                        <div className="inline-flex items-center rounded overflow-hidden text-xs font-medium">
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">Low</span>
                          <span className="px-2 py-1 bg-blue-600 dark:bg-blue-700 text-white">{pr.severity_counts.low}</span>
                        </div>
                      )}
                      {pr.issues_found === 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">No issues</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      pr.status === 'Closed' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400' :
                      pr.status === 'Waiting for review' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400' :
                      'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                    }`}>
                      {pr.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatTimestamp(pr.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {totalCount > itemsPerPage && (
        <div className="px-7 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Page {currentPage} of {Math.ceil(totalCount / itemsPerPage)}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / itemsPerPage), prev + 1))}
              disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebhookEventViewer;
