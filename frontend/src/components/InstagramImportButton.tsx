import { useState } from 'react'
import { Instagram, Download, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { instagramApi } from '../services/api'
import type { InstagramImportResult } from '../types'

interface InstagramImportButtonProps {
  hasHandle: boolean
  isPremium: boolean
  onImportComplete?: (result: InstagramImportResult) => void
}

export function InstagramImportButton({
  hasHandle,
  isPremium,
  onImportComplete,
}: InstagramImportButtonProps) {
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<InstagramImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleImport = async () => {
    setImporting(true)
    setError(null)
    setResult(null)

    try {
      const importResult = await instagramApi.import()
      setResult(importResult)
      onImportComplete?.(importResult)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Import failed. Please try again.'
      setError(errorMessage)
    } finally {
      setImporting(false)
    }
  }

  const isDisabled = !hasHandle || !isPremium || importing

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Instagram className="w-5 h-5 text-pink-500" />
          <h3 className="font-semibold">Import from Instagram</h3>
        </div>
      </div>

      <p className="text-gray-600 text-sm mb-4">
        Import events from your Instagram posts tagged with #popmap. Posts will be created as drafts
        for your review.
      </p>

      <button
        onClick={handleImport}
        disabled={isDisabled}
        className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
      >
        {importing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Importing...
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            Import Posts
          </>
        )}
      </button>

      {!hasHandle && isPremium && (
        <p className="mt-2 text-sm text-amber-600">
          Please add your Instagram handle in settings first.
        </p>
      )}

      {!isPremium && (
        <p className="mt-2 text-sm text-gray-500">
          <a href="/billing" className="text-blue-600 hover:underline">
            Upgrade to Premium
          </a>{' '}
          to use Instagram import.
        </p>
      )}

      {result && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="font-medium">Import Complete</span>
          </div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>✓ {result.imported} event(s) imported as drafts</li>
            {result.skipped_duplicate > 0 && (
              <li>⊘ {result.skipped_duplicate} skipped (already imported)</li>
            )}
            {result.skipped_not_event > 0 && (
              <li>⊘ {result.skipped_not_event} skipped (not an event)</li>
            )}
          </ul>
          {result.draft_ids.length > 0 && (
            <a
              href="/dashboard/events?status=pending"
              className="inline-block mt-3 text-blue-600 hover:underline text-sm"
            >
              View Drafts →
            </a>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 rounded-lg flex items-start gap-2">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}
