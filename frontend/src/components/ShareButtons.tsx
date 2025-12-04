import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Share2, Facebook, Twitter } from 'lucide-react'
import { trackShare } from '../services/analytics'
import type { PageType } from '../types'

interface ShareButtonsProps {
  url: string
  title: string
  description?: string
  pageType?: PageType
  objectId?: number
}

export function ShareButtons({ url, title, description, pageType, objectId }: ShareButtonsProps) {
  const [isSharing, setIsSharing] = useState(false)

  const shareData = {
    title,
    text: description || title,
    url,
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        setIsSharing(true)
        await navigator.share(shareData)
        // Track after successful share
        if (pageType && objectId) {
          trackShare('native', pageType, objectId)
        }
      } catch (error) {
        // User cancelled or error occurred
        console.log('Share cancelled or failed:', error)
      } finally {
        setIsSharing(false)
      }
    }
  }

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    window.open(facebookUrl, '_blank', 'width=600,height=400')
    if (pageType && objectId) {
      trackShare('facebook', pageType, objectId)
    }
  }

  const handleTwitterShare = () => {
    const text = description ? `${title} - ${description}` : title
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    window.open(twitterUrl, '_blank', 'width=600,height=400')
    if (pageType && objectId) {
      trackShare('twitter', pageType, objectId)
    }
  }

  // If native share is available (typically on mobile), show a single share button
  if (navigator.share) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleNativeShare}
          disabled={isSharing}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share Event
        </Button>
      </div>
    )
  }

  // Otherwise, show individual social media buttons
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground mr-1">Share:</span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleFacebookShare}
      >
        <Facebook className="h-4 w-4 mr-2" />
        Facebook
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleTwitterShare}
      >
        <Twitter className="h-4 w-4 mr-2" />
        X
      </Button>
    </div>
  )
}
