'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ChatLog({ userId }: { userId: string }) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState('')
  
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setLoading(true)
    setResponse('')

    try {
      const res = await fetch('/api/chat/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, userId })
      })

      const data = await res.json()

      if (data.success) {
        const logged = data.logged || []
        const newMetrics = data.new_metrics || []

        if (logged.length === 0) {
          setResponse("I couldn't find anything trackable in that message. Try something like 'read 30 pages' or 'ran 5km'")
        } else {
          const loggedText = logged.map((a: any) => 
            `✓ ${a.value} ${a.unit} (${a.metric.replace(/_/g, ' ')})`
          ).join('\n')

          const newText = newMetrics.length > 0 
            ? `\n\n🌱 Created ${newMetrics.length} new metric(s)` 
            : ''

          setResponse(`Logged:\n${loggedText}${newText}`)
          
          setTimeout(() => {
            router.refresh()
            setMessage('')
            setResponse('')
          }, 2000)
        }
      } else {
        setResponse('Something went wrong. Try again.')
      }
    } catch (error) {
      console.error('Chat error:', error)
      setResponse('Error logging activity. Try again.')
    }

    setLoading(false)
  }

  return (
    <div className="bg-[#1a2e1a] border border-green-900/40 rounded-2xl p-6">
      <h2 className="text-white text-lg font-semibold mb-2 flex items-center gap-2">
        <span>💬</span>
        Quick Log
      </h2>
      <p className="text-green-400/60 text-sm mb-4">
        Just tell me what you did today
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="e.g. read 40 pages, ran 5km, called mum for 20 mins"
          className="w-full bg-[#0f1a0f] border border-green-900/50 rounded-xl px-4 py-3 text-white placeholder-green-900 text-sm focus:outline-none focus:border-green-500/50"
          disabled={loading}
        />

        {response && (
          <div className={`text-sm px-4 py-3 rounded-lg ${
            response.includes('✓') 
              ? 'bg-green-900/20 text-green-400' 
              : 'bg-yellow-900/20 text-yellow-400'
          }`}>
            <pre className="whitespace-pre-wrap font-sans">{response}</pre>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
        >
          {loading ? 'Analyzing...' : 'Log it'}
        </button>
      </form>

      <p className="text-green-400/40 text-xs mt-4">
        Tip: Be specific with numbers and units for best results
      </p>
    </div>
  )
}

