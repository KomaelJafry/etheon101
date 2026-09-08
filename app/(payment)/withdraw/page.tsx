'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Destination {
  id: string
  full_name: string
  bank_account: string
}

export default function WithdrawPage() {
  const [amount, setAmount] = useState<number | string>('')
  const [destinationId, setDestinationId] = useState<string>('')
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/signin')
        return
      }

      setUser(user)

      try {
        // Fetch profile balance
        const { data: profileData } = await supabase
          .from('profiles')
          .select('gbp_balance')
          .eq('id', user.id)
          .single()

        if (profileData) {
          setBalance(profileData.gbp_balance)
        }

        // Fetch withdrawal destinations
        const { data: destData } = await supabase
          .from('withdrawal_destinations')
          .select('id, full_name, bank_account')
          .eq('user_id', user.id)
          .eq('status', 'active')

        if (destData) {
          setDestinations(destData)
          if (destData.length > 0) {
            setDestinationId(destData[0].id)
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      }
    }

    fetchData()
  }, [supabase, router])

  const validateAmount = (value: number): string | null => {
    if (value <= 0) return 'Amount must be greater than 0'
    if (value > balance) return 'Insufficient balance'
    if (value > 10000) return 'Maximum withdrawal is £10,000'
    return null
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const withdrawAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    const validationError = validateAmount(withdrawAmount)

    if (validationError) {
      setError(validationError)
      return
    }

    if (!destinationId) {
      setError('Please select a destination')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/user/gbp-withdrawal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.id}`,
        },
        body: JSON.stringify({
          amount_gbp: withdrawAmount,
          destination_id: destinationId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process withdrawal')
      }

      setSuccess(true)
      setAmount('')
      setDestinationId('')

      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process withdrawal')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Withdrawal Submitted</h2>
            <p className="text-slate-600 mb-6">
              Your withdrawal request has been submitted and is pending admin approval. You'll receive a
              confirmation email once it's processed.
            </p>
            <Link href="/dashboard" className="text-blue-600 hover:underline font-medium">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
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
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Withdraw GBP</h1>
            <p className="text-slate-600">Transfer GBP to your bank account</p>
          </div>

          {/* Balance Display */}
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-900 text-sm mb-1">Available Balance</p>
            <p className="text-3xl font-bold text-blue-600">£{balance.toFixed(2)}</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleWithdraw} className="space-y-6">
            {/* Destination Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Destination Bank Account
              </label>

              {destinations.length > 0 ? (
                <div className="space-y-2">
                  {destinations.map((dest) => (
                    <label key={dest.id} className="flex items-center p-3 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        name="destination"
                        value={dest.id}
                        checked={destinationId === dest.id}
                        onChange={(e) => setDestinationId(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div className="ml-4">
                        <p className="font-medium text-slate-900">{dest.full_name}</p>
                        <p className="text-slate-600 text-sm">
                          {dest.bank_account.substring(0, 4)}
                          {'*'.repeat(Math.max(0, dest.bank_account.length - 8))}
                          {dest.bank_account.substring(Math.max(0, dest.bank_account.length - 4))}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-900 text-sm">
                    No bank accounts configured.{' '}
                    <Link href="/dashboard/account" className="underline font-medium">
                      Add one here
                    </Link>
                  </p>
                </div>
              )}
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Withdrawal Amount (£)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-600">£</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value ? parseFloat(e.target.value) : '')}
                  placeholder="0.00"
                  min="0.01"
                  max={balance}
                  step="0.01"
                  className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <p className="text-slate-600 text-sm mt-2">
                Available: £{balance.toFixed(2)}
              </p>
            </div>

            {/* Summary */}
            {amount && (
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Withdrawal Amount:</span>
                    <span className="font-semibold text-slate-900">
                      £{(typeof amount === 'string' ? parseFloat(amount) || 0 : amount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Processing Fee:</span>
                    <span className="font-semibold text-slate-900">£0.00</span>
                  </div>
                  <div className="border-t border-slate-300 pt-2 flex justify-between">
                    <span className="text-slate-900 font-semibold">Amount to Receive:</span>
                    <span className="text-lg font-bold text-green-600">
                      £{(typeof amount === 'string' ? parseFloat(amount) || 0 : amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-900">
              <p>
                Withdrawals are processed within 1-2 business days via SEPA transfer. Your request will be
                reviewed by our team before processing.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !amount || !destinationId || destinations.length === 0}
              className="w-full py-3 px-4 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition disabled:bg-orange-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Submit Withdrawal Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
