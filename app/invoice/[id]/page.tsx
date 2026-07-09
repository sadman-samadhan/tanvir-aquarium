import React from 'react'
import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/server'
import { Printer, ArrowLeft } from 'lucide-react'

interface InvoiceProps {
  params: Promise<{ id: string }>
}

export const revalidate = 0 // Disable cache for live invoice generation

export default async function InvoicePage({ params }: InvoiceProps) {
  const { id } = await params
  const supabase = createAdminClient()

  // Fetch order details
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg border border-slate-200 p-8 shadow-sm text-center">
          <p className="text-red-500 font-bold mb-4">Invoice Not Found</p>
          <p className="text-slate-500 text-sm mb-6">The requested order ID does not exist.</p>
          <Link href="/" className="inline-block bg-slate-900 text-white px-6 py-2 rounded text-xs font-semibold">
            Back to Catalog
          </Link>
        </div>
      </div>
    )
  }

  // Fetch order items with product details
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('*, products(name)')
    .eq('order_id', order.id)

  const date = new Date(order.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const subtotal = (orderItems || []).reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
  const codAmount = order.payment_method === 'COD' 
    ? Number(order.total_price) - Number(order.delivery_charge) 
    : 0

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-4 sm:p-8 print:bg-white print:p-0">
      
      {/* Action Bar (Hidden on print) */}
      <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link 
          href="/" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Store
        </Link>
        
        <button
          // We trigger browser print dialog on click via simple javascript
          data-print-btn
          className="inline-flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 shadow transition-colors"
        >
          <Printer className="h-4 w-4" /> Print / Save PDF
        </button>
      </div>

      {/* Invoice Sheet */}
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 shadow-lg rounded-lg p-8 sm:p-12 print:border-0 print:shadow-none print:rounded-none">
        
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-8 border-b border-slate-200">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">Verdant Aquatics</h1>
            <p className="text-xs text-slate-400 mt-1 uppercase font-semibold tracking-wider">Premium Aquarium Shop</p>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Dhaka, Bangladesh<br />
              Email: support@verdantaquatics.com<br />
              Web: verdantaquatics.com
            </p>
          </div>
          <div className="sm:text-right space-y-1.5">
            <h2 className="text-xl font-bold text-slate-900">INVOICE</h2>
            <p className="text-xs text-slate-500">Invoice ID: <span className="font-mono font-bold text-slate-800">{order.id.slice(0, 8).toUpperCase()}-{order.id.slice(9, 13).toUpperCase()}</span></p>
            <p className="text-xs text-slate-500">Date: <span className="font-semibold text-slate-800">{date}</span></p>
            <div className="inline-block mt-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                order.payment_status === 'FullyPaid' || order.payment_status === 'DeliveryChargePrePaid'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-amber-50 text-amber-700 border border-amber-100'
              }`}>
                {order.payment_status === 'FullyPaid' && 'FULLY PREPAID'}
                {order.payment_status === 'DeliveryChargePrePaid' && 'DELIVERY PREPAID'}
                {order.payment_status === 'Pending' && 'PAYMENT PENDING'}
                {order.payment_status === 'Failed' && 'PAYMENT FAILED'}
              </span>
            </div>
          </div>
        </div>

        {/* Billing details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b border-slate-200 text-xs">
          <div>
            <h3 className="text-slate-400 font-bold uppercase tracking-wider mb-2.5">Billing To</h3>
            <p className="text-sm font-bold text-slate-900">{order.customer_name}</p>
            <p className="text-slate-600 font-medium mt-1">Phone: {order.customer_phone}</p>
            {order.customer_email && <p className="text-slate-600 font-medium">Email: {order.customer_email}</p>}
          </div>
          <div>
            <h3 className="text-slate-400 font-bold uppercase tracking-wider mb-2.5">Shipping Destination</h3>
            <p className="text-slate-900 font-medium leading-relaxed break-words">{order.shipping_address}</p>
            {order.payment_details?.shipping_metadata ? (
              <p className="text-slate-700 font-bold mt-1.5">
                {order.payment_details.shipping_metadata.area_name}, {order.payment_details.shipping_metadata.zone_name}, {order.payment_details.shipping_metadata.city_name}
              </p>
            ) : (
              <p className="text-slate-500 italic mt-1.5">
                Area ID: {order.area_id}, Zone ID: {order.zone_id}, City ID: {order.city_id}
              </p>
            )}
          </div>
        </div>

        {/* Invoice Summary */}
        <div className="py-4 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-100 print:bg-white print:border-slate-200">
            <div>
              <span className="text-slate-400 block font-semibold">Payment Option</span>
              <span className="text-slate-800 font-bold block mt-0.5">
                {order.payment_method === 'COD' ? 'Cash on Delivery (COD)' : 'Full Prepaid bKash'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">bKash Transaction ID</span>
              <span className="font-mono text-slate-800 font-bold block mt-0.5">
                {order.payment_details?.trx_id || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">Paid Amount</span>
              <span className="text-emerald-600 font-bold block mt-0.5">
                ৳{Number(order.payment_method === 'COD' ? order.delivery_charge : order.total_price).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">COD to Collect</span>
              <span className="text-slate-800 font-bold block mt-0.5">
                ৳{codAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="py-6">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold tracking-wider">
                <th className="py-3">Item Name & Variant</th>
                <th className="py-3 text-right">Unit Price</th>
                <th className="py-3 text-center">Quantity</th>
                <th className="py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orderItems && orderItems.map((item) => (
                <tr key={item.id}>
                  <td className="py-4 pr-4">
                    <p className="font-bold text-slate-900">{(item.products as any)?.name || 'Product Item'}</p>
                    {item.selected_variations && Object.entries(item.selected_variations as Record<string, any>).map(([k, v]) => (
                      <span key={k} className="inline-block bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] mr-1.5 mt-1 capitalize">
                        {k}: {String(v)}
                      </span>
                    ))}
                  </td>
                  <td className="py-4 text-right font-semibold text-slate-700">৳{Number(item.price).toLocaleString()}</td>
                  <td className="py-4 text-center font-semibold text-slate-700">{item.quantity}</td>
                  <td className="py-4 text-right font-bold text-slate-900">৳{(Number(item.price) * item.quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculations */}
        <div className="flex justify-end pt-4 border-t border-slate-200 text-xs">
          <div className="w-64 space-y-2.5">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-800">৳{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Pathao Shipping Charge:</span>
              <span className="font-semibold text-slate-800">৳{Number(order.delivery_charge).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-100 pt-2">
              <span>Grand Total:</span>
              <span>৳{Number(order.total_price).toLocaleString()}</span>
            </div>
          </div>
        </div>

          {/* Terms & Footer */}
          <div className="pt-12 text-center text-[10px] text-slate-400 border-t border-slate-100 mt-12 print:mt-16">
            <p className="font-semibold text-slate-500">Thank you for your business!</p>
            <p className="mt-1">If you have any questions about this invoice, please contact support@verdantaquatics.com</p>
          </div>

          <script dangerouslySetInnerHTML={{ __html: "const btn = document.querySelector('[data-print-btn]'); if (btn) { btn.addEventListener('click', () => { window.print(); }); } if (window.location.search.includes('print=true')) { setTimeout(() => { window.print(); }, 300); }" }} />
        </div>
      </div>
  )
}
