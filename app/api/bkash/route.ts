import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/utils/supabase/server'
import axios from 'axios'

// 1. GET BKASH AUTHENTICATION TOKEN
async function getBkashToken() {
  const { BKASH_API_URL, BKASH_APP_KEY, BKASH_APP_SECRET, BKASH_USERNAME, BKASH_PASSWORD } = process.env
  try {
    const response = await axios.post(`${BKASH_API_URL}/tokenized/checkout/token/grant`, {
      app_key: BKASH_APP_KEY,
      app_secret: BKASH_APP_SECRET
    }, {
      headers: {
        username: BKASH_USERNAME,
        password: BKASH_PASSWORD,
        'Content-Type': 'application/json'
      }
    })
    return response.data.id_token
  } catch (error: any) {
    console.error('bKash Token Grant Error:', error.response?.data || error.message)
    throw new Error('bKash Authentication Failed')
  }
}

// 2. PATHAO CONSIGNMENT BOOKING HELPERS
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

async function bookPathaoConsignment(order: any, codAmount: number) {
  const { PATHAO_API_URL, PATHAO_STORE_ID } = process.env
  try {
    const token = await getPathaoToken()
    
    // Formulate consignment payload
    const payload = {
      store_id: Number(PATHAO_STORE_ID),
      merchant_order_id: order.id,
      recipient_name: order.customer_name,
      recipient_phone: order.customer_phone,
      recipient_address: order.shipping_address,
      recipient_city: Number(order.city_id),
      recipient_zone: Number(order.zone_id),
      recipient_area: Number(order.area_id),
      delivery_type: 48, // 48 = Normal (Default)
      item_type: 2, // 2 = Parcel
      item_quantity: 1,
      item_weight: 0.5, // Default weight estimate
      amount_to_collect: codAmount,
      special_instruction: order.payment_method === 'COD' 
        ? `Prepaid Delivery Charge. Collect COD ৳${codAmount} product value.` 
        : 'Fully Prepaid. Collect ৳0 COD.'
    }

    const response = await axios.post(`${PATHAO_API_URL}/aladdin/api/v1/orders`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    if (response.data?.data?.consignment_id) {
      return response.data.data.consignment_id
    }
    return null
  } catch (error: any) {
    console.error('Pathao Booking Error:', error.response?.data || error.message)
    // Return null, we will allow admin to manually retry dispatch from admin panel
    return null
  }
}

// 3. API POST: CREATE BKASH PAYMENT
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const { 
      customer_name, 
      customer_phone, 
      customer_email, 
      shipping_address, 
      city_id, 
      zone_id, 
      area_id, 
      city_name,
      zone_name,
      area_name,
      delivery_charge, 
      total_price, 
      payment_method, // 'COD' or 'BKASH'
      cartItems 
    } = body

    // Validate inputs
    if (!customer_name || !customer_phone || !shipping_address || !cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: 'Missing required order details' }, { status: 400 })
    }

    // Step A: Insert order as 'Pending' in Supabase database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name,
        customer_phone,
        customer_email,
        shipping_address,
        city_id,
        zone_id,
        area_id,
        delivery_charge,
        total_price,
        payment_method,
        payment_status: 'Pending',
        payment_details: {
          shipping_metadata: {
            city_name,
            zone_name,
            area_name
          }
        }
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Order creation error:', orderError)
      return NextResponse.json({ error: 'Failed to create order record' }, { status: 500 })
    }

    // Step B: Save order items
    const orderItemsPayload = cartItems.map((item: any) => ({
      order_id: order.id,
      product_id: item.id,
      quantity: item.quantity,
      price: item.price,
      selected_variations: item.selectedVariations
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsPayload)

    if (itemsError) {
      console.error('Order items insertion error:', itemsError)
      return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 })
    }

    // Step C: Determine bKash payment amount
    // If Cash on Delivery, the user prepays only the delivery charge.
    // If Full Payment, the user prepays the total price (products + delivery).
    const paymentAmount = payment_method === 'COD' ? delivery_charge : total_price

    // Step D: Create bKash Payment link
    const { BKASH_API_URL, NEXT_PUBLIC_APP_URL, BKASH_APP_KEY } = process.env
    const token = await getBkashToken()

    const bkashResponse = await axios.post(`${BKASH_API_URL}/tokenized/checkout/create`, {
      mode: '0011',
      payerReference: customer_phone,
      callbackURL: `${NEXT_PUBLIC_APP_URL}/api/bkash?order_id=${order.id}&method=${payment_method}`,
      amount: Number(paymentAmount).toFixed(2),
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: order.id
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-app-key': BKASH_APP_KEY
      }
    })

    if (bkashResponse.data?.bkashURL) {
      return NextResponse.json({ 
        checkoutUrl: bkashResponse.data.bkashURL, 
        orderId: order.id 
      })
    }

    return NextResponse.json({ error: 'Failed to generate bKash payment URL' }, { status: 500 })

  } catch (error: any) {
    console.error('Create Payment Error:', error.message)
    return NextResponse.json({ error: error.message || 'Payment initiation failed' }, { status: 500 })
  }
}

// 4. API GET: BKASH REDIRECT CALLBACK & EXECUTE PAYMENT
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const paymentID = searchParams.get('paymentID')
  const status = searchParams.get('status')
  const orderId = searchParams.get('order_id')
  const method = searchParams.get('method') // 'COD' or 'BKASH'

  const { BKASH_API_URL, NEXT_PUBLIC_APP_URL, BKASH_APP_KEY } = process.env
  const supabase = createAdminClient()

  if (!orderId) {
    return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/order/failed?error=MissingOrderId`)
  }

  // Handle failure callbacks from bKash redirect
  if (status !== 'success' || !paymentID) {
    // Update order status to Failed
    await supabase.from('orders').update({ payment_status: 'Failed' }).eq('id', orderId)
    return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/order/failed?order_id=${orderId}&reason=${status || 'PaymentCancelled'}`)
  }

  try {
    // Step A: Grant Token for Executing Payment
    const token = await getBkashToken()

    // Step B: Execute the Payment (Capture the cash)
    const executeResponse = await axios.post(`${BKASH_API_URL}/tokenized/checkout/execute`, {
      paymentID
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-app-key': BKASH_APP_KEY
      }
    })

    const result = executeResponse.data

    if (result.statusCode === '0000' && result.transactionStatus === 'Completed') {
      // Payment Successful!
      const paymentStatus = method === 'COD' ? 'DeliveryChargePrePaid' : 'FullyPaid'

      // Step C: Fetch full order detail to construct Pathao consignment
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      // Calculate COD amount to collect
      // If COD method chosen, amount to collect is (Total Price - Delivery Charge) = Product Cost.
      // If Full Prepayment, amount to collect is 0.
      const codAmount = method === 'COD' 
        ? Number(order.total_price) - Number(order.delivery_charge) 
        : 0

      // Step D: Dispatch consignment to Pathao Courier
      const consignmentId = await bookPathaoConsignment(order, codAmount)

      // Step E: Update Order details with payment logs and tracking ID
      await supabase
        .from('orders')
        .update({
          payment_status: paymentStatus,
          payment_details: {
            ...(order.payment_details || {}),
            trx_id: result.trxID,
            payment_id: result.paymentID,
            amount: result.amount,
            customer_bkash_number: result.customerMsisdn,
            payload: result
          },
          pathao_consignment_id: consignmentId,
          pathao_status: consignmentId ? 'dispatched' : 'pending' // pending dispatch retry if API failed
        })
        .eq('id', orderId)

      // Step F: Reduce stock count of products
      const { data: items } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId)

      if (items) {
        for (const item of items) {
          // Increment stock deduction
          await supabase.rpc('decrement_product_stock', {
            prod_id: item.product_id,
            qty: item.quantity
          })
        }
      }

      // Redirect to Order Success Page
      return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/order/confirmation?order_id=${orderId}&trx_id=${result.trxID}`)

    } else {
      // Payment execution failed or returned error status code
      console.error('bKash Execution Failure Status:', result)
      await supabase.from('orders').update({ payment_status: 'Failed', payment_details: result }).eq('id', orderId)
      return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/order/failed?order_id=${orderId}&reason=${result.statusMessage || 'ExecutionFailed'}`)
    }

  } catch (error: any) {
    console.error('bKash Execute Callback Exception:', error.message)
    await supabase.from('orders').update({ payment_status: 'Failed' }).eq('id', orderId)
    return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/order/failed?order_id=${orderId}&reason=ServerError`)
  }
}
