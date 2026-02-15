import { syncGmail } from './gmail'
import { syncGoogleFit } from './googleFit'
import { syncGitHub } from './github'

export type ProviderSyncResult = {
  metric_id: string
  date: string
  value: number
  source: string
  raw_data?: any
}

export async function syncProvider(
  userId: string,
  providerId: string,
  accessToken: string,
  config?: any
): Promise<ProviderSyncResult[]> {
  switch (providerId) {
    case 'gmail':
      return syncGmail(userId, accessToken, config)
    
    case 'google_fit':
      return syncGoogleFit(userId, accessToken, config)
    
    case 'github':
      return syncGitHub(userId, accessToken, config)
    
    default:
      throw new Error(`Unknown provider: ${providerId}`)
  }
}