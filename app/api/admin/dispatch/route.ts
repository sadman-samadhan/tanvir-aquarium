import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/utils/supabase/server'
import axios from 'axios'

async function getPathaoToken() {
  const { PATHAO_API_URL, PATHAO_CLIENT_ID, PATHAO_CLIENT_SECRET, PATHAO_USERNAME, PATHAO_PASSWORD } = process.env
  const response = await axios.post(`${PATHAO_API_URL}/aladdin/api/v1/issue-token`, {
    client_id: PATHAO_CLIENT_ID,
    client_secret: PATHAO_CLIENT_SECRET,
    username: PATHAO_USERNAME,
    password: PATHAO_PASSWORD,
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  })
  return response.data.access_token
}

export async function POST(request: NextRequest) {
  try {
    const userClient = await createClient()
    const adminDb = createAdminClient()
    const { order_id } = await request.json()

    if (!order_id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Check if user is authenticated and is admin
    const { data: { user } } = await userClient.auth.getUser()
    const adminEmail = 'admin@example.com'
    if (!user || (user.email !== adminEmail && !user.email?.includes('admin') && user.email !== 'sakib.samadhan@gmail.com')) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 })
    }

    // Fetch order details
    const { data: order, error } = await adminDb
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.pathao_consignment_id) {
      return NextResponse.json({ error: 'Consignment already booked for this order' }, { status: 400 })
    }

    const { PATHAO_API_URL, PATHAO_STORE_ID } = process.env
    const token = await getPathaoToken()

    const codAmount = order.payment_method === 'COD' 
      ? Number(order.total_price) - Number(order.delivery_charge) 
      : 0

    // Call Pathao API
    const response = await axios.post(`${PATHAO_API_URL}/aladdin/api/v1/orders`, {
      store_id: Number(PATHAO_STORE_ID),
      merchant_order_id: order.id,
      recipient_name: order.customer_name,
      recipient_phone: order.customer_phone,
      recipient_address: order.shipping_address,
      recipient_city: Number(order.city_id),
      recipient_zone: Number(order.zone_id),
      recipient_area: Number(order.area_id),
      delivery_type: 48,
      item_type: 2,
      item_quantity: 1,
      item_weight: 0.5,
      amount_to_collect: codAmount,
      special_instruction: order.payment_method === 'COD'
        ? `Prepaid Delivery Charge. Collect COD ৳${codAmount} product value.`
        : 'Fully Prepaid. Collect ৳0 COD.'
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    if (response.data?.data?.consignment_id) {
      const consignmentId = response.data.data.consignment_id
      
      // Update Database
      await adminDb
        .from('orders')
        .update({
          pathao_consignment_id: consignmentId,
          pathao_status: 'dispatched'
        })
        .eq('id', order.id)

      return NextResponse.json({ success: true, consignment_id: consignmentId })
    }

    return NextResponse.json({ error: 'Pathao API did not return consignment id' }, { status: 500 })

  } catch (error: any) {
    console.error('Manual Dispatch Error:', error.response?.data || error.message)
    
    // Extract detailed validation message from Pathao response if available
    let errorMessage = error.message || 'Dispatch failed'
    if (error.response?.data?.errors) {
      const validationErrors = Object.entries(error.response.data.errors)
        .map(([field, msgs]: any) => `${field}: ${msgs.join(', ')}`)
        .join('; ')
      errorMessage = `Courier validation failed: ${validationErrors}`
    } else if (error.response?.data?.message) {
      errorMessage = `Courier Error: ${error.response.data.message}`
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
