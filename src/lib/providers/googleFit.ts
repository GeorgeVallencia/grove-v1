import type { ProviderSyncResult } from './index'

export async function sync(
  userId: string,
  accessToken: string,
  config: any
): Promise<ProviderSyncResult[]> {
  // TODO: Implement Google Fit integration
  throw new Error('Google Fit integration not yet implemented')
}
