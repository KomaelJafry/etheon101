'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'

interface Profile {
  id: string
  gbp_balance: number
  email: string
}

interface Transaction {
  id: string
  type: string
  amount_gbp: number
  status: string
  created_at: string
}

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileData) {
          setProfile(profileData)
        }

        // Fetch recent transactions
        const { data: transactionData } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (transactionData) {
          setTransactions(transactionData)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase])

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-slate-600">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900">Welcome back!</h1>
        <p className="text-slate-600 mt-2">Manage your account and transactions</p>
      </div>

      {/* Balance Card */}
      {profile && (
        <div className="mb-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-lg p-8 text-white">
          <p className="text-blue-100 text-sm font-medium mb-2">Available Balance</p>
          <h2 className="text-5xl font-bold mb-2">£{profile.gbp_balance.toFixed(2)}</h2>
          <p className="text-blue-100">GBP Account</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Deposit Button */}
        <Link
          href="/deposit"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition border-l-4 border-green-500"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Deposit</h3>
              <p className="text-slate-600 text-sm">Add GBP to account</p>
            </div>
          </div>
        </Link>

        {/* Withdraw Button */}
        <Link
          href="/withdraw"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition border-l-4 border-orange-500"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-orange-100 p-3 rounded-lg">
              <svg
                className="w-6 h-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Withdraw</h3>
              <p className="text-slate-600 text-sm">Transfer to bank</p>
            </div>
          </div>
        </Link>

        {/* Subscription Button */}
        <Link
          href="/dashboard/subscription"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition border-l-4 border-purple-500"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Subscription</h3>
              <p className="text-slate-600 text-sm">Manage plan</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Recent Transactions</h2>
            <Link href="/dashboard/transactions" className="text-blue-600 hover:underline text-sm">
              View all
            </Link>
          </div>
        </div>

        {transactions.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {transactions.map((txn) => (
              <div key={txn.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <p className="font-medium text-slate-900 capitalize">{txn.type}</p>
                  <p className="text-slate-600 text-sm">
                    {new Date(txn.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">
                    {txn.type === 'withdrawal' ? '-' : '+'}£{txn.amount_gbp.toFixed(2)}
                  </p>
                  <p className={`text-sm ${
                    txn.status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {txn.status === 'completed' ? '✓ Completed' : '⏳ Pending'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-slate-600">
            <p>No transactions yet</p>
          </div>
        )}
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* Security Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <svg
              className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Secure Account</h3>
              <p className="text-blue-800 text-sm">
                Your account is protected with industry-standard encryption and authentication.
              </p>
            </div>
          </div>
        </div>

        {/* Support Info */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <svg
              className="w-6 h-6 text-green-600 flex-shrink-0 mt-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.172l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5-4a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <div>
              <h3 className="font-semibold text-green-900 mb-1">Need Help?</h3>
              <p className="text-green-800 text-sm">
                <a href="mailto:support@etheon.site" className="underline">
                  Contact our support team
                </a>
                {' '}for any questions or issues.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
