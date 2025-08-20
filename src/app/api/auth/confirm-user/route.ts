import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/config'

export async function POST(request: NextRequest) {
  try {
    const { email, userId } = await request.json()

    if (!email && !userId) {
      return NextResponse.json(
        { error: 'Email or user ID is required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createServerClient()

    // Update user verification status in our custom users table
    const updateData: any = { 
      email_verified: true,
      updated_at: new Date().toISOString()
    }

    let query = supabaseAdmin
      .from('users')
      .update(updateData)

    if (userId) {
      query = query.eq('id', userId)
    } else if (email) {
      query = query.eq('email', email)
    }

    const { data, error } = await query.select()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to confirm user' },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Also update the Supabase Auth user to mark email as confirmed
    try {
      if (userId) {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          email_confirm: true
        })
      } else if (email) {
        // Get user by email first
        const { data: authUser } = await supabaseAdmin.auth.admin.listUsers()
        const user = authUser.users.find(u => u.email === email)
        if (user) {
          await supabaseAdmin.auth.admin.updateUserById(user.id, {
            email_confirm: true
          })
        }
      }
    } catch (authError) {
      console.error('Failed to update Supabase Auth user:', authError)
      // Don't fail the verification if this step fails
    }

    return NextResponse.json(
      { 
        message: 'User confirmed successfully',
        user: data[0]
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in confirm-user API:', error)
    
    return NextResponse.json(
      { error: 'Failed to confirm user' },
      { status: 500 }
    )
  }
}
