import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { ArrowUpRight, ClipboardList, Clock3, Filter, ShieldAlert, Sparkles } from 'lucide-react';
import { reportsAPI, repositoryAPI } from '../services/api';
import { EmptyPanel, PageHeader, PagePanel, PageStats } from '../components/PageSection';
import { Pagination } from '../components/ui/pagination';

// Lazy load modal for better performance
const PRAnalysisModal = lazy(() => import('../components/PRAnalysisModal'));

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for reports

const getCacheKey = (page, repo, status) => {
  // Use a stable key for the main, unfiltered view
  if (page === 1 && !repo && !status) {
    return 'reports_cache_main';
  }
  // Create a dynamic key for filtered or paginated views
  return `reports_cache_page_${page}_repo_${repo || 'all'}_status_${status || 'all'}`;
};

const ReportsPage = () => {
  const [analyses, setAnalyses] = useState([]);
  const [repositories, setRepositories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Filters
  const [selectedRepo, setSelectedRepo] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  const fetchData = useCallback(async (isBackgroundFetch = false) => {
    if (!isBackgroundFetch) {
      setLoading(true);
    }
    setError(null);
    
    const cacheKey = getCacheKey(currentPage, selectedRepo, selectedStatus);

    try {
      // Fetch analyses with filters and pagination
      const filters = {
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage
      };
      if (selectedRepo) filters.repository_id = selectedRepo;
      if (selectedStatus) filters.status = selectedStatus;

      // Use Promise.all to fetch data concurrently
      const [analysesData, summaryData, reposData] = await Promise.all([
        reportsAPI.getPRAnalyses(filters),
        reportsAPI.getSummary(), // Summary might not need to be fetched every time, but is quick
        repositoryAPI.getRepositories() // Same for repos
      ]);

      setAnalyses(analysesData.analyses);
      setTotalCount(analysesData.total || 0);
      setSummary(summaryData.summary);
      setRepositories(reposData.repositories);

      // Cache the fetched data
      localStorage.setItem(cacheKey, JSON.stringify({
        data: analysesData.analyses,
        total: analysesData.total || 0,
        repos: reposData.repositories,
        summaryData: summaryData.summary,
        timestamp: Date.now()
      }));

    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setError('Failed to load reports. Please try again.');
    } finally {
      if (!isBackgroundFetch) {
        setLoading(false);
      }
    }
  }, [currentPage, itemsPerPage, selectedRepo, selectedStatus]);

  useEffect(() => {
    const cacheKey = getCacheKey(currentPage, selectedRepo, selectedStatus);
    const cached = localStorage.getItem(cacheKey);

    let hasDisplayedCached = false;

    if (cached) {
      try {
        const { data, timestamp, total, repos, summaryData } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setAnalyses(data);
          setTotalCount(total);
          if (repos) setRepositories(repos);
          if (summaryData) setSummary(summaryData);
          setLoading(false);
          hasDisplayedCached = true;
        }
      } catch (e) {
        console.error("Failed to parse cache:", e);
        localStorage.removeItem(cacheKey); // Clear corrupted cache
      }
    }
    
    // Always fetch fresh data, either to initially populate or to update displayed cache
    fetchData(hasDisplayedCached);
  }, [currentPage, fetchData, selectedRepo, selectedStatus]);

  const handleViewDetails = async (analysis) => {
    try {
      const detailsData = await reportsAPI.getPRAnalysisDetails(analysis.id);
      setSelectedAnalysis(detailsData.analysis);
      setShowModal(true);
    } catch (err) {
      console.error('Failed to fetch analysis details:', err);
      alert('Failed to load analysis details');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      processing: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      received: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-400',
    };
    return badges[status] || badges.received;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Loading skeleton row
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Run History"
        title="See every PR analysis in one place"
        description="Reports should look like the dashboard control room, not a separate analytics product. Keep the pipeline visible, but make the interface feel like the rest of Mitig8it."
        actions={
          <a
            href="/dashboard/onboarding"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            Trigger first PR
            <ArrowUpRight className="h-4 w-4" />
          </a>
        }
      />

      {summary && (
        <PageStats
          items={[
            {
              label: 'Total Analyses',
              value: summary.total_analyses,
              meta: `${totalCount} visible in this view`,
              icon: <ClipboardList className="h-5 w-5 text-slate-600 dark:text-slate-300" />,
              iconWrapClassName: 'bg-slate-100 dark:bg-slate-800',
            },
            {
              label: 'Completed',
              value: summary.completed,
              meta: 'healthy pipeline',
              icon: <Sparkles className="h-5 w-5 text-slate-600 dark:text-slate-300" />,
              iconWrapClassName: 'bg-slate-100 dark:bg-slate-800',
            },
            {
              label: 'Failed',
              value: summary.failed,
              meta: 'needs review',
              icon: <ShieldAlert className="h-5 w-5 text-slate-600 dark:text-slate-300" />,
              iconWrapClassName: 'bg-slate-100 dark:bg-slate-800',
            },
            {
              label: 'Last 7 Days',
              value: summary.recent_7_days,
              meta: 'recent workload',
              icon: <Clock3 className="h-5 w-5 text-slate-600 dark:text-slate-300" />,
              iconWrapClassName: 'bg-slate-100 dark:bg-slate-800',
            },
          ]}
        />
      )}

      {error && (
        <PagePanel className="border-rose-500/40 bg-rose-950/30" contentClassName="p-5">
          <p className="text-sm font-medium text-rose-100">{error}</p>
        </PagePanel>
      )}

      <PagePanel
        title="Filters"
        description="Keep the controls visible, but make them feel like part of the same cockpit."
        action={
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 dark:border-slate-700 dark:text-slate-300">
            <Filter className="h-3.5 w-3.5" />
            Live filter
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Repository
            </label>
            <select
              value={selectedRepo}
              onChange={(e) => {
                setSelectedRepo(e.target.value);
                setCurrentPage(1); // Reset to page 1 when filter changes
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 transition-colors focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-slate-500"
            >
              <option value="">All Repositories</option>
              {repositories.filter((r) => r.is_active !== false).map(repo => (
                <option key={repo.github_id} value={repo.id}>
                  {repo.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1); // Reset to page 1 when filter changes
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 transition-colors focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-slate-500"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
              <option value="received">Received</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedRepo('');
                setSelectedStatus('');
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-900"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </PagePanel>

      <PagePanel
        title="Pull request analyses"
        description="Chronological analysis history with direct links back to GitHub."
        className="overflow-hidden"
        contentClassName="p-0"
      >
        <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Pull Request Analyses</h2>
            {totalCount > 0 && (
              <p className="text-sm text-slate-400">
                Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
              </p>
            )}
          </div>
        </div>

        {analyses.length === 0 ? (
          <div className="p-6">
            <EmptyPanel
              title="No analyses found"
              description="Connect a repository and open a pull request. This page becomes the operating log once the first scan lands."
              action={
                <a
                  href="/dashboard/repositories"
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  Open repositories
                </a>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Repository
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    PR Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Started
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950/20">
                {loading ? (
                  // Show skeleton rows while loading
                  Array.from({ length: itemsPerPage }).map((_, idx) => <SkeletonRow key={idx} />)
                ) : (
                  analyses.map((analysis) => (
                  <tr key={analysis.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/55">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {analysis.repository_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={analysis.pr_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-slate-700 hover:text-slate-900 hover:underline dark:text-slate-200 dark:hover:text-white"
                      >
                        #{analysis.pr_number}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(analysis.status)}`}>
                        {analysis.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {formatDate(analysis.started_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {formatDuration(analysis.processing_time_seconds)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleViewDetails(analysis)}
                        className="inline-flex items-center gap-1.5 font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
                      >
                        View Details
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalCount > itemsPerPage && (
          <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalCount / itemsPerPage)}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </PagePanel>

      {/* Analysis Details Modal */}
      {showModal && selectedAnalysis && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400">Loading details...</p>
            </div>
          </div>
        }>
          <PRAnalysisModal
            analysis={selectedAnalysis}
            onClose={() => {
              setShowModal(false);
              setSelectedAnalysis(null);
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export default ReportsPage;
