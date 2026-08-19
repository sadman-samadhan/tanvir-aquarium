import { NextRequest, NextResponse } from 'next/server'
import { getSteadfastBalance } from '@/utils/courier'
import { verifyStaffAuth } from '@/utils/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyStaffAuth(['shop_owner', 'admin', 'staff'])
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const res = await getSteadfastBalance()
    return NextResponse.json(res)
  } catch (err: any) {
    console.warn('Steadfast Balance Route Error:', err)
    return NextResponse.json({ success: false, current_balance: 0, error: err.message }, { status: 500 })
  }
}
