'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const DEPOSIT_AMOUNTS = [20, 50, 100, 250, 500, 1000]

export default function DepositPage() {
  const [amount, setAmount] = useState<number | string>('')
  const [customAmount, setCustomAmount] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) router.push('/signin')
      setUser(user)
    }
    checkAuth()
  }, [supabase, router])

  const validateAmount = (value: number): string | null => {
    if (value < 10) return 'Minimum deposit is £10'
    if (value > 10000) return 'Maximum deposit is £10,000'
    return null
  }

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const depositAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    const validationError = validateAmount(depositAmount)

    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      // Call deposit endpoint to create Stripe checkout
      const response = await fetch('/api/stripe/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.id}`,
        },
        body: JSON.stringify({
          amount_gbp: depositAmount,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create deposit')
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process deposit')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="mb-8">
            <Link href="/dashboard" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Deposit GBP</h1>
            <p className="text-slate-600">Add funds to your Etheon account via card payment</p>
          </div>

          {/* Info Box */}
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-900 text-sm">
              Deposits are processed instantly via Stripe. Your funds will be available once approved by our team.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleDeposit} className="space-y-6">
            {/* Quick Amount Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Select Amount
              </label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                {DEPOSIT_AMOUNTS.map((depositAmount) => (
                  <button
                    key={depositAmount}
                    type="button"
                    onClick={() => {
                      setAmount(depositAmount)
                      setCustomAmount(false)
                    }}
                    className={`py-3 px-4 rounded-lg font-semibold transition ${
                      amount === depositAmount && !customAmount
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    £{depositAmount}
                  </button>
                ))}
              </div>

              {/* Custom Amount */}
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => setCustomAmount(!customAmount)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition ${
                    customAmount ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  Other Amount
                </button>

                {customAmount && (
                  <div className="flex-1 flex items-center space-x-2">
                    <span className="text-slate-600">£</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder="Enter amount"
                      min="10"
                      max="10000"
                      step="0.01"
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Amount Summary */}
            {amount && (
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-600">Deposit Amount:</span>
                  <span className="text-2xl font-bold text-slate-900">
                    £{(typeof amount === 'string' ? parseFloat(amount) || 0 : amount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm text-slate-600 mb-3">
                  <span>Processing Fee:</span>
                  <span>Free</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-slate-300">
                  <span className="font-semibold text-slate-900">Total to Pay:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    £{(typeof amount === 'string' ? parseFloat(amount) || 0 : amount).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Terms */}
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
              <p>
                By proceeding, you agree to deposit GBP via Stripe. Your payment will be processed securely
                and your account will be credited upon approval.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !amount}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Continue to Payment'}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">Payment Powered by Stripe</span>
              </div>
            </div>

            {/* Security Info */}
            <div className="flex items-start space-x-3 text-sm text-slate-600">
              <svg
                className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 9.707a1 1 0 010-1.414L8.586 5a1 1 0 111.414 1.414L7.414 9l2.586 2.586a1 1 0 11-1.414 1.414L6 10.414l-2.293 2.293a1 1 0 11-1.414-1.414L4.586 9z"
                  clipRule="evenodd"
                />
              </svg>
              <p>Your payment information is encrypted and secure. No refunds after payment is processed.</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
