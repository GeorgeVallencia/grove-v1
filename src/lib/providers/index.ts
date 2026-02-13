// This is the interface every provider must implement
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
  config: any
): Promise<ProviderSyncResult[]> {
  const providers: Record<string, () => Promise<ProviderSyncResult[]>> = {
    gmail: () => import('./gmail').then(m => m.sync(userId, accessToken, config)),
    google_fit: () => import('./googleFit').then(m => m.sync(userId, accessToken, config)),
    monkeytype: () => import('./monkeytype').then(m => m.sync(userId, config)),
    github: () => import('./github').then(m => m.sync(userId, accessToken, config)),
  }

  const handler = providers[providerId]
  if (!handler) throw new Error(`Unknown provider: ${providerId}`)

  return handler()
}

