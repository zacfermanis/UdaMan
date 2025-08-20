import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/config'
import { validateSession } from '@/lib/auth/session'
import { ProfileUpdateData, UserProfile } from '@/types/auth'
import { rateLimit } from '@/lib/rate-limit'

const supabase = createServerClient()

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
    const { success } = await rateLimit(ip, 'profile_get', 10, 60) // 10 requests per minute
    if (!success) {
      return NextResponse.json(
        { error: 'Too many profile requests' },
        { status: 429 }
      )
    }

    // Get session token from cookie
    const sessionToken = request.cookies.get('session_token')?.value
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate session
    const sessionResult = await validateSession(sessionToken)
    if (!sessionResult.isValid || !sessionResult.session) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Get user profile from database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', sessionResult.session.userId)
      .single()

    if (error || !user) {
      console.error('Error fetching user profile:', error)
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    // Transform database user to UserProfile interface
    const profile: UserProfile = {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      bio: user.bio,
      location: user.location,
      website: user.website,
      timezone: user.timezone,
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at),
      email_verified: user.email_verified,
      subscription_tier: user.subscription_tier,
      consent_given: user.consent_given,
      consent_date: user.consent_date ? new Date(user.consent_date) : undefined,
      last_login: new Date(user.last_login),
      login_count: user.login_count,
      oauth_provider: user.oauth_provider,
      oauth_provider_id: user.oauth_provider_id,
      oauth_provider_data: user.oauth_provider_data
    }

    return NextResponse.json({
      success: true,
      profile
    })
  } catch (error) {
    console.error('Profile GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Rate limiting
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
    const { success } = await rateLimit(ip, 'profile_update', 5, 60) // 5 requests per minute
    if (!success) {
      return NextResponse.json(
        { error: 'Too many profile update requests' },
        { status: 429 }
      )
    }

    // Get session token from cookie
    const sessionToken = request.cookies.get('session_token')?.value
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate session
    const sessionResult = await validateSession(sessionToken)
    if (!sessionResult.isValid || !sessionResult.session) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Parse request body
    const updateData: ProfileUpdateData = await request.json()

    // Validate update data
    const validationErrors: string[] = []

    if (updateData.display_name !== undefined) {
      if (updateData.display_name.length > 100) {
        validationErrors.push('Display name must be 100 characters or less')
      }
    }

    if (updateData.bio !== undefined) {
      if (updateData.bio.length > 500) {
        validationErrors.push('Bio must be 500 characters or less')
      }
    }

    if (updateData.location !== undefined) {
      if (updateData.location.length > 255) {
        validationErrors.push('Location must be 255 characters or less')
      }
    }

    if (updateData.website !== undefined) {
      if (updateData.website.length > 255) {
        validationErrors.push('Website must be 255 characters or less')
      }
      // Basic URL validation
      if (updateData.website && !updateData.website.match(/^https?:\/\/.+/)) {
        validationErrors.push('Website must be a valid URL starting with http:// or https://')
      }
    }

    if (updateData.timezone !== undefined) {
      if (updateData.timezone.length > 50) {
        validationErrors.push('Timezone must be 50 characters or less')
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationErrors
        },
        { status: 400 }
      )
    }

    // Prepare update data (only include defined fields)
    const updateFields: any = {}
    if (updateData.display_name !== undefined) updateFields.display_name = updateData.display_name
    if (updateData.avatar_url !== undefined) updateFields.avatar_url = updateData.avatar_url
    if (updateData.bio !== undefined) updateFields.bio = updateData.bio
    if (updateData.location !== undefined) updateFields.location = updateData.location
    if (updateData.website !== undefined) updateFields.website = updateData.website
    if (updateData.timezone !== undefined) updateFields.timezone = updateData.timezone

    // Add updated_at timestamp
    updateFields.updated_at = new Date().toISOString()

    // Update user profile in database
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateFields)
      .eq('id', sessionResult.session.userId)
      .select()
      .single()

    if (error || !updatedUser) {
      console.error('Error updating user profile:', error)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    // Transform updated user to UserProfile interface
    const profile: UserProfile = {
      id: updatedUser.id,
      email: updatedUser.email,
      display_name: updatedUser.display_name,
      avatar_url: updatedUser.avatar_url,
      bio: updatedUser.bio,
      location: updatedUser.location,
      website: updatedUser.website,
      timezone: updatedUser.timezone,
      created_at: new Date(updatedUser.created_at),
      updated_at: new Date(updatedUser.updated_at),
      email_verified: updatedUser.email_verified,
      subscription_tier: updatedUser.subscription_tier,
      consent_given: updatedUser.consent_given,
      consent_date: updatedUser.consent_date ? new Date(updatedUser.consent_date) : undefined,
      last_login: new Date(updatedUser.last_login),
      login_count: updatedUser.login_count,
      oauth_provider: updatedUser.oauth_provider,
      oauth_provider_id: updatedUser.oauth_provider_id,
      oauth_provider_data: updatedUser.oauth_provider_data
    }

    return NextResponse.json({
      success: true,
      profile,
      message: 'Profile updated successfully'
    })
  } catch (error) {
    console.error('Profile PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
