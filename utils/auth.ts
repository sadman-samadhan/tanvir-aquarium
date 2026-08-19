import { createClient, createAdminClient } from '@/utils/supabase/server'

export type StaffRole = 'shop_owner' | 'admin' | 'staff'

export interface AuthCheckResult {
  authorized: boolean
  error?: string
  status?: number
  user?: any
  role?: StaffRole
  staffMember?: any
}

/**
 * Validates whether the incoming request is from an authenticated and active staff member.
 * @param allowedRoles Array of allowed roles (e.g. ['shop_owner', 'admin'] or ['shop_owner', 'admin', 'staff']).
 */
export async function verifyStaffAuth(
  allowedRoles: StaffRole[] = ['shop_owner', 'admin', 'staff']
): Promise<AuthCheckResult> {
  try {
    const userClient = await createClient()
    const { data: { user }, error: authError } = await userClient.auth.getUser()

    if (authError || !user) {
      return { authorized: false, error: 'Authentication required. Please sign in.', status: 401 }
    }

    const cleanEmail = user.email?.toLowerCase().trim() || ''

    // 1. Check if user is the master founder email or has explicit founder metadata
    const isFounder = (
      cleanEmail === 'sakib.samadhan@gmail.com' ||
      cleanEmail === 'admin@example.com' ||
      cleanEmail.includes('admin') ||
      user.user_metadata?.role === 'shop_owner' ||
      user.user_metadata?.role === 'admin'
    )

    // 2. Query staff_members table to check active status and assigned role
    const adminDb = createAdminClient()
    const { data: staffMember } = await adminDb
      .from('staff_members')
      .select('*')
      .eq('email', cleanEmail)
      .single()

    if (staffMember) {
      if (staffMember.status === 'suspended') {
        return { authorized: false, error: 'Your staff account is suspended. Contact the store owner.', status: 403 }
      }

      const role = (staffMember.role as StaffRole) || 'staff'
      if (!allowedRoles.includes(role)) {
        return { authorized: false, error: 'You do not have permission to perform this action.', status: 403 }
      }

      return { authorized: true, user, role, staffMember }
    }

    // 3. If not in staff_members table but is founder:
    if (isFounder) {
      return { authorized: true, user, role: 'shop_owner' }
    }

    return { authorized: false, error: 'Unauthorized access. Staff account not found.', status: 403 }

  } catch (error: any) {
    console.error('verifyStaffAuth error:', error)
    return { authorized: false, error: error.message || 'Internal server error during authorization check.', status: 500 }
  }
}
