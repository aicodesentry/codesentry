const SubscriptionPage = () => {
  return (
    <div>
      {/* Current Plan */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-6 transition-colors">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Current Plan</h2>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-sky-500 dark:text-sky-400">Free Plan</h3>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Perfect for getting started with PR security reviews
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-900 dark:text-white">$0</p>
            <p className="text-slate-500 dark:text-slate-400">per month</p>
          </div>
        </div>
      </div>

      {/* Pricing Plans */}
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Upgrade Your Plan</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Free Plan */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border-2 border-slate-200 dark:border-slate-700 transition-colors">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Free</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">For individual developers</p>
          <p className="text-4xl font-bold text-slate-900 dark:text-white mb-6">
            $0<span className="text-lg text-slate-500 dark:text-slate-400">/mo</span>
          </p>
          <ul className="space-y-3 mb-6">
            <li className="flex items-center text-slate-700 dark:text-slate-300">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Up to 3 repositories
            </li>
            <li className="flex items-center text-slate-700 dark:text-slate-300">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Basic AI analysis
            </li>
            <li className="flex items-center text-slate-700 dark:text-slate-300">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Community support
            </li>
          </ul>
          <button className="w-full py-2 px-4 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Current Plan
          </button>
        </div>

        {/* Pro Plan */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border-2 border-sky-500 dark:border-sky-400 relative transition-colors">
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <span className="bg-sky-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
              Popular
            </span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Pro</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">For professional developers</p>
          <p className="text-4xl font-bold text-slate-900 dark:text-white mb-6">
            $29<span className="text-lg text-slate-500 dark:text-slate-400">/mo</span>
          </p>
          <ul className="space-y-3 mb-6">
            <li className="flex items-center text-slate-700 dark:text-slate-300">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Unlimited repositories
            </li>
            <li className="flex items-center text-slate-700 dark:text-slate-300">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Advanced AI analysis
            </li>
            <li className="flex items-center text-slate-700 dark:text-slate-300">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Priority support
            </li>
            <li className="flex items-center text-slate-700 dark:text-slate-300">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Custom integrations
            </li>
          </ul>
          <button className="w-full py-2 px-4 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 transition-colors">
            Upgrade to Pro
          </button>
        </div>

        {/* Enterprise Plan */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border-2 border-slate-200 dark:border-slate-700 transition-colors">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Enterprise</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">For teams and organizations</p>
          <p className="text-4xl font-bold text-slate-900 dark:text-white mb-6">
            Custom
          </p>
          <ul className="space-y-3 mb-6">
            <li className="flex items-center text-slate-700 dark:text-slate-300">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Everything in Pro
            </li>
            <li className="flex items-center text-slate-700 dark:text-slate-300">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Team management
            </li>
            <li className="flex items-center text-slate-700 dark:text-slate-300">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Dedicated support
            </li>
            <li className="flex items-center text-slate-700 dark:text-slate-300">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              SLA guarantee
            </li>
          </ul>
          <button className="w-full py-2 px-4 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Contact Sales
          </button>
        </div>
      </div>
    </div>
  )
}

export default SubscriptionPage

