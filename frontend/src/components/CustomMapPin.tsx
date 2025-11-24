import { Coffee, ShoppingBag, Palette, Cake, Calendar } from 'lucide-react'

interface CustomMapPinProps {
  categories: string[]
}

// Category configuration with icons and colors
const CATEGORY_CONFIG: Record<string, { icon: typeof Coffee; color: string; bgColor: string }> = {
  // Your actual categories
  'food&bev': { icon: Coffee, color: '#f97316', bgColor: '#ffedd5' }, // orange
  'dessert': { icon: Cake, color: '#ec4899', bgColor: '#fce7f3' }, // pink
  'arts+crafts': { icon: Palette, color: '#8b5cf6', bgColor: '#ede9fe' }, // violet
  'vintage': { icon: ShoppingBag, color: '#14b8a6', bgColor: '#ccfbf1' }, // teal

  // Default fallback
  default: { icon: Calendar, color: '#6b7280', bgColor: '#f3f4f6' }, // gray
}

function getCategoryConfig(categories: string[]): { icon: typeof Coffee; color: string; bgColor: string } {
  if (!categories || categories.length === 0) {
    return CATEGORY_CONFIG.default
  }

  // Return config for first matching category, or default
  for (const category of categories) {
    const normalizedCategory = category.toLowerCase()
    if (CATEGORY_CONFIG[normalizedCategory]) {
      return CATEGORY_CONFIG[normalizedCategory]
    }
  }

  return CATEGORY_CONFIG.default
}

export function CustomMapPin({ categories }: CustomMapPinProps) {
  const config = getCategoryConfig(categories)
  const Icon = config.icon

  return (
    <div
      className="relative flex items-center justify-center w-10 h-10 rounded-full shadow-lg border-2 cursor-pointer hover:scale-110 transition-transform"
      style={{
        backgroundColor: config.bgColor,
        borderColor: config.color,
      }}
    >
      <Icon
        className="w-5 h-5"
        style={{ color: config.color }}
        strokeWidth={2.5}
      />
      {/* Pin pointer at bottom */}
      <div
        className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0"
        style={{
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: `8px solid ${config.color}`,
        }}
      />
    </div>
  )
}
