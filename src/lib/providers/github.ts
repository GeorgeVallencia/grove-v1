import type { ProviderSyncResult } from './index'

export async function sync(
  userId: string,
  accessToken: string,
  config: any
): Promise<ProviderSyncResult[]> {
  // TODO: Implement GitHub integration
  throw new Error('GitHub integration not yet implemented')
}
