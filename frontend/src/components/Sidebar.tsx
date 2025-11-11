import PropTypes from 'prop-types'
import { Calendar, Grid3x3, Map, Store, CalendarPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

const views = [
  { id: 'map', label: 'Map View', icon: Map, description: 'Interactive map' },
  { id: 'list', label: 'List View', icon: Calendar, description: 'Events by date' },
  { id: 'cards', label: 'Card View', icon: Grid3x3, description: 'Events by category' },
]

const submitOptions = [
  { id: 'submit-business', label: 'Register Business', icon: Store, description: 'Add your business' },
  { id: 'submit-event', label: 'Submit Event', icon: CalendarPlus, description: 'Create a popup event' },
]

function Sidebar({ currentView, onViewChange }) {
  return (
    <div className="w-16 md:w-64 bg-card border-r border-border h-full flex flex-col">
      <div className="p-3 md:p-6 border-b border-border">
        <h2 className="hidden md:block text-lg font-semibold">Navigation</h2>
        <p className="hidden md:block text-sm text-muted-foreground">Browse events or submit your own</p>
      </div>
      <nav className="flex-1 p-2 md:p-4 overflow-auto">
        <div className="mb-6">
          <h3 className="hidden md:block text-xs font-semibold text-muted-foreground mb-2 px-4">VIEW EVENTS</h3>
          <ul className="space-y-2">
            {views.map((view) => {
              const Icon = view.icon
              return (
                <li key={view.id}>
                  <button
                    onClick={() => onViewChange(view.id)}
                    className={cn(
                      'w-full flex items-center md:items-start justify-center md:justify-start gap-3 px-3 md:px-4 py-3 rounded-lg transition-colors text-left',
                      currentView === view.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    )}
                    title={view.label}
                  >
                    <Icon className="h-5 w-5 md:mt-0.5 flex-shrink-0" />
                    <div className="hidden md:block flex-1 min-w-0">
                      <div className="font-medium">{view.label}</div>
                      <div
                        className={cn(
                          'text-xs',
                          currentView === view.id
                            ? 'text-primary-foreground/80'
                            : 'text-muted-foreground'
                        )}
                      >
                        {view.description}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <Separator className="my-4" />

        <div>
          <h3 className="hidden md:block text-xs font-semibold text-muted-foreground mb-2 px-4">SUBMIT</h3>
          <ul className="space-y-2">
            {submitOptions.map((option) => {
              const Icon = option.icon
              return (
                <li key={option.id}>
                  <button
                    onClick={() => onViewChange(option.id)}
                    className={cn(
                      'w-full flex items-center md:items-start justify-center md:justify-start gap-3 px-3 md:px-4 py-3 rounded-lg transition-colors text-left',
                      currentView === option.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    )}
                    title={option.label}
                  >
                    <Icon className="h-5 w-5 md:mt-0.5 flex-shrink-0" />
                    <div className="hidden md:block flex-1 min-w-0">
                      <div className="font-medium">{option.label}</div>
                      <div
                        className={cn(
                          'text-xs',
                          currentView === option.id
                            ? 'text-primary-foreground/80'
                            : 'text-muted-foreground'
                        )}
                      >
                        {option.description}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>
    </div>
  )
}

Sidebar.propTypes = {
  currentView: PropTypes.oneOf(['list', 'cards', 'map', 'submit-business', 'submit-event']).isRequired,
  onViewChange: PropTypes.func.isRequired,
}

export default Sidebar
