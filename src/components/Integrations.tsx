'use client'

import { useState } from 'react'

export default function Integrations({ 
  userId, 
  hasGmail,
  hasGoogleFit,
  hasGitHub
}: { 
  userId: string
  hasGmail: boolean
  hasGoogleFit: boolean
  hasGitHub: boolean
}) {
  const [syncing, setSyncing] = useState<string | null>(null)

  const handleSync = async (providerId: string) => {
    setSyncing(providerId)
    try {
      await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, providerId })
      })
      alert(`${providerId} synced!`)
      window.location.reload()
    } catch (error) {
      alert('Sync failed')
    } finally {
      setSyncing(null)
    }
  }

  return (
    <div className="mb-6 bg-[#1a2e1a] border border-green-900/40 rounded-2xl p-6">
      <h2 className="text-white text-lg font-semibold mb-4">Integrations</h2>
      
      <div className="space-y-3">
        {/* Gmail */}
        {!hasGmail ? (<a href={`/api/auth/google?userId=${userId}`}
            className="cursor-pointer block bg-green-900/30 hover:bg-green-900/50 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl text-center"
          >
            📧 Connect Gmail
          </a>
        ) : (
          <button
            onClick={() => handleSync('gmail')}
            disabled={syncing === 'gmail'}
            className="cursor-pointer w-full bg-green-900/30 hover:bg-green-900/50 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl"
          >
            {syncing === 'gmail' ? 'Syncing...' : '📧 Sync Gmail Now'}
          </button>
        )}

        {/* Google Fit */}
        {!hasGoogleFit ? (<a href={`/api/auth/google-fit?userId=${userId}`}
            className="cursor-pointer block bg-green-900/30 hover:bg-green-900/50 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl text-center"
          >
            🏃 Connect Google Fit
          </a>
        ) : (
          <button
            onClick={() => handleSync('google_fit')}
            disabled={syncing === 'google_fit'}
            className="cursor-pointer w-full bg-green-900/30 hover:bg-green-900/50 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl"
          >
            {syncing === 'google_fit' ? 'Syncing...' : '🏃 Sync Google Fit Now'}
          </button>
        )}

        {/* GitHub */}
        {!hasGitHub ? (<a href={`/api/auth/github?userId=${userId}`}
            className="cursor-pointer block bg-green-900/30 hover:bg-green-900/50 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl text-center"
          >
            💻 Connect GitHub
          </a>
        ) : (
          <button
            onClick={() => handleSync('github')}
            disabled={syncing === 'github'}
            className="cursor-pointer w-full bg-green-900/30 hover:bg-green-900/50 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl"
          >
            {syncing === 'github' ? 'Syncing...' : '💻 Sync GitHub Now'}
          </button>
        )}
      </div>
    </div>
  )
}

