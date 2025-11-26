import PropTypes from 'prop-types'
import { Calendar, Grid3x3, Map, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const views = [
  { id: 'map', label: 'Map', icon: Map },
  { id: 'list', label: 'List', icon: Calendar },
  { id: 'cards', label: 'Cards', icon: Grid3x3 },
  { id: 'brands', label: 'Brands', icon: Building2 },
]

interface MobileNavigationProps {
  currentView: string
  onViewChange: (view: string) => void
}

function MobileNavigation({ currentView, onViewChange }: MobileNavigationProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <nav className="flex items-center justify-around h-16 px-2">
        {views.map((view) => {
          const Icon = view.icon
          const isActive = currentView === view.id
          return (
            <button
              key={view.id}
              onClick={() => onViewChange(view.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs font-medium">{view.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

MobileNavigation.propTypes = {
  currentView: PropTypes.string.isRequired,
  onViewChange: PropTypes.func.isRequired,
}

export default MobileNavigation
