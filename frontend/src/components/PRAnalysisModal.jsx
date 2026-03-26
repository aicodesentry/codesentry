import { useState } from 'react';

const PRAnalysisModal = ({ analysis, onClose }) => {
  const [expandedItems, setExpandedItems] = useState({});

  if (!analysis) return null;

  const toggleExpanded = (key) => {
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const truncateText = (text, maxLength = 150) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    };
    return colors[severity] || colors.low;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Group issues by file
  const groupByFile = () => {
    const fileMap = {};

    // Add vulnerabilities
    if (analysis.vulnerabilities) {
      analysis.vulnerabilities.forEach(vuln => {
        const file = vuln.file_path || 'Unknown file';
        if (!fileMap[file]) {
          fileMap[file] = { vulnerabilities: [] };
        }
        fileMap[file].vulnerabilities.push(vuln);
      });
    }

    return fileMap;
  };

  const fileGroups = groupByFile();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              PR Analysis Details
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {analysis.repository_name} - PR #{analysis.pr_number}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={analysis.pr_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              View on GitHub
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white mt-1 capitalize">
                {analysis.status}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Started</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                {formatDate(analysis.started_at)}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                {formatDate(analysis.completed_at)}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Vulnerabilities</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {analysis.total_vulnerabilities || 0}
              </div>
            </div>
          </div>

          {/* Security Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Severity Breakdown */}
            {analysis.severity_counts && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Security Severity
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {analysis.severity_counts.critical}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Critical</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                      {analysis.severity_counts.high}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">High</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                      {analysis.severity_counts.medium}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Medium</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {analysis.severity_counts.low}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Low</div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Error Message */}
          {analysis.vulnerability_fetch_error && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
                    Unable to Load Analysis Details
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-500 mt-1">
                    {analysis.vulnerability_fetch_error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Files with Comments */}
          {Object.keys(fileGroups).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(fileGroups).map(([fileName, issues]) => (
                <div key={fileName} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  {/* File Header */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                        {fileName}
                      </h3>
                      <div className="flex items-center gap-3">
                        {issues.vulnerabilities.length > 0 && (
                          <span className="text-xs px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded">
                            {issues.vulnerabilities.length} Security
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Comments */}
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {/* Security Vulnerabilities - Show only top 2 */}
                    {issues.vulnerabilities.slice(0, 2).map((vuln, idx) => {
                      const vulnKey = `vuln-${fileName}-${idx}`;
                      const isExpanded = expandedItems[vulnKey];
                      const descriptionNeedsTruncation = vuln.description && vuln.description.length > 150;
                      const recommendationNeedsTruncation = vuln.recommendation && vuln.recommendation.length > 150;

                      return (
                        <div key={vulnKey} className="p-4 bg-white dark:bg-gray-800">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${getSeverityColor(vuln.severity)}`}>
                                {vuln.severity?.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                {vuln.type?.replace(/_/g, ' ').toUpperCase() || 'Security Issue'}
                                {vuln.line_number && (
                                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                    Line {vuln.line_number}
                                  </span>
                                )}
                              </div>

                              {/* Description */}
                              <div className="mb-3">
                                <strong className="text-sm text-gray-700 dark:text-gray-300">Description:</strong>
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {isExpanded || !descriptionNeedsTruncation
                                    ? vuln.description
                                    : truncateText(vuln.description)}
                                </div>
                                {descriptionNeedsTruncation && (
                                  <button
                                    onClick={() => toggleExpanded(vulnKey)}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
                                  >
                                    {isExpanded ? 'Show less' : 'Show more'}
                                  </button>
                                )}
                              </div>

                              {/* Code Snippet */}
                              {vuln.code_snippet && (
                                <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto mb-3">
                                  <code>{vuln.code_snippet}</code>
                                </pre>
                              )}

                              {/* Recommendation */}
                              <div className="mb-2">
                                <strong className="text-sm text-gray-700 dark:text-gray-300">💡 Recommendation:</strong>
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {isExpanded || !recommendationNeedsTruncation
                                    ? vuln.recommendation
                                    : truncateText(vuln.recommendation)}
                                </div>
                                {recommendationNeedsTruncation && !descriptionNeedsTruncation && (
                                  <button
                                    onClick={() => toggleExpanded(vulnKey)}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
                                  >
                                    {isExpanded ? 'Show less' : 'Show more'}
                                  </button>
                                )}
                              </div>

                              {/* Confidence */}
                              {vuln.confidence && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Confidence: {Math.round(vuln.confidence * 100)}%
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Show "View more" for vulnerabilities if there are more than 2 */}
                    {issues.vulnerabilities.length > 2 && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-700/30 text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          + {issues.vulnerabilities.length - 2} more {issues.vulnerabilities.length - 2 === 1 ? 'vulnerability' : 'vulnerabilities'}
                        </p>
                        <a
                          href={analysis.pr_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                        >
                          View full analysis on GitHub
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    )}

                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <svg className="mx-auto h-12 w-12 text-green-500 dark:text-green-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-green-900 dark:text-green-100">
                No Issues Found
              </h3>
              <p className="text-green-700 dark:text-green-300 mt-2">
                Great job! This PR passed all security checks.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <a
            href={analysis.pr_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            View PR on GitHub
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PRAnalysisModal;
