import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/utils/supabase/server'

export async function PUT(request: NextRequest) {
  try {
    const userClient = await createClient()

    // Check if user is authenticated and is admin
    const { data: { user } } = await userClient.auth.getUser()
    const adminEmail = 'admin@example.com'
    if (!user || (user.email !== adminEmail && !user.email?.includes('admin') && user.email !== 'sakib.samadhan@gmail.com')) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      id, 
      customer_name, 
      customer_phone, 
      shipping_address, 
      city_id, 
      zone_id, 
      area_id,
      city_name,
      zone_name,
      area_name,
      delivery_charge 
    } = body

    if (!id || !customer_name || !customer_phone || !shipping_address) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const adminDb = createAdminClient()

    // Fetch existing order to compute updated total_price
    const { data: order, error: fetchError } = await adminDb
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const subtotal = Number(order.total_price) - Number(order.delivery_charge)
    const newTotalPrice = subtotal + Number(delivery_charge)

    // Update payment_details with shipping metadata
    const paymentDetails = order.payment_details || {}
    paymentDetails.shipping_metadata = {
      city_name,
      zone_name,
      area_name
    }

    const { data, error } = await adminDb
      .from('orders')
      .update({
        customer_name,
        customer_phone,
        shipping_address,
        city_id: Number(city_id),
        zone_id: Number(zone_id),
        area_id: Number(area_id),
        delivery_charge: Number(delivery_charge),
        total_price: newTotalPrice,
        payment_details: paymentDetails
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update order:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })

  } catch (error: any) {
    console.error('Order Update Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
