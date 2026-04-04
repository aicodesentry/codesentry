import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'

const SubscriptionPage = () => {
  return (
    <div>
      {/* Current Plan */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">Free Plan</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                Perfect for getting started with PR security reviews
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-neutral-900 dark:text-white">$0</p>
              <p className="text-neutral-500 dark:text-neutral-400">per month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">Upgrade Your Plan</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Free Plan */}
        <Card className="border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Free</CardTitle>
            <p className="text-neutral-600 dark:text-neutral-400">For individual developers</p>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-neutral-900 dark:text-white mb-6">
              $0<span className="text-lg text-neutral-500 dark:text-neutral-400">/mo</span>
            </p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center text-neutral-700 dark:text-neutral-300">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Up to 3 repositories
              </li>
              <li className="flex items-center text-neutral-700 dark:text-neutral-300">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Basic AI analysis
              </li>
              <li className="flex items-center text-neutral-700 dark:text-neutral-300">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Community support
              </li>
            </ul>
            <Button variant="outline" className="w-full">
              Current Plan
            </Button>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className="border-neutral-900 dark:border-white relative">
          <div className="absolute -top-4 left-1/2 transform -tranneutral-x-1/2">
            <Badge className="bg-neutral-900 text-white px-4 py-1">
              Popular
            </Badge>
          </div>
          <CardHeader>
            <CardTitle className="text-xl font-bold">Pro</CardTitle>
            <p className="text-neutral-600 dark:text-neutral-400">For professional developers</p>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-neutral-900 dark:text-white mb-6">
              $29<span className="text-lg text-neutral-500 dark:text-neutral-400">/mo</span>
            </p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center text-neutral-700 dark:text-neutral-300">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Unlimited repositories
              </li>
              <li className="flex items-center text-neutral-700 dark:text-neutral-300">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Advanced AI analysis
              </li>
              <li className="flex items-center text-neutral-700 dark:text-neutral-300">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Priority support
              </li>
              <li className="flex items-center text-neutral-700 dark:text-neutral-300">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Custom integrations
              </li>
            </ul>
            <Button variant="primary" className="w-full">
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>

        {/* Enterprise Plan */}
        <Card className="border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Enterprise</CardTitle>
            <p className="text-neutral-600 dark:text-neutral-400">For teams and organizations</p>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-neutral-900 dark:text-white mb-6">
              Custom
            </p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center text-neutral-700 dark:text-neutral-300">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Everything in Pro
              </li>
              <li className="flex items-center text-neutral-700 dark:text-neutral-300">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Team management
              </li>
              <li className="flex items-center text-neutral-700 dark:text-neutral-300">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Dedicated support
              </li>
              <li className="flex items-center text-neutral-700 dark:text-neutral-300">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                SLA guarantee
              </li>
            </ul>
            <Button variant="outline" className="w-full">
              Contact Sales
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SubscriptionPage
