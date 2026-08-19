import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import { checkSteadfastStatus } from '@/utils/courier'
import { verifyStaffAuth } from '@/utils/auth'

export const dynamic = 'force-dynamic'

// Map Steadfast delivery statuses to internal order status & payment status
function mapSteadfastStatus(deliveryStatus: string) {
  const normalized = (deliveryStatus || '').toLowerCase().trim()
  
  if (['delivered', 'delivered_approval_pending'].includes(normalized)) {
    return { order_status: 'Completed', payment_status: 'FullyPaid', pathao_status: 'delivered' }
  }
  if (['partial_delivered', 'partial_delivered_approval_pending'].includes(normalized)) {
    return { order_status: 'Completed', payment_status: 'FullyPaid', pathao_status: 'partial_delivered' }
  }
  if (['cancelled', 'cancelled_approval_pending'].includes(normalized)) {
    return { order_status: 'Cancelled', pathao_status: 'cancelled' }
  }
  if (normalized === 'hold') {
    return { order_status: 'Shipped', pathao_status: 'hold' }
  }
  if (normalized === 'in_review' || normalized === 'pending') {
    return { order_status: 'Shipped', pathao_status: 'dispatched' }
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyStaffAuth(['shop_owner', 'admin', 'staff'])
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const adminDb = createAdminClient()
    const { order_id, bulk } = await request.json()

    // 1. BULK SYNC MODE
    if (bulk) {
      const { data: activeOrders, error } = await adminDb
        .from('orders')
        .select('*')
        .eq('shipping_provider', 'steadfast')
        .not('steadfast_consignment_id', 'is', null)
        .not('order_status', 'in', '("Completed","Cancelled")')
        .limit(50)

      if (error || !activeOrders) {
        return NextResponse.json({ error: 'Failed to fetch active Steadfast orders' }, { status: 500 })
      }

      let updatedCount = 0
      const results = []

      for (const order of activeOrders) {
        const identifier = order.steadfast_consignment_id
          ? { consignment_id: order.steadfast_consignment_id }
          : order.steadfast_tracking_code
          ? { tracking_code: order.steadfast_tracking_code }
          : { invoice: `INV-${order.id.slice(0, 8).toUpperCase()}` }

        const statusRes = await checkSteadfastStatus(identifier)

        if (statusRes.success && statusRes.delivery_status) {
          const mapping = mapSteadfastStatus(statusRes.delivery_status)
          if (mapping) {
            await adminDb
              .from('orders')
              .update(mapping)
              .eq('id', order.id)

            updatedCount++
            results.push({
              order_id: order.id,
              delivery_status: statusRes.delivery_status,
              updated: true,
              ...mapping
            })
          }
        }
      }

      return NextResponse.json({
        success: true,
        bulk: true,
        checked_count: activeOrders.length,
        updated_count: updatedCount,
        results
      })
    }

    // 2. SINGLE ORDER SYNC MODE
    if (!order_id) {
      return NextResponse.json({ error: 'order_id or bulk: true is required' }, { status: 400 })
    }

    const { data: order, error } = await adminDb
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Strictly ensure this order is handled by Steadfast to prevent Pathao conflicts
    if (order.shipping_provider !== 'steadfast') {
      return NextResponse.json({
        error: `Order #${order_id.slice(0, 8)} is managed by ${order.shipping_provider || 'Pathao/Manual'}, not Steadfast.`
      }, { status: 400 })
    }

    const identifier = order.steadfast_consignment_id
      ? { consignment_id: order.steadfast_consignment_id }
      : order.steadfast_tracking_code
      ? { tracking_code: order.steadfast_tracking_code }
      : { invoice: `INV-${order.id.slice(0, 8).toUpperCase()}` }

    const statusRes = await checkSteadfastStatus(identifier)

    if (!statusRes.success) {
      return NextResponse.json({ error: statusRes.error || 'Failed to fetch Steadfast status' }, { status: 400 })
    }

    const mapping = mapSteadfastStatus(statusRes.delivery_status)
    if (mapping) {
      await adminDb
        .from('orders')
        .update(mapping)
        .eq('id', order.id)
    }

    return NextResponse.json({
      success: true,
      order_id: order.id,
      delivery_status: statusRes.delivery_status,
      updated: Boolean(mapping),
      mapping
    })

  } catch (err: any) {
    console.error('Courier Sync Error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
