import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import { createSteadfastReturnRequest } from '@/utils/courier'
import { verifyStaffAuth } from '@/utils/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyStaffAuth(['shop_owner', 'admin', 'staff'])
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const adminDb = createAdminClient()
    const { order_id, reason } = await request.json()

    if (!order_id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    const { data: order, error } = await adminDb
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if order is managed by Steadfast
    if (order.shipping_provider === 'steadfast') {
      const identifier = order.steadfast_consignment_id
        ? { consignment_id: order.steadfast_consignment_id }
        : order.steadfast_tracking_code
        ? { tracking_code: order.steadfast_tracking_code }
        : { invoice: `INV-${order.id.slice(0, 8).toUpperCase()}` }

      const returnRes = await createSteadfastReturnRequest({
        ...identifier,
        reason: reason || 'Merchant requested dispatch cancellation / return'
      })

      if (!returnRes.success) {
        const errStr = (returnRes.error || '').toLowerCase()
        const isAlreadyExists = errStr.includes('already exists') || errStr.includes('already requested')
        
        if (!isAlreadyExists) {
          return NextResponse.json({
            error: returnRes.error || 'Failed to submit return request to Steadfast'
          }, { status: 400 })
        }
      }
    }

    // Reset consignment fields and revert order_status back to Confirmed so it can be re-dispatched
    await adminDb
      .from('orders')
      .update({
        order_status: 'Confirmed',
        shipping_provider: null,
        steadfast_consignment_id: null,
        steadfast_tracking_code: null,
        pathao_consignment_id: null,
        pathao_status: null
      })
      .eq('id', order_id)

    return NextResponse.json({
      success: true,
      order_id,
      order_status: 'Confirmed',
      message: 'Dispatch cancelled. Order reset to Confirmed and ready for re-dispatch.'
    })
  } catch (err: any) {
    console.error('Cancel Dispatch Error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
