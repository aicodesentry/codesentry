import { useState, useEffect } from 'react';
import { analysisAPI } from '../services/api';

const CodeAnalysisTest = () => {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [serviceHealth, setServiceHealth] = useState(null);
  const [usageCount, setUsageCount] = useState(0);
  const [remainingUses, setRemainingUses] = useState(5);

  const MAX_DAILY_USES = 5;

  // Check and update daily usage limit
  const checkDailyLimit = () => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem('code_analysis_usage');

    if (stored) {
      const { date, count } = JSON.parse(stored);
      if (date === today) {
        setUsageCount(count);
        setRemainingUses(Math.max(0, MAX_DAILY_USES - count));
        return count < MAX_DAILY_USES;
      }
    }

    // New day or first time
    localStorage.setItem('code_analysis_usage', JSON.stringify({ date: today, count: 0 }));
    setUsageCount(0);
    setRemainingUses(MAX_DAILY_USES);
    return true;
  };

  const incrementUsage = () => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem('code_analysis_usage');
    const { count } = stored ? JSON.parse(stored) : { count: 0 };
    const newCount = count + 1;

    localStorage.setItem('code_analysis_usage', JSON.stringify({ date: today, count: newCount }));
    setUsageCount(newCount);
    setRemainingUses(Math.max(0, MAX_DAILY_USES - newCount));
  };

  // Check service health on mount
  useEffect(() => {
    checkHealth();
    checkDailyLimit();
    loadHistory();
  }, []);

  const checkHealth = async () => {
    try {
      const health = await analysisAPI.healthCheck();
      setServiceHealth(health);
    } catch (err) {
      console.error('Health check failed:', err);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await analysisAPI.getHistory(5);
      setHistory(data.analyses || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const analyzeCode = async () => {
    if (!code.trim()) {
      setError('Please enter some code to analyze');
      return;
    }

    // Check daily limit
    if (!checkDailyLimit()) {
      setError(`Daily limit reached. You've used all ${MAX_DAILY_USES} analyses for today. Please try again tomorrow!`);
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const analysisResult = await analysisAPI.analyzeCode({
        code: code,
        language: language,
        repository: 'playground',
        file_path: `playground.${language === 'python' ? 'py' : language === 'javascript' ? 'js' : 'txt'}`,
      });

      setResult(analysisResult);
      incrementUsage(); // Increment after successful analysis
      loadHistory(); // Refresh history
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-sky-100 text-sky-800 border-sky-200',
      info: 'bg-neutral-100 text-neutral-800 border-neutral-200',
    };
    return colors[severity] || colors.info;
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🔵',
      info: '⚪',
    };
    return icons[severity] || '⚪';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Code Analysis Playground
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Paste your code and get instant AI-powered security analysis
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Usage Counter */}
          <div className={`px-4 py-2 rounded-lg border ${
            remainingUses > 2
              ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
              : remainingUses > 0
              ? 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400'
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
          }`}>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-sm">
                {remainingUses}/{MAX_DAILY_USES} analyses left today ({usageCount} used)
              </span>
            </div>
          </div>

          {/* Service Health Badge */}
          {serviceHealth && (
            <div className={`px-4 py-2 rounded-lg ${
              serviceHealth.status === 'ok'
                ? 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                : 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  serviceHealth.status === 'ok' ? 'bg-green-500' : 'bg-red-500'
                }`}></span>
                <span className="font-medium text-sm">Service {serviceHealth.status === 'ok' ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Code to Analyze
            </label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your code here..."
              className="w-full h-64 px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg 
                       bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono text-sm
                       focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Programming Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg 
                         bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white
                         focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="go">Go</option>
                <option value="php">PHP</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={analyzeCode}
                disabled={analyzing || !code.trim() || remainingUses === 0}
                className={`px-6 py-2 rounded-lg font-medium transition ${
                  analyzing || !code.trim() || remainingUses === 0
                    ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed dark:bg-neutral-700 dark:text-neutral-400'
                    : 'bg-sky-500 text-white hover:bg-sky-600'
                }`}
              >
                {analyzing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  'Analyze Code'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-red-600 dark:text-red-400 text-xl">⚠️</span>
            <p className="text-red-800 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
              Analysis Results
            </h2>
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                <span>Analysis ID: {result.analysis_id}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                <span>Security: {result.total_vulnerabilities} vulnerabilities</span>
                <span>•</span>
                <span className="flex items-center gap-2">
                  <span className="text-red-600">🔴 {result.critical_count}</span>
                  <span className="text-orange-600">🟠 {result.high_count}</span>
                  <span className="text-yellow-600">🟡 {result.medium_count}</span>
                  <span className="text-sky-500">🔵 {result.low_count}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Security Vulnerabilities Section */}
          {result.vulnerabilities.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-6xl mb-4 block">✅</span>
              <p className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                No Issues Detected!
              </p>
              <p className="text-neutral-600 dark:text-neutral-400">
                Your code looks secure and follows best practices.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Security Vulnerabilities */}
              {result.vulnerabilities.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">
                    Security Vulnerabilities
                  </h3>
                  <div className="space-y-4">
                    {result.vulnerabilities.map((vuln, index) => (
                      <div
                        key={index}
                        className={`border-l-4 rounded-lg p-4 ${getSeverityColor(vuln.severity)}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{getSeverityIcon(vuln.severity)}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-bold uppercase">{vuln.severity}</span>
                              <span>•</span>
                              <span className="font-medium">{vuln.type.replace(/_/g, ' ').toUpperCase()}</span>
                              <span>•</span>
                              <span className="text-sm">Line {vuln.line_number}</span>
                              <span>•</span>
                              <span className="text-sm">Confidence: {(vuln.confidence * 100).toFixed(0)}%</span>
                            </div>

                            <p className="text-sm mb-2">
                              <strong>Description:</strong> {vuln.description}
                            </p>

                            {vuln.code_snippet && (
                              <div className="bg-white/50 dark:bg-neutral-900/50 rounded p-2 mb-2">
                                <code className="text-xs font-mono">{vuln.code_snippet}</code>
                              </div>
                            )}

                            <p className="text-sm">
                              <strong>Recommendation:</strong> {vuln.recommendation}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* Analysis History */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow p-6">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">
            Recent Analysis History
          </h2>
          <div className="space-y-3">
            {history.map((item, index) => (
              <div
                key={index}
                className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {item.language} - {item.total_vulnerabilities} vulnerabilities
                    </p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.severity_counts && (
                      <>
                        {item.severity_counts.critical > 0 && (
                          <span className="text-red-600">🔴 {item.severity_counts.critical}</span>
                        )}
                        {item.severity_counts.high > 0 && (
                          <span className="text-orange-600">🟠 {item.severity_counts.high}</span>
                        )}
                        {item.severity_counts.medium > 0 && (
                          <span className="text-yellow-600">🟡 {item.severity_counts.medium}</span>
                        )}
                        {item.severity_counts.low > 0 && (
                          <span className="text-sky-500">🔵 {item.severity_counts.low}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeAnalysisTest;
