const CodePreview = () => {
  return (
    <div className="relative w-full max-w-md">
      {/* Code Editor Mockup */}
      <div className="bg-gray-900 rounded-lg shadow-2xl overflow-hidden">
        {/* Window Controls */}
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" aria-hidden="true"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500" aria-hidden="true"></div>
            <div className="w-3 h-3 rounded-full bg-green-500" aria-hidden="true"></div>
          </div>
          <span className="text-gray-400 text-sm ml-2">app.py</span>
        </div>

        {/* Code Content */}
        <div className="p-4 font-mono text-sm" role="img" aria-label="Code example with security scan">
          <div className="text-gray-500">1</div>
          <div className="text-purple-400">def <span className="text-blue-400">analyze_code</span>():</div>
          <div className="text-gray-500">2</div>
          <div className="ml-4 text-gray-300">result = <span className="text-green-400">{'"Clean"'}</span></div>
          <div className="text-gray-500">3</div>
          <div className="ml-4 text-purple-400">return <span className="text-gray-300">result</span></div>
          <div className="text-gray-500 mt-2">4</div>

          {/* Success Badge */}
          <div className="mt-2 p-2 bg-green-900/30 border-l-4 border-green-500 rounded">
            <div className="flex items-start gap-2">
              <svg
                className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-400 text-xs">No vulnerabilities detected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Success Badge */}
      <div className="absolute -bottom-4 -right-4 bg-white rounded-full p-3 shadow-xl" aria-hidden="true">
        <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </div>
  )
}

export default CodePreview
