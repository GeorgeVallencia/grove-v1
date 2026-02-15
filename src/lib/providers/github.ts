import { ProviderSyncResult } from './index'

export async function syncGitHub(
  userId: string,
  accessToken: string,
  config?: any
): Promise<ProviderSyncResult[]> {
  const today = new Date().toISOString().split('T')[0]
  const results: ProviderSyncResult[] = []

  try {
    // Get user info first
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json'
      }
    })
    const userData = await userResponse.json()
    const username = userData.login

    // Get today's events (commits, PRs, etc.)
    const eventsResponse = await fetch(
      `https://api.github.com/users/${username}/events`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github+json'
        }
      }
    )
    const events = await eventsResponse.json()

    // Filter events from today
    const todayEvents = events.filter((event: any) => {
      const eventDate = new Date(event.created_at).toISOString().split('T')[0]
      return eventDate === today
    })

    // Count commits (PushEvent)
    const commits = todayEvents
      .filter((e: any) => e.type === 'PushEvent')
      .reduce((sum: number, e: any) => sum + (e.payload.commits?.length || 0), 0)

    if (commits > 0) {
      results.push({
        metric_id: 'github_commits',
        date: today,
        value: commits,
        source: 'github',
        raw_data: { 
          events: todayEvents.filter((e: any) => e.type === 'PushEvent'),
          username 
        }
      })
    }

    // Count pull requests (PullRequestEvent)
    const prs = todayEvents.filter((e: any) => e.type === 'PullRequestEvent').length

    if (prs > 0) {
      results.push({
        metric_id: 'github_pull_requests',
        date: today,
        value: prs,
        source: 'github',
        raw_data: { 
          events: todayEvents.filter((e: any) => e.type === 'PullRequestEvent'),
          username 
        }
      })
    }

    // Total contributions today (all activity)
    const contributions = todayEvents.length

    if (contributions > 0) {
      results.push({
        metric_id: 'github_contributions',
        date: today,
        value: contributions,
        source: 'github',
        raw_data: { events: todayEvents, username }
      })
    }

  } catch (error) {
    console.error('GitHub sync error:', error)
  }

  return results
}

