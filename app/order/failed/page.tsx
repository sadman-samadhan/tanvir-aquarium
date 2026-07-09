import React from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, ShoppingBag } from 'lucide-react'

interface FailedProps {
  searchParams: Promise<{ order_id?: string; reason?: string }>
}

export default async function OrderFailedPage({ searchParams }: FailedProps) {
  const { order_id, reason } = await searchParams

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <main className="flex-grow flex items-center justify-center p-4 py-16">
        <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 p-8 shadow-md text-center space-y-6">
          
          <div className="flex justify-center">
            <AlertTriangle className="h-16 w-16 text-red-600 bg-red-50 rounded-full p-1.5" />
          </div>
          
          <div>
            <h1 className="text-2xl font-extrabold text-slate-950">Payment Failed or Cancelled</h1>
            <p className="mt-1.5 text-sm text-slate-500">We could not process your bKash payment transaction.</p>
          </div>

          <div className="rounded-lg bg-red-50 border border-red-100 p-4 text-left text-xs text-red-800 space-y-1.5">
            <span className="font-bold">Transaction details:</span>
            {order_id && <p>Order Reference: <span className="font-semibold font-mono">{order_id}</span></p>}
            <p>Reason: <span className="font-semibold capitalize">{reason || 'User cancelled or gateway timeout'}</span></p>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            If payment was deducted from your bKash account but your order was not confirmed, 
            please contact our support team with your order reference.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/checkout"
              className="flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Checkout Again
            </Link>
            <Link
              href="/"
              className="flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <ShoppingBag className="h-4 w-4" />
              Store Catalog
            </Link>
          </div>

        </div>
      </main>
    </div>
  )
}
