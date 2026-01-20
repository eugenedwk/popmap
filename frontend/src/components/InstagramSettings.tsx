import { useState } from 'react'
import { Instagram, Save, AlertCircle, CheckCircle } from 'lucide-react'
import type { Business } from '../types'

interface InstagramSettingsProps {
  business: Business
  onUpdate: (handle: string) => Promise<void>
  isPremium: boolean
}

export function InstagramSettings({ business, onUpdate, isPremium }: InstagramSettingsProps) {
  const [handle, setHandle] = useState(business.instagram_handle || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      // Remove @ if user included it
      const cleanHandle = handle.replace(/^@/, '')
      await onUpdate(cleanHandle)
      setMessage({ type: 'success', text: 'Instagram handle saved!' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Instagram className="w-5 h-5 text-pink-500" />
        <h3 className="font-semibold">Instagram Integration</h3>
        {isPremium && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Premium</span>
        )}
      </div>

      {!isPremium ? (
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-gray-600 mb-2">
            Import events directly from your Instagram posts with a Premium subscription.
          </p>
          <a href="/billing" className="text-blue-600 hover:underline text-sm">
            Upgrade to Premium →
          </a>
        </div>
      ) : (
        <>
          <p className="text-gray-600 text-sm mb-4">
            Add your Instagram handle to import events from posts tagged #popmap
          </p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="yourbusiness"
                className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxLength={30}
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving || handle === (business.instagram_handle || '')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>

          {message && (
            <div
              className={`mt-3 flex items-center gap-2 text-sm ${
                message.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {message.text}
            </div>
          )}
        </>
      )}
    </div>
  )
}
