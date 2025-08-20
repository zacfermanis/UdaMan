import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/config'
import { validateSession } from '@/lib/auth/session'
import { AccountSettings } from '@/types/auth'
import { rateLimit } from '@/lib/rate-limit'

const supabase = createServerClient()

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
    const { success } = await rateLimit(ip, 'settings_get', 10, 60) // 10 requests per minute
    if (!success) {
      return NextResponse.json(
        { error: 'Too many settings requests' },
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

    // Get user settings from database using the function
    const { data: settings, error } = await supabase
      .rpc('get_or_create_user_settings', { user_uuid: sessionResult.session.userId })

    if (error || !settings) {
      console.error('Error fetching user settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }

    // Transform database settings to AccountSettings interface
    const accountSettings: AccountSettings = {
      id: settings.id,
      user_id: settings.user_id,
      theme_preference: settings.theme_preference,
      email_notifications: settings.email_notifications,
      push_notifications: settings.push_notifications,
      profile_visibility: settings.profile_visibility,
      data_sharing: settings.data_sharing,
      created_at: new Date(settings.created_at),
      updated_at: new Date(settings.updated_at)
    }

    return NextResponse.json({
      success: true,
      settings: accountSettings
    })
  } catch (error) {
    console.error('Settings GET error:', error)
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
    const { success } = await rateLimit(ip, 'settings_update', 5, 60) // 5 requests per minute
    if (!success) {
      return NextResponse.json(
        { error: 'Too many settings update requests' },
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
    const updateData: Partial<AccountSettings> = await request.json()

    // Validate update data
    const validationErrors: string[] = []

    if (updateData.theme_preference !== undefined) {
      if (!['light', 'dark', 'auto'].includes(updateData.theme_preference)) {
        validationErrors.push('Theme preference must be light, dark, or auto')
      }
    }

    if (updateData.profile_visibility !== undefined) {
      if (!['public', 'private'].includes(updateData.profile_visibility)) {
        validationErrors.push('Profile visibility must be public or private')
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
    if (updateData.theme_preference !== undefined) updateFields.theme_preference = updateData.theme_preference
    if (updateData.email_notifications !== undefined) updateFields.email_notifications = updateData.email_notifications
    if (updateData.push_notifications !== undefined) updateFields.push_notifications = updateData.push_notifications
    if (updateData.profile_visibility !== undefined) updateFields.profile_visibility = updateData.profile_visibility
    if (updateData.data_sharing !== undefined) updateFields.data_sharing = updateData.data_sharing

    // Add updated_at timestamp
    updateFields.updated_at = new Date().toISOString()

    // Update user settings in database
    const { data: updatedSettings, error } = await supabase
      .from('user_settings')
      .update(updateFields)
      .eq('user_id', sessionResult.session.userId)
      .select()
      .single()

    if (error || !updatedSettings) {
      console.error('Error updating user settings:', error)
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      )
    }

    // Transform updated settings to AccountSettings interface
    const accountSettings: AccountSettings = {
      id: updatedSettings.id,
      user_id: updatedSettings.user_id,
      theme_preference: updatedSettings.theme_preference,
      email_notifications: updatedSettings.email_notifications,
      push_notifications: updatedSettings.push_notifications,
      profile_visibility: updatedSettings.profile_visibility,
      data_sharing: updatedSettings.data_sharing,
      created_at: new Date(updatedSettings.created_at),
      updated_at: new Date(updatedSettings.updated_at)
    }

    return NextResponse.json({
      success: true,
      settings: accountSettings,
      message: 'Settings updated successfully'
    })
  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
