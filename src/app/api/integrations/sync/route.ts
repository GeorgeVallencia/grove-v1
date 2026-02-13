import { NextResponse } from 'next/server'
import { inngest } from '@/inngest/client'

export async function POST(request: Request) {
  try {
    const { userId, providerId } = await request.json()
    await inngest.send({
      name: 'grove/integration.sync',
      data: { userId, providerId }
    })
    return NextResponse.json({ 
      success: true, 
      message: 'Sync queued' 
    })
  } catch (error: any) {
    console.error('Sync dispatch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


