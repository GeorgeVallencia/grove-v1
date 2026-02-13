import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encryptToken } from '@/lib/crypto'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const userId = searchParams.get('state')

  if (!code || !userId) {
    return NextResponse.redirect(new URL('/dashboard?error=oauth_failed', request.url))
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      })
    })

    if (!tokenResponse.ok) {
      throw new Error('Token exchange failed')
    }

    const tokens = await tokenResponse.json()
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    // Save encrypted tokens to database
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: userId,
        provider_id: 'gmail',
        status: 'active',
        access_token: encryptToken(tokens.access_token),
        refresh_token: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
        token_expires_at: expiresAt.toISOString(),
        last_synced_at: null,
      }, {
        onConflict: 'user_id, provider_id'
      })

    if (error) throw error

    // Trigger first sync immediately
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, providerId: 'gmail' })
    })

    return NextResponse.redirect(new URL('/dashboard?success=gmail_connected', request.url))

  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(new URL('/dashboard?error=oauth_failed', request.url))
  }
}


// import { NextResponse } from 'next/server'
// import { createClient } from '@/lib/supabase/server'
// import { encryptToken } from '@/lib/crypto'

// export async function GET(request: Request) {
//   const { searchParams } = new URL(request.url)
//   const code = searchParams.get('code')
//   const userId = searchParams.get('state')

//   if (!code || !userId) {
//     return NextResponse.redirect('/dashboard?error=oauth_failed')
//   }

//   try {
//     // Exchange code for tokens
//     const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//       body: new URLSearchParams({
//         code,
//         client_id: process.env.GOOGLE_CLIENT_ID!,
//         client_secret: process.env.GOOGLE_CLIENT_SECRET!,
//         redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`,
//         grant_type: 'authorization_code',
//       })
//     })

//     if (!tokenResponse.ok) {
//       throw new Error('Token exchange failed')
//     }

//     const tokens = await tokenResponse.json()
//     const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

//     // Save encrypted tokens to database
//     const supabase = await createClient()
    
//     const { error } = await supabase
//       .from('user_integrations')
//       .upsert({
//         user_id: userId,
//         provider_id: 'gmail',
//         status: 'active',
//         access_token: encryptToken(tokens.access_token),
//         refresh_token: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
//         token_expires_at: expiresAt.toISOString(),
//         last_synced_at: null,
//       }, {
//         onConflict: 'user_id, provider_id'
//       })

//     if (error) throw error

//     // Trigger first sync immediately
//     await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/sync`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ userId, providerId: 'gmail' })
//     })

//   return NextResponse.redirect(new URL('/dashboard?success=gmail_connected', request.url))

//   } catch (error) {
//     console.error('OAuth callback error:', error)
//     return NextResponse.redirect(new URL('/dashboard?error=oauth_failed', request.url))
//   }
// }