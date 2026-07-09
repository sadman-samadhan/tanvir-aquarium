import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

// Cache variables in server memory
let cachedToken: string | null = null
let tokenExpiry: number | null = null

async function getPathaoToken() {
  const now = Date.now()
  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    return cachedToken
  }

  const { PATHAO_API_URL, PATHAO_CLIENT_ID, PATHAO_CLIENT_SECRET, PATHAO_USERNAME, PATHAO_PASSWORD } = process.env

  try {
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

    if (response.data?.access_token) {
      cachedToken = response.data.access_token
      // Set expiry to 14 days (Pathao tokens usually expire in 15 days)
      tokenExpiry = now + 14 * 24 * 60 * 60 * 1000 
      return cachedToken
    }
    throw new Error('Failed to retrieve Pathao access token')
  } catch (error: any) {
    console.error('Pathao Authentication Error:', error.response?.data || error.message)
    throw new Error('Pathao Authentication Failed')
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const cityId = searchParams.get('city_id')
  const zoneId = searchParams.get('zone_id')

  const PATHAO_API_URL = process.env.PATHAO_API_URL

  try {
    const token = await getPathaoToken()
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }

    if (action === 'cities') {
      const response = await axios.get(`${PATHAO_API_URL}/aladdin/api/v1/city-list`, { headers })
      return NextResponse.json(response.data?.data?.data || [])
    }

    if (cityId) {
      const response = await axios.get(`${PATHAO_API_URL}/aladdin/api/v1/cities/${cityId}/zone-list`, { headers })
      return NextResponse.json(response.data?.data?.data || [])
    }

    if (zoneId) {
      const response = await axios.get(`${PATHAO_API_URL}/aladdin/api/v1/zones/${zoneId}/area-list`, { headers })
      return NextResponse.json(response.data?.data?.data || [])
    }

    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  } catch (error: any) {
    console.error('Pathao Fetch Error:', error.response?.data || error.message)
    return NextResponse.json({ error: 'Failed to fetch Pathao location data' }, { status: 500 })
  }
}
