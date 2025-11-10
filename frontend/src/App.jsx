import { useState } from 'react'
import Sidebar from './components/Sidebar'
import ListView from './components/ListView'
import CardView from './components/CardView'
import MapView from './components/MapView'
import BusinessForm from './components/BusinessForm'
import EventForm from './components/EventForm'
import BusinessProfile from './components/BusinessProfile'

function App() {
  const [currentView, setCurrentView] = useState('map')
  const [selectedBusinessId, setSelectedBusinessId] = useState(null)

  const handleBusinessClick = (businessId) => {
    setSelectedBusinessId(businessId)
  }

  const handleBackFromBusiness = () => {
    setSelectedBusinessId(null)
  }

  const renderView = () => {
    // Show business profile if a business is selected
    if (selectedBusinessId) {
      return (
        <BusinessProfile
          businessId={selectedBusinessId}
          onBack={handleBackFromBusiness}
        />
      )
    }

    // Otherwise show the current view
    switch (currentView) {
      case 'list':
        return <ListView onBusinessClick={handleBusinessClick} />
      case 'cards':
        return <CardView onBusinessClick={handleBusinessClick} />
      case 'map':
        return <MapView onBusinessClick={handleBusinessClick} />
      case 'submit-business':
        return <BusinessForm />
      case 'submit-event':
        return <EventForm />
      default:
        return <MapView onBusinessClick={handleBusinessClick} />
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-primary text-primary-foreground p-4 shadow-lg">
        <h1 className="text-2xl font-bold">PopMap</h1>
        <p className="text-sm opacity-90">Discover local popup events in Washington DC</p>
      </header>
      <main className="flex-1 flex overflow-hidden">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />
        <div className="flex-1 overflow-auto">
          {renderView()}
        </div>
      </main>
    </div>
  )
}

export default App
