import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { encrypt } from '@/lib/crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const userId = searchParams.get('state')

  console.log('Google Fit callback received:', { code: code?.substring(0, 10), userId })

  if (!code || !userId) {
    console.error('Missing code or userId')
    return NextResponse.redirect(new URL('/dashboard?error=auth_failed', request.url))
  }

  try {
    const redirectUri = `${new URL(request.url).origin}/api/auth/google-fit/callback`
    
    console.log('Exchanging code for tokens...')
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })

    const tokens = await tokenResponse.json()
    console.log('Token response:', { 
      hasAccessToken: !!tokens.access_token, 
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in 
    })

    if (!tokens.access_token) {
      console.error('No access token in response:', tokens)
      throw new Error('No access token received')
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    console.log('Saving to database...')
    const { data, error } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: userId,
        provider_id: 'google_fit',
        access_token: encrypt(tokens.access_token),
        refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expires_at: expiresAt,
        status: 'active'
      }, {
        onConflict: 'user_id, provider_id'
      })
      .select()

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    console.log('Successfully saved Google Fit integration:', data)

    return NextResponse.redirect(new URL('/dashboard?connected=google_fit', request.url))

  } catch (error: any) {
    console.error('Google Fit OAuth error:', error)
    return NextResponse.redirect(new URL('/dashboard?error=auth_failed', request.url))
  }
}
