'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type CustomMetric = {
  metric_id: string
  name: string
  unit: string
  default_goal: number | null
  category: string
}

export default function LogEntry({ 
  userId, 
  metrics 
}: { 
  userId: string
  metrics: CustomMetric[]
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Insert/update all logged metrics
      const entries = Object.entries(values)
        .filter(([_, value]) => value !== '')
        .map(([metricId, value]) => ({
          user_id: userId,
          metric_id: metricId,
          date: today,
          value: parseFloat(value),
          source: 'manual'
        }))

      if (entries.length === 0) {
        setMessage('Please log at least one metric')
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('user_metrics')
        .upsert(entries, {
          onConflict: 'user_id, metric_id, date'
        })

      if (error) throw error

      // Now evaluate garden growth
      await fetch('/api/garden/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      setMessage('✓ Logged successfully! Your garden is growing.')
      setValues({})
      
      setTimeout(() => {
        router.refresh()
        setMessage('')
      }, 1500)

    } catch (error) {
      console.error('Log error:', error)
      setMessage('Something went wrong. Please try again.')
    }

    setLoading(false)
  }

  return (
    <div className="bg-[#1a2e1a] border border-green-900/40 rounded-2xl p-6">
      <h2 className="text-white text-lg font-semibold mb-4">Log today's progress</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {metrics.map(metric => (
          <div key={metric.metric_id}>
            <label className="text-green-300/70 text-sm block mb-1">
              {metric.name}
              {metric.default_goal && (
                <span className="text-green-900 ml-2">(goal: {metric.default_goal})</span>
              )}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={values[metric.metric_id] || ''}
                onChange={e => setValues({ ...values, [metric.metric_id]: e.target.value })}
                placeholder="0"
                className="flex-1 bg-[#0f1a0f] border border-green-900/50 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-green-500/50"
              />
              <span className="text-green-400/60 text-sm min-w-20">{metric.unit}</span>
            </div>
          </div>
        ))}

        {message && (
          <p className={`text-sm px-4 py-2 rounded-lg ${
            message.includes('✓') 
              ? 'text-green-400 bg-green-900/20' 
              : 'text-red-400 bg-red-900/20'
          }`}>
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-ful cursor-pointer bg-green-600 hover:bg-green-500 disabled:bg-green-900 text-white font-medium py-3 rounded-xl transition-colors"
        >
          {loading ? 'Saving...' : 'Log progress'}
        </button>
      </form>
    </div>
  )
}

