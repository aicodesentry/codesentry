import { useState } from 'react'

const SupportPage = () => {
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
  })
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    // Handle form submission
    setSubmitSuccess(true)
    setFormData({ subject: '', message: '' })
    // Hide success message after 5 seconds
    setTimeout(() => setSubmitSuccess(false), 5000)
  }

  const faqs = [
    {
      question: 'How do I connect a repository?',
      answer: 'Go to the Repositories page and click the "Connect" button next to any of your repositories. The AI will automatically start analyzing pull requests.'
    },
    {
      question: 'What languages are supported?',
      answer: 'We support repositories in any language. CodeSentry analyzes pull request diffs for security vulnerabilities regardless of the tech stack.'
    },
    {
      question: 'How does the AI analysis work?',
      answer: 'Our AI analyzes your code for security vulnerabilities including injection, secrets, auth bypass, path traversal, and more. Each finding is mapped to a CWE ID. It provides detailed feedback directly in your pull requests.'
    },
    {
      question: 'Can I customize the analysis rules?',
      answer: 'Yes! Pro and Enterprise plans allow you to customize analysis rules and create custom checks specific to your coding standards.'
    },
  ]

  return (
    <div>
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6 mb-6 transition-colors">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Support Center</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Get help and find answers to common questions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Form */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6 transition-colors">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Contact Support</h3>
          {submitSuccess && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-green-800 dark:text-green-400">
                Support request submitted! We will get back to you soon.
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Brief description of your issue"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Message
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows="6"
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Describe your issue in detail..."
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-sky-500 text-white rounded-lg font-semibold hover:bg-sky-600 transition-colors"
            >
              Submit Request
            </button>
          </form>
        </div>

        {/* Quick Links */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6 transition-colors">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quick Links</h3>
            <div className="space-y-3">
              <a href="#" className="flex items-center gap-3 text-sky-500 dark:text-sky-400 hover:underline">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Documentation
              </a>
              <a href="#" className="flex items-center gap-3 text-sky-500 dark:text-sky-400 hover:underline">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Video Tutorials
              </a>
              <a href="#" className="flex items-center gap-3 text-sky-500 dark:text-sky-400 hover:underline">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Community Forum
              </a>
              <a href="#" className="flex items-center gap-3 text-sky-500 dark:text-sky-400 hover:underline">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Support
              </a>
            </div>
          </div>

          <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl p-6 transition-colors">
            <h3 className="text-lg font-semibold text-sky-900 dark:text-sky-300 mb-2">
              Need immediate help?
            </h3>
            <p className="text-sky-800 dark:text-sky-400 mb-4">
              Our support team is available 24/7 for Pro and Enterprise customers.
            </p>
            <button className="w-full py-2 px-4 bg-sky-500 text-white rounded-lg font-semibold hover:bg-sky-600 transition-colors">
              Upgrade for Priority Support
            </button>
          </div>
        </div>
      </div>

      {/* FAQs */}
      <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow p-6 transition-colors">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Frequently Asked Questions</h3>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-slate-200 dark:border-slate-700 pb-4 last:border-0">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {faq.question}
              </h4>
              <p className="text-slate-600 dark:text-slate-400">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SupportPage

