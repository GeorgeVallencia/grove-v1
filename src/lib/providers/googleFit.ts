import { ProviderSyncResult } from './index'

export async function syncGoogleFit(
  userId: string,
  accessToken: string,
  config?: any
): Promise<ProviderSyncResult[]> {
  const today = new Date().toISOString().split('T')[0]
  const startOfDay = new Date(today).getTime()
  const endOfDay = startOfDay + (24 * 60 * 60 * 1000)

  const results: ProviderSyncResult[] = []

  // Fetch steps
  try {
    const stepsResponse = await fetch(
      `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aggregateBy: [{
            dataTypeName: 'com.google.step_count.delta',
            dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'
          }],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startOfDay,
          endTimeMillis: endOfDay
        })
      }
    )

    const stepsData = await stepsResponse.json()
    
    if (stepsData.bucket && stepsData.bucket[0]?.dataset[0]?.point) {
      const steps = stepsData.bucket[0].dataset[0].point.reduce((sum: number, p: any) => {
        return sum + (p.value[0]?.intVal || 0)
      }, 0)

      results.push({
        metric_id: 'steps',
        date: today,
        value: steps,
        source: 'google_fit',
        raw_data: { dataType: 'steps', points: stepsData.bucket[0].dataset[0].point }
      })
    }
  } catch (error) {
    console.error('Google Fit steps error:', error)
  }

  // Fetch distance (in meters, convert to km)
  try {
    const distanceResponse = await fetch(
      `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aggregateBy: [{
            dataTypeName: 'com.google.distance.delta',
            dataSourceId: 'derived:com.google.distance.delta:com.google.android.gms:merge_distance_delta'
          }],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startOfDay,
          endTimeMillis: endOfDay
        })
      }
    )

    const distanceData = await distanceResponse.json()
    
    if (distanceData.bucket && distanceData.bucket[0]?.dataset[0]?.point) {
      const meters = distanceData.bucket[0].dataset[0].point.reduce((sum: number, p: any) => {
        return sum + (p.value[0]?.fpVal || 0)
      }, 0)
      
      const km = meters / 1000

      results.push({
        metric_id: 'distance_ran',
        date: today,
        value: Math.round(km * 100) / 100,
        source: 'google_fit',
        raw_data: { dataType: 'distance', meters, points: distanceData.bucket[0].dataset[0].point }
      })
    }
  } catch (error) {
    console.error('Google Fit distance error:', error)
  }

  // Fetch active minutes
  try {
    const activeResponse = await fetch(
      `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aggregateBy: [{
            dataTypeName: 'com.google.active_minutes',
            dataSourceId: 'derived:com.google.active_minutes:com.google.android.gms:merge_active_minutes'
          }],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startOfDay,
          endTimeMillis: endOfDay
        })
      }
    )

    const activeData = await activeResponse.json()
    
    if (activeData.bucket && activeData.bucket[0]?.dataset[0]?.point) {
      const minutes = activeData.bucket[0].dataset[0].point.reduce((sum: number, p: any) => {
        return sum + (p.value[0]?.intVal || 0)
      }, 0)

      results.push({
        metric_id: 'active_minutes',
        date: today,
        value: minutes,
        source: 'google_fit',
        raw_data: { dataType: 'active_minutes', points: activeData.bucket[0].dataset[0].point }
      })
    }
  } catch (error) {
    console.error('Google Fit active minutes error:', error)
  }

  return results
}

