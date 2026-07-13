import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { WasteGuardRole } from '@/lib/mock-data'

export type OwnerOrStaffProfile = {
  fullName: string
  bakeryName: string
  role: WasteGuardRole
  inviteCode: string
  bakeryId: string
  onboardingCompleted: boolean
}

function generateInviteCode(bakeryName: string) {
  const prefix = bakeryName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'BAK'
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}-${suffix}`
}

/**
 * Idempotent: safe to call on every login / page load. Creates the owner's
 * business record (or resolves the staff invite code) only the first time —
 * every call after that just reads back what already exists.
 */
export async function ensureOwnerOrStaffProfile(user: User): Promise<OwnerOrStaffProfile> {
  const metadata = user.user_metadata ?? {}
  const fullName = String(metadata.full_name || user.email?.split('@')[0] || 'Restaurant Team')
  const role: WasteGuardRole = metadata.role === 'staff' ? 'staff' : 'owner'

  const { data: existingUser } = await supabase
    .from('users')
    .select('id, full_name, role, bakery_id')
    .eq('id', user.id)
    .maybeSingle()

  if (existingUser?.bakery_id) {
    const { data: bakery, error } = await supabase
      .from('bakeries')
      .select('bakery_name, invite_code, onboarding_completed')
      .eq('id', existingUser.bakery_id)
      .single()

    if (error || !bakery) {
      throw new Error('Unable to load your business profile. Please try again.')
    }

    return {
      fullName: existingUser.full_name,
      bakeryName: bakery.bakery_name,
      role: existingUser.role as WasteGuardRole,
      inviteCode: bakery.invite_code,
      bakeryId: existingUser.bakery_id,
      onboardingCompleted: Boolean(bakery.onboarding_completed),
    }
  }

  if (role === 'staff') {
    const inviteCode = String(metadata.invite_code || '').toUpperCase()
    if (!inviteCode) {
      throw new Error('Missing invite code for staff account.')
    }

    const { data: bakery, error } = await supabase
      .from('bakeries')
      .select('id, bakery_name, invite_code, onboarding_completed')
      .eq('invite_code', inviteCode)
      .single()

    if (error || !bakery) {
      throw new Error('Invite code not found. Ask your owner for the correct code.')
    }

    await supabase.from('users').upsert({
      id: user.id,
      full_name: fullName,
      email: user.email,
      role: 'staff',
      bakery_id: bakery.id,
    })

    return {
      fullName,
      bakeryName: bakery.bakery_name,
      role: 'staff',
      inviteCode: bakery.invite_code,
      bakeryId: bakery.id,
      onboardingCompleted: Boolean(bakery.onboarding_completed),
    }
  }

  // Owner — reuse an existing bakery row for this owner if one already
  // exists (guards against double-provisioning on a retried call).
  const bakeryName = String(metadata.bakery_name || `${fullName}'s Business`)
  const { data: ownedBakery } = await supabase
    .from('bakeries')
    .select('id, bakery_name, invite_code, onboarding_completed')
    .eq('owner_id', user.id)
    .maybeSingle()

  const bakery =
    ownedBakery ??
    (
      await supabase
        .from('bakeries')
        .insert({
          bakery_name: bakeryName,
          owner_id: user.id,
          invite_code: generateInviteCode(bakeryName),
        })
        .select('id, bakery_name, invite_code, onboarding_completed')
        .single()
    ).data

  if (!bakery) {
    throw new Error('Unable to set up your business. Please try again.')
  }

  await supabase.from('users').upsert({
    id: user.id,
    full_name: fullName,
    email: user.email,
    role: 'owner',
    bakery_id: bakery.id,
  })

  return {
    fullName,
    bakeryName: bakery.bakery_name,
    role: 'owner',
    inviteCode: bakery.invite_code,
    bakeryId: bakery.id,
    onboardingCompleted: Boolean(bakery.onboarding_completed),
  }
}
