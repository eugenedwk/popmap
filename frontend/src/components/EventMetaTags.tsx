import { Helmet } from 'react-helmet-async'

interface EventMetaTagsProps {
  title: string
  description: string
  image?: string
  url: string
  startDate: string
  endDate: string
  address: string
}

export function EventMetaTags({
  title,
  description,
  image,
  url,
  startDate,
  endDate,
  address,
}: EventMetaTagsProps) {
  const siteName = 'PopMap'
  const fullTitle = `${title} | ${siteName}`

  // Truncate description for meta tags (recommended: 150-160 chars)
  const truncatedDescription = description.length > 160
    ? description.substring(0, 157) + '...'
    : description

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={truncatedDescription} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="event" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={truncatedDescription} />
      <meta property="og:site_name" content={siteName} />
      {image && <meta property="og:image" content={image} />}
      {image && <meta property="og:image:alt" content={title} />}

      {/* Event-specific Open Graph tags */}
      <meta property="event:start_time" content={startDate} />
      <meta property="event:end_time" content={endDate} />
      <meta property="event:location" content={address} />

      {/* Twitter */}
      <meta property="twitter:card" content={image ? "summary_large_image" : "summary"} />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={truncatedDescription} />
      {image && <meta property="twitter:image" content={image} />}
    </Helmet>
  )
}
