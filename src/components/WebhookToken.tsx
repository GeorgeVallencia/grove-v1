'use client'

export default function WebhookToken({ token }: { token: string }) {
  const copyToken = () => {
    navigator.clipboard.writeText(token)
    alert('Token copied!')
  }
  
  const copyUrl = () => {
    const webhookUrl = `${window.location.origin}/api/webhooks/intake`
    navigator.clipboard.writeText(webhookUrl)
    alert('Webhook URL copied!')
  }

  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/intake` : 'http://localhost:3000/api/webhooks/intake'

  return (
    <div className="mb-6 bg-[#1a2e1a] border border-green-900/40 rounded-2xl p-6">
      <h2 className="text-white text-lg font-semibold mb-2">
        Connect Any App
      </h2>
      <p className="text-green-400/60 text-sm mb-4">
        Use Zapier or Make to send data from 5,000+ apps to Grove
      </p>
      
      <div className="space-y-3">
        <div>
          <label className="text-green-300/70 text-xs block mb-1">Webhook URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={webhookUrl}
              readOnly
              className="flex-1 bg-[#0f1a0f] border border-green-900/50 rounded-xl px-3 py-2 text-green-400 text-xs font-mono"
            />
            <button onClick={copyUrl} className="bg-green-900/30 hover:bg-green-900/50 border border-green-500/30 text-green-400 px-3 py-2 rounded-xl text-xs">
              Copy
            </button>
          </div>
        </div>

        <div>
          <label className="text-green-300/70 text-xs block mb-1">Your Token</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={token}
              readOnly
              className="flex-1 bg-[#0f1a0f] border border-green-900/50 rounded-xl px-3 py-2 text-green-400 text-xs font-mono"
            />
            <button onClick={copyToken} className="bg-green-900/30 hover:bg-green-900/50 border border-green-500/30 text-green-400 px-3 py-2 rounded-xl text-xs">
              Copy
            </button>
          </div>
        </div>
      </div>

      <details className="mt-4">
        <summary className="text-green-400/60 text-xs cursor-pointer hover:text-green-400">
          Example: Track Audible listening time
        </summary>
        <pre className="bg-[#0f1a0f] rounded-lg p-3 mt-2 text-green-400 text-xs overflow-x-auto">
{`POST ${webhookUrl}
Content-Type: application/json

{
  "token": "${token}",
  "metric": "audible_minutes",
  "value": 45,
  "unit": "minutes"
}`}
        </pre>
      </details>
    </div>
  )
}

