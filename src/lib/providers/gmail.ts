import type { ProviderSyncResult } from './index'

export async function sync(
  userId: string,
  accessToken: string,
  config: any
): Promise<ProviderSyncResult[]> {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = Math.floor((Date.now() - 86400000) / 1000) // Unix timestamp

  // Which label to track (default: all sent emails)
  const labelFilter = config?.label || 'SENT'
  
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=${labelFilter}&q=after:${yesterday}&maxResults=100`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  )

  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.status}`)
  }

  const data = await response.json()
  const emailCount = data.messages?.length ?? 0

  return [
    {
      metric_id: 'gmail.emails_sent',
      date: today,
      value: emailCount,
      source: 'auto',
      raw_data: { messageCount: emailCount, label: labelFilter }
    }
  ]
}

