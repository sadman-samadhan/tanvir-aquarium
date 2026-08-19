import { NextRequest, NextResponse } from 'next/server'
import { getStoreSettings } from '@/utils/settings'
import { getPathaoToken } from '@/utils/courier'
import axios from 'axios'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const cityId = searchParams.get('city_id')
  const zoneId = searchParams.get('zone_id')

  const settings = await getStoreSettings()
  const pathao_api_url = settings.pathao_api_url || process.env.PATHAO_API_URL || 'https://courier-api-sandbox.pathao.com'

  const pathao_client_id = settings.pathao_client_id || process.env.PATHAO_CLIENT_ID
  const pathao_client_secret = settings.pathao_client_secret || process.env.PATHAO_CLIENT_SECRET
  const pathao_username = settings.pathao_username || process.env.PATHAO_USERNAME
  const pathao_password = settings.pathao_password || process.env.PATHAO_PASSWORD

  if (!pathao_client_id || !pathao_client_secret || !pathao_username || !pathao_password) {
    if (action === 'cities' || cityId || zoneId) {
      return NextResponse.json([])
    }
    return NextResponse.json({ error: 'Pathao credentials not configured' }, { status: 400 })
  }

  try {
    const token = await getPathaoToken()
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }

    if (action === 'cities') {
      const response = await axios.get(`${pathao_api_url}/aladdin/api/v1/city-list`, { headers })
      return NextResponse.json(response.data?.data?.data || [])
    }

    if (cityId) {
      const response = await axios.get(`${pathao_api_url}/aladdin/api/v1/cities/${cityId}/zone-list`, { headers })
      return NextResponse.json(response.data?.data?.data || [])
    }

    if (zoneId) {
      const response = await axios.get(`${pathao_api_url}/aladdin/api/v1/zones/${zoneId}/area-list`, { headers })
      return NextResponse.json(response.data?.data?.data || [])
    }

    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  } catch (error: any) {
    console.warn('Pathao Fetch Notice:', error.response?.data?.message || error.message)
    return NextResponse.json([])
  }
}
