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

  if (!code || !userId) {
    return NextResponse.redirect(new URL('/dashboard?error=auth_failed', request.url))
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      })
    })

    const tokens = await tokenResponse.json()

    if (!tokens.access_token) {
      throw new Error('No access token received')
    }

    await supabase
      .from('user_integrations')
      .upsert({
        user_id: userId,
        provider_id: 'github',
        access_token: encrypt(tokens.access_token),
        status: 'active'
      }, {
        onConflict: 'user_id, provider_id'
      })

    return NextResponse.redirect(new URL('/dashboard?connected=github', request.url))

  } catch (error: any) {
    console.error('GitHub OAuth error:', error)
    return NextResponse.redirect(new URL('/dashboard?error=auth_failed', request.url))
  }
}