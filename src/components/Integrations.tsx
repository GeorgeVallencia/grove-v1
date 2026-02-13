'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Integrations({ 
  userId,
  hasGmail 
}: { 
  userId: string
  hasGmail: boolean
}) {
  const [syncing, setSyncing] = useState(false)
  const router = useRouter()

  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, providerId: 'gmail' })
      })

      const result = await response.json()
      
      if (result.success) {
        router.refresh()
      } else {
        alert('Sync failed. Try again.')
      }
    } catch (error) {
      console.error('Sync error:', error)
      alert('Sync failed. Try again.')
    }
    setSyncing(false)
  }

  return (
    <div className="mb-6">
      <h2 className="text-white text-lg font-semibold mb-3">Integrations</h2>
      <div className="flex gap-3">
        {hasGmail ? (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="bg-green-900/30 border border-green-500/50 text-green-400 font-medium px-4 py-2 rounded-xl transition-colors flex items-center gap-2 hover:bg-green-900/50 disabled:opacity-50"
          >
            <span>📧</span>
            {syncing ? 'Syncing...' : 'Sync Gmail Now'}
          </button>
        ) : (
          <button
            onClick={() => window.location.href = `/api/auth/google?userId=${userId}`}
            className="bg-white hover:bg-gray-100 text-gray-900 font-medium px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
          >
            <span>📧</span>
            Connect Gmail
          </button>
        )}
      </div>
    </div>
  )
}



// 'use client'

// export default function Integrations({ userId }: { userId: string }) {
//   return (
//     <div className="mb-6">
//       <h2 className="text-white text-lg font-semibold mb-3">Integrations</h2>
//       <div className="flex gap-3">
//         <button
//           onClick={() => window.location.href = `/api/auth/google?userId=${userId}`}
//           className="bg-white cursor-pointer hover:bg-gray-100 text-gray-900 font-medium px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
//         >
//           <span>📧</span>
//           Connect Gmail
//         </button>
//       </div>
//     </div>
//   )
// }

