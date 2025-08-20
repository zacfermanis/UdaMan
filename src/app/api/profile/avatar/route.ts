import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/config'
import { validateSession } from '@/lib/auth/session'
import { rateLimit } from '@/lib/rate-limit'

const supabase = createServerClient()

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
    const { success } = await rateLimit(ip, 'avatar_upload', 3, 60) // 3 uploads per minute
    if (!success) {
      return NextResponse.json(
        { error: 'Too many avatar upload requests' },
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

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('avatar') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No avatar file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a JPG, PNG, or WebP image.' },
        { status: 400 }
      )
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = `avatars/${sessionResult.session.userId}/${timestamp}.${fileExtension}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-uploads')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload avatar' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('user-uploads')
      .getPublicUrl(fileName)

    if (!urlData.publicUrl) {
      return NextResponse.json(
        { error: 'Failed to generate avatar URL' },
        { status: 500 }
      )
    }

    // Update user profile with new avatar URL
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        avatar_url: urlData.publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionResult.session.userId)

    if (updateError) {
      console.error('Error updating user avatar:', updateError)
      // Try to delete the uploaded file if profile update fails
      await supabase.storage
        .from('user-uploads')
        .remove([fileName])
      
      return NextResponse.json(
        { error: 'Failed to update profile with new avatar' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      avatar_url: urlData.publicUrl,
      message: 'Avatar uploaded successfully'
    })
  } catch (error) {
    console.error('Avatar upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
