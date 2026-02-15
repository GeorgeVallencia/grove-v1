import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/crypto'

export async function getValidAccessToken(userId: string, providerId: string): Promise<string> {
  const supabase = await createClient()

  const { data: integration } = await supabase
    .from('user_integrations')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .eq('provider_id', providerId)
    .single()

  if (!integration) {
    throw new Error('Integration not found')
  }

  // GitHub tokens don't expire, return immediately
  if (providerId === 'github') {
    return decrypt(integration.access_token)
  }

  // For Google tokens, check expiry
  const expiresAt = new Date(integration.expires_at)
  const now = new Date()
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

  if (expiresAt > fiveMinutesFromNow) {
    return decrypt(integration.access_token)
  }

  // Need to refresh
  if (!integration.refresh_token) {
    await supabase
      .from('user_integrations')
      .update({ status: 'disconnected' })
      .eq('user_id', userId)
      .eq('provider_id', providerId)
    
    throw new Error('No refresh token available')
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: decrypt(integration.refresh_token),
      grant_type: 'refresh_token'
    })
  })

  const tokens = await tokenResponse.json()

  if (!tokens.access_token) {
    await supabase
      .from('user_integrations')
      .update({ status: 'disconnected' })
      .eq('user_id', userId)
      .eq('provider_id', providerId)
    
    throw new Error('Failed to refresh token')
  }

  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase
    .from('user_integrations')
    .update({
      access_token: encrypt(tokens.access_token),
      expires_at: newExpiresAt
    })
    .eq('user_id', userId)
    .eq('provider_id', providerId)

  return tokens.access_token
}

