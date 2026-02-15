import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: `${origin}/api/auth/github/callback`,
    scope: 'repo,user,read:org',
    state: userId
  })

  const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`

  return NextResponse.redirect(authUrl)
}

