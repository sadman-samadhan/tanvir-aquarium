import { createAdminClient } from '@/utils/supabase/server'
import { getPublicSettings } from '@/utils/settings'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Printer, ArrowLeft, CheckCircle2 } from 'lucide-react'

export const revalidate = 0

interface InvoicePageProps {
  params: Promise<{ id: string }>
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { id } = await params
  const supabase = createAdminClient()
  const settings = await getPublicSettings()

  // Fetch Order and associated items
  const { data: order, error } = await supabase
    .from('orders')
    .select('*, order_items(*, products(name, images))')
    .eq('id', id)
    .single()

  if (error || !order) {
    notFound()
  }

  const orderItems = order.order_items || []
  const date = new Date(order.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  const subtotal = (orderItems || []).reduce((sum: number, item: any) => sum + Number(item.price) * item.quantity, 0)

  const customAdvancePaid = order.payment_details?.advance_paid !== undefined
    ? Number(order.payment_details.advance_paid)
    : (order.payment_status === 'FullyPaid'
      ? Number(order.total_price)
      : order.payment_status === 'DeliveryChargePrePaid'
        ? Number(order.delivery_charge)
        : 0)

  const isFullyPaid = order.payment_status === 'FullyPaid' || (customAdvancePaid >= Number(order.total_price) && Number(order.total_price) > 0)
  const isPartialAdvance = customAdvancePaid > 0 && !isFullyPaid

  // Due on delivery calculation
  const dueOnDelivery = Math.max(0, Number(order.total_price) - customAdvancePaid)

  // Courier booking details (only displayed once dispatched)
  const isDispatched = Boolean(
    order.steadfast_consignment_id || 
    order.pathao_consignment_id || 
    order.steadfast_tracking_code ||
    (order.order_status === 'Shipped' && order.shipping_provider)
  )

  const activeProvider = order.steadfast_consignment_id || (order.shipping_provider === 'steadfast' && isDispatched)
    ? 'Steadfast Courier'
    : order.pathao_consignment_id || (order.shipping_provider === 'pathao' && isDispatched)
      ? 'Pathao Express'
      : isDispatched && order.shipping_provider
        ? String(order.shipping_provider).toUpperCase()
        : null

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-3 sm:p-6 print:bg-white print:p-0">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: A5 portrait;
            margin: 4mm 6mm;
          }
          body {
            background: white !important;
            font-size: 10px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-hidden {
            display: none !important;
          }
          .invoice-card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      `}} />

      {/* Action Bar (Hidden on print) */}
      <div className="max-w-xl mx-auto mb-4 flex items-center justify-between print-hidden">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Store
        </Link>

        <button
          onClick={undefined}
          id="print-invoice-btn"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-4 py-2 shadow transition-colors"
        >
          <Printer className="h-4 w-4" /> Print / Save Invoice
        </button>
      </div>

      {/* Invoice Sheet */}
      <div className="invoice-card max-w-xl mx-auto bg-white border border-slate-200 shadow-lg rounded-2xl p-5 sm:p-7 print:border-0 print:shadow-none print:rounded-none">

        {/* Invoice Header */}
        <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {settings.logo_url && (
              <img
                src={settings.logo_url}
                alt={settings.store_name}
                className="h-10 w-10 rounded-full object-cover border border-slate-200 flex-shrink-0"
              />
            )}
            <div>
              <h1 className="text-xl font-black text-slate-950 tracking-tight leading-none">{settings.store_name}</h1>
              <p className="text-[11px] text-brand-600 font-bold tracking-wide mt-1">
                {settings.store_tagline || 'Aquariums, Accessories & Aquatic Plants'}
              </p>
              <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                {settings.contact_address || 'Dhaka, Bangladesh'}
              </p>
            </div>
          </div>

          <div className="text-right space-y-0.5">
            <h2 className="text-lg font-black text-slate-900 leading-none">INVOICE</h2>
            <p className="text-[10px] text-slate-500 font-mono">ID: <span className="font-bold text-slate-900">#{order.id.slice(0, 8).toUpperCase()}</span></p>
            <p className="text-[10px] text-slate-500">Date: <span className="font-medium text-slate-800">{date}</span></p>

            <div className="flex justify-end gap-1 mt-1">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-extrabold ${(order.order_status || 'Pending') === 'Confirmed'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : (order.order_status || 'Pending') === 'Shipped'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : (order.order_status || 'Pending') === 'Completed'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                {(order.order_status || 'Pending').toUpperCase()}
              </span>

              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-extrabold ${isFullyPaid || isPartialAdvance
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                {isFullyPaid && 'FULLY PREPAID'}
                {isPartialAdvance && `ADVANCE ৳${customAdvancePaid.toLocaleString()}`}
                {!isFullyPaid && !isPartialAdvance && 'UNPAID COD'}
              </span>
            </div>
          </div>
        </div>

        {/* Billing & Shipping Destination */}
        <div className="grid grid-cols-2 gap-4 py-3 border-b border-slate-200 text-[11px]">
          <div>
            <h3 className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-1">Customer / Bill To</h3>
            <p className="font-bold text-slate-950 text-xs">{order.customer_name}</p>
            <p className="text-slate-700 font-mono font-medium">{order.customer_phone}</p>
            {order.customer_email && <p className="text-slate-500 truncate">{order.customer_email}</p>}
          </div>
          <div>
            <h3 className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-1">Delivery Destination</h3>
            <p className="text-slate-900 font-medium leading-tight">{order.shipping_address}</p>
            {order.payment_details?.shipping_metadata?.area_name && (
              <p className="text-slate-500 text-[10px] mt-0.5">
                {order.payment_details.shipping_metadata.area_name}, {order.payment_details.shipping_metadata.city_name}
              </p>
            )}
            {isDispatched && activeProvider && (
              <div className="text-slate-500 font-mono text-[10px] mt-1 space-y-0.5">
                <p>
                  Courier: <strong className="text-slate-800 font-bold">{activeProvider}</strong>
                  {order.steadfast_consignment_id && ` (#${order.steadfast_consignment_id})`}
                  {order.pathao_consignment_id && ` (#${order.pathao_consignment_id})`}
                </p>
                {order.steadfast_tracking_code && (
                  <p className="text-blue-700 font-semibold">
                    Track: {order.steadfast_tracking_code}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Order Items Table */}
        <div className="py-3 border-b border-slate-200">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-1.5">Item Description</th>
                <th className="pb-1.5 text-center">Qty</th>
                <th className="pb-1.5 text-right">Unit Price</th>
                <th className="pb-1.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orderItems.map((item: any) => (
                <tr key={item.id}>
                  <td className="py-2">
                    <p className="font-bold text-slate-900 leading-tight">{item.products?.name || 'Product Item'}</p>
                    {item.selected_variations && typeof item.selected_variations === 'object' && (
                      <div className="text-[9px] text-slate-500 mt-0.5 space-x-1">
                        {Object.entries(item.selected_variations).map(([k, v]) => (
                          <span key={k} className="capitalize">{k}: {String(v)}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-2 text-center font-bold text-slate-700">{item.quantity}</td>
                  <td className="py-2 text-right font-medium text-slate-700">৳{Number(item.price).toLocaleString()}</td>
                  <td className="py-2 text-right font-bold text-slate-950">৳{(Number(item.price) * item.quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="py-3 border-b border-slate-200 text-[11px]">
          <div className="w-full sm:w-7/12 ml-auto space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Items Subtotal:</span>
              <span>৳{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Delivery Fee:</span>
              <span>৳{Number(order.delivery_charge).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs font-black text-slate-950 pt-1.5 border-t border-slate-200">
              <span>Grand Total:</span>
              <span className="text-brand-700">৳{Number(order.total_price).toLocaleString()}</span>
            </div>

            {/* Payment Summary */}
            <div className="pt-2 space-y-1">
              {isFullyPaid && (
                <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200 text-emerald-900 space-y-0.5">
                  <div className="flex justify-between text-[10px] font-semibold">
                    <span>Paid Online via bKash:</span>
                    <span>৳{Number(order.total_price).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-black text-xs text-emerald-950 border-t border-emerald-200/60 pt-0.5">
                    <span>Due on Delivery:</span>
                    <span>৳0</span>
                  </div>
                </div>
              )}

              {isPartialAdvance && (
                <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 text-amber-950 space-y-0.5">
                  <div className="flex justify-between text-[10px] text-amber-800 font-semibold">
                    <span>Advance Payment Received:</span>
                    <span>-৳{customAdvancePaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-black text-xs text-amber-950 border-t border-amber-200 pt-0.5">
                    <span>COD Balance Due on Delivery:</span>
                    <span>৳{dueOnDelivery.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {!isFullyPaid && !isPartialAdvance && (
                <div className="bg-amber-50/80 p-2 rounded-lg border border-amber-200 text-amber-950 space-y-0.5">
                  <div className="flex justify-between text-[10px] text-amber-800 font-semibold">
                    <span>Payment Status:</span>
                    <span className="font-bold text-red-600">{order.payment_status === 'Failed' ? 'FAILED' : 'UNPAID COD'}</span>
                  </div>
                  <div className="flex justify-between font-black text-xs text-amber-950 border-t border-amber-200 pt-0.5">
                    <span>Total Due on Delivery (Full Order + Shipping):</span>
                    <span>৳{dueOnDelivery.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Shop Contact Details in Invoice Footer */}
        <div className="pt-3 text-center text-[10px] space-y-1">
          <p className="font-bold text-slate-800">Thank you for shopping with {settings.store_name}!</p>

          {(settings.contact_phone || settings.contact_email || settings.contact_address) && (
            <div className="pt-1.5 border-t border-slate-100 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-slate-500 font-medium">
              {settings.contact_phone && (
                <span>📞 <strong>Phone:</strong> {settings.contact_phone}</span>
              )}
              {settings.contact_email && (
                <span>✉️ <strong>Email:</strong> {settings.contact_email}</span>
              )}
              {settings.contact_address && (
                <span>📍 <strong>Address:</strong> {settings.contact_address}</span>
              )}
            </div>
          )}

          <p className="text-[9px] text-slate-400">For parcel queries or tracking, quote your Invoice ID: #{order.id.slice(0, 8).toUpperCase()}</p>
        </div>

      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.getElementById('print-invoice-btn')?.addEventListener('click', function() {
              window.print();
            });
          `
        }}
      />
    </div>
  )
}
