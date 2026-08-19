import axios from 'axios'
import { getStoreSettings } from '@/utils/settings'

// ==========================================
// 1. PATHAO COURIER HELPERS
// ==========================================
let cachedPathaoToken: string | null = null
let pathaoTokenExpiry: number | null = null

export async function getPathaoToken(): Promise<string> {
  const now = Date.now()
  if (cachedPathaoToken && pathaoTokenExpiry && now < pathaoTokenExpiry) {
    return cachedPathaoToken
  }

  const settings = await getStoreSettings()
  const pathao_api_url = settings.pathao_api_url || process.env.PATHAO_API_URL || 'https://courier-api-sandbox.pathao.com'
  const pathao_client_id = settings.pathao_client_id || process.env.PATHAO_CLIENT_ID
  const pathao_client_secret = settings.pathao_client_secret || process.env.PATHAO_CLIENT_SECRET
  const pathao_username = settings.pathao_username || process.env.PATHAO_USERNAME
  const pathao_password = settings.pathao_password || process.env.PATHAO_PASSWORD

  if (!pathao_client_id || !pathao_client_secret || !pathao_username || !pathao_password) {
    throw new Error('Pathao credentials are not configured in settings.')
  }

  try {
    const response = await axios.post(`${pathao_api_url}/aladdin/api/v1/issue-token`, {
      client_id: pathao_client_id,
      client_secret: pathao_client_secret,
      username: pathao_username,
      password: pathao_password,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    if (response.data?.access_token) {
      const token = response.data.access_token as string
      cachedPathaoToken = token
      pathaoTokenExpiry = now + 14 * 24 * 60 * 60 * 1000 // 14 days
      return token
    }
    throw new Error('Failed to retrieve Pathao access token')
  } catch (error: any) {
    console.error('Pathao Authentication Error:', error.response?.data || error.message)
    throw new Error('Pathao Authentication Failed')
  }
}

export async function bookPathaoConsignment(order: any, codAmount: number): Promise<string | null> {
  const settings = await getStoreSettings()
  const pathao_api_url = settings.pathao_api_url || process.env.PATHAO_API_URL || 'https://courier-api-sandbox.pathao.com'
  const pathao_store_id = settings.pathao_store_id || process.env.PATHAO_STORE_ID

  try {
    const token = await getPathaoToken()
    
    const payload = {
      store_id: Number(pathao_store_id),
      merchant_order_id: order.id,
      recipient_name: order.customer_name,
      recipient_phone: order.customer_phone,
      recipient_address: order.shipping_address,
      recipient_city: Number(order.city_id || 1),
      recipient_zone: Number(order.zone_id || 1),
      recipient_area: Number(order.area_id || 1),
      delivery_type: 48,
      item_type: 2,
      item_quantity: 1,
      item_weight: 0.5,
      amount_to_collect: codAmount,
      special_instruction: order.payment_method === 'COD' 
        ? `Prepaid Delivery Charge. Collect COD ৳${codAmount} product value.` 
        : 'Fully Prepaid. Collect ৳0 COD.'
    }

    const response = await axios.post(`${pathao_api_url}/aladdin/api/v1/orders`, payload, {
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
    return null
  }
}

// ==========================================
// 2. STEADFAST COURIER HELPERS
// ==========================================
export interface SteadfastBookingResult {
  success: boolean
  consignment_id?: string
  tracking_code?: string
  status?: string
  error?: string
}

export async function bookSteadfastConsignment(order: any, codAmount: number): Promise<SteadfastBookingResult> {
  const settings = await getStoreSettings()
  const steadfast_api_key = settings.steadfast_api_key?.trim()
  const steadfast_secret_key = settings.steadfast_secret_key?.trim()
  const steadfast_base_url = settings.steadfast_base_url?.trim()

  if (!steadfast_api_key || !steadfast_secret_key) {
    console.warn('Steadfast credentials not configured in settings')
    return {
      success: false,
      error: 'Steadfast Api-Key and Secret-Key are not configured in Admin Settings.'
    }
  }

  let baseUrl = (steadfast_base_url || '').trim()
  if (!baseUrl || baseUrl.includes('portal.steadfast.com.bd')) {
    baseUrl = 'https://portal.packzy.com/api/v1'
  }
  baseUrl = baseUrl.replace(/\/$/, '')
  const invoiceNumber = `INV-${order.id.slice(0, 8).toUpperCase()}`

  // Format recipient phone number to standard 11-digit format (e.g. 01700000000)
  let phone = (order.customer_phone || '').replace(/\D/g, '')
  if (phone.startsWith('880')) {
    phone = phone.slice(2)
  }
  if (!phone.startsWith('0') && phone.length === 10) {
    phone = `0${phone}`
  }

  const payload = {
    invoice: invoiceNumber,
    recipient_name: order.customer_name || 'Valued Customer',
    recipient_phone: phone,
    recipient_address: order.shipping_address || 'Address Not Provided',
    cod_amount: Number(codAmount),
    note: order.payment_method === 'COD'
      ? `Prepaid Delivery Charge. Collect COD ৳${codAmount}.`
      : 'Fully Prepaid Order. Collect ৳0.'
  }

  try {
    console.log('Posting to Steadfast API:', `${baseUrl}/create_order`, payload)
    const response = await axios.post(`${baseUrl}/create_order`, payload, {
      headers: {
        'Api-Key': steadfast_api_key,
        'Secret-Key': steadfast_secret_key,
        'Content-Type': 'application/json'
      }
    })

    console.log('Steadfast API Response:', response.data)

    if (response.data?.status == 200 && response.data?.consignment) {
      return {
        success: true,
        consignment_id: String(response.data.consignment.consignment_id),
        tracking_code: response.data.consignment.tracking_code || String(response.data.consignment.consignment_id),
        status: response.data.consignment.status || 'in_review'
      }
    }

    const errMessage = response.data?.message 
      || (response.data?.errors ? JSON.stringify(response.data.errors) : null)
      || `Status code ${response.data?.status || 'unknown'}`

    return {
      success: false,
      error: `Steadfast Error: ${errMessage}`
    }
  } catch (error: any) {
    console.error('Steadfast Booking Error:', error.response?.data || error.message)
    const responseData = error.response?.data
    let errDetail = error.message
    if (responseData) {
      if (typeof responseData === 'string') {
        errDetail = responseData
      } else if (responseData.message) {
        errDetail = responseData.message
      } else if (responseData.errors) {
        errDetail = typeof responseData.errors === 'string' ? responseData.errors : JSON.stringify(responseData.errors)
      }
    }

    return {
      success: false,
      error: `Steadfast API Error (${error.response?.status || 500}): ${errDetail}`
    }
  }
}

export async function checkSteadfastStatus(identifier: { consignment_id?: string | number; tracking_code?: string; invoice?: string }) {
  const settings = await getStoreSettings()
  const steadfast_api_key = settings.steadfast_api_key?.trim()
  const steadfast_secret_key = settings.steadfast_secret_key?.trim()
  const steadfast_base_url = settings.steadfast_base_url?.trim()

  if (!steadfast_api_key || !steadfast_secret_key) {
    return { success: false, error: 'Steadfast credentials not configured in settings' }
  }

  let baseUrl = (steadfast_base_url || '').trim()
  if (!baseUrl || baseUrl.includes('portal.steadfast.com.bd')) {
    baseUrl = 'https://portal.packzy.com/api/v1'
  }
  baseUrl = baseUrl.replace(/\/$/, '')

  let endpoint = ''
  if (identifier.consignment_id) {
    endpoint = `${baseUrl}/status_by_cid/${identifier.consignment_id}`
  } else if (identifier.tracking_code) {
    endpoint = `${baseUrl}/status_by_trackingcode/${identifier.tracking_code}`
  } else if (identifier.invoice) {
    endpoint = `${baseUrl}/status_by_invoice/${identifier.invoice}`
  } else {
    return { success: false, error: 'Missing consignment_id, tracking_code, or invoice' }
  }

  try {
    const response = await axios.get(endpoint, {
      headers: {
        'Api-Key': steadfast_api_key,
        'Secret-Key': steadfast_secret_key
      }
    })

    if (response.data?.status === 200) {
      return {
        success: true,
        delivery_status: response.data.delivery_status || 'unknown',
        status_code: response.data.status
      }
    }

    return {
      success: false,
      error: response.data?.message || `Status check returned ${response.data?.status || 'unknown'}`
    }
  } catch (error: any) {
    console.error('Steadfast Status Check Error:', error.response?.data || error.message)
    return {
      success: false,
      error: error.response?.data?.message || error.message
    }
  }
}

export async function createSteadfastReturnRequest(params: { consignment_id?: string | number; tracking_code?: string; invoice?: string; reason?: string }) {
  const settings = await getStoreSettings()
  const steadfast_api_key = settings.steadfast_api_key?.trim()
  const steadfast_secret_key = settings.steadfast_secret_key?.trim()
  const steadfast_base_url = settings.steadfast_base_url?.trim()

  if (!steadfast_api_key || !steadfast_secret_key) {
    return { success: false, error: 'Steadfast credentials not configured in settings' }
  }

  let baseUrl = (steadfast_base_url || '').trim()
  if (!baseUrl || baseUrl.includes('portal.steadfast.com.bd')) {
    baseUrl = 'https://portal.packzy.com/api/v1'
  }
  baseUrl = baseUrl.replace(/\/$/, '')

  const payload: any = {}
  if (params.consignment_id) payload.consignment_id = params.consignment_id
  else if (params.tracking_code) payload.tracking_code = params.tracking_code
  else if (params.invoice) payload.invoice = params.invoice
  else {
    return { success: false, error: 'Please provide consignment_id, tracking_code, or invoice' }
  }

  if (params.reason) {
    payload.reason = params.reason
  }

  try {
    const response = await axios.post(`${baseUrl}/create_return_request`, payload, {
      headers: {
        'Api-Key': steadfast_api_key,
        'Secret-Key': steadfast_secret_key,
        'Content-Type': 'application/json'
      }
    })

    if (response.data?.id || response.data?.status === 'pending' || response.data?.status === 200) {
      return {
        success: true,
        id: response.data.id,
        status: response.data.status || 'pending',
        message: 'Return request created successfully'
      }
    }

    return {
      success: false,
      error: response.data?.message || 'Failed to create return request'
    }
  } catch (error: any) {
    console.error('Steadfast Return Request Error:', error.response?.data || error.message)
    const errData = error.response?.data
    const errDetail = errData?.error || errData?.message || errData?.errors || error.message
    return {
      success: false,
      error: `Steadfast Return Request Error: ${typeof errDetail === 'object' ? JSON.stringify(errDetail) : errDetail}`
    }
  }
}

export async function getSteadfastBalance() {
  const settings = await getStoreSettings()
  const steadfast_api_key = settings.steadfast_api_key?.trim()
  const steadfast_secret_key = settings.steadfast_secret_key?.trim()
  const steadfast_base_url = settings.steadfast_base_url?.trim()

  if (!steadfast_api_key || !steadfast_secret_key) {
    return { success: false, configured: false, current_balance: 0, error: 'Steadfast credentials not configured' }
  }

  let baseUrl = (steadfast_base_url || '').trim()
  if (!baseUrl || baseUrl.includes('portal.steadfast.com.bd')) {
    baseUrl = 'https://portal.packzy.com/api/v1'
  }
  baseUrl = baseUrl.replace(/\/$/, '')

  try {
    const response = await axios.get(`${baseUrl}/get_balance`, {
      headers: {
        'Api-Key': steadfast_api_key,
        'Secret-Key': steadfast_secret_key
      }
    })

    if (response.data?.status === 200 && response.data?.current_balance !== undefined) {
      return {
        success: true,
        configured: true,
        current_balance: Number(response.data.current_balance || 0)
      }
    }

    return {
      success: false,
      configured: true,
      current_balance: 0,
      error: response.data?.message || 'Failed to fetch current balance'
    }
  } catch (error: any) {
    console.warn('Steadfast Balance Notice:', error.response?.data?.message || error.message)
    return {
      success: false,
      configured: true,
      current_balance: 0,
      error: error.response?.data?.message || error.message
    }
  }
}
