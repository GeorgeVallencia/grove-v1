import { createClient } from '@/lib/supabase/server'
import { encryptToken, decryptToken } from '@/lib/crypto'

export async function getValidAccessToken(userId: string, providerId: string): Promise<string> {
  const supabase = await createClient()

  const { data: integration } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider_id', providerId)
    .single()

  if (!integration) {
    throw new Error(`${providerId} not connected`)
  }

  const expiresAt = new Date(integration.token_expires_at)
  const now = new Date()
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

  // Token still valid for more than 5 minutes
  if (expiresAt > fiveMinutesFromNow) {
    return decryptToken(integration.access_token)
  }

  // Need to refresh
  if (!integration.refresh_token) {
    throw new Error('No refresh token available')
  }

  const refreshToken = decryptToken(integration.refresh_token)

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  })

  if (!response.ok) {
    // Refresh token is dead - mark as disconnected
    await supabase
      .from('user_integrations')
      .update({
        status: 'disconnected',
        disconnected_at: new Date().toISOString(),
        error_message: 'Refresh token expired. Please reconnect.'
      })
      .eq('user_id', userId)
      .eq('provider_id', providerId)

    throw new Error('Refresh token expired')
  }

  const tokens = await response.json()
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000)

  // Save new access token
  await supabase
    .from('user_integrations')
    .update({
      access_token: encryptToken(tokens.access_token),
      token_expires_at: newExpiresAt.toISOString(),
      status: 'active',
      error_message: null
    })
    .eq('user_id', userId)
    .eq('provider_id', providerId)

  return tokens.access_token
}
