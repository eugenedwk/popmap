import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Sidebar from './components/Sidebar';
import ListView from './components/ListView';
import CardView from './components/CardView';
import MapView from './components/MapView';
import BusinessForm from './components/BusinessForm';
import EventForm from './components/EventForm';
import BusinessProfile from './components/BusinessProfile';
import EventDetailPage from './components/EventDetailPage';
import BrandsView from './components/BrandsView';
import MyRSVPs from './components/MyRSVPs';
import { trackPageView, analytics } from './lib/analytics';
import logo from './noun-cafe-4738717-007435.png';

type ViewType =
  | 'list'
  | 'cards'
  | 'map'
  | 'brands'
  | 'submit-business'
  | 'submit-event';

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewType>('map');
  const navigate = useNavigate();
  const location = useLocation();

  const handleBusinessClick = (businessId: number) => {
    analytics.trackBusinessClick(businessId);
    navigate(`/p/${businessId}`);
  };

  // Track page views and update currentView based on URL path
  useEffect(() => {
    const path = location.pathname;
    trackPageView(path);

    if (path === '/list' || path.startsWith('/list')) {
      setCurrentView('list');
    } else if (path === '/cards' || path.startsWith('/cards')) {
      setCurrentView('cards');
    } else if (path === '/brands' || path.startsWith('/brands')) {
      setCurrentView('brands');
    } else if (path === '/submit-business') {
      setCurrentView('submit-business');
      analytics.trackFormView('business');
    } else if (path === '/submit-event') {
      setCurrentView('submit-event');
      analytics.trackFormView('event');
    } else if (!path.startsWith('/p/') && !path.startsWith('/e/')) {
      setCurrentView('map');
    }
  }, [location.pathname]);

  const handleViewChange = (view: ViewType) => {
    analytics.trackViewChange(view);
    setCurrentView(view);
    if (view === 'list') {
      navigate('/list');
    } else if (view === 'cards') {
      navigate('/cards');
    } else if (view === 'brands') {
      navigate('/brands');
    } else if (view === 'submit-business') {
      navigate('/submit-business');
    } else if (view === 'submit-event') {
      navigate('/submit-event');
    } else {
      navigate('/');
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'list':
        return <ListView onBusinessClick={handleBusinessClick} />;
      case 'cards':
        return <CardView onBusinessClick={handleBusinessClick} />;
      case 'map':
        return <MapView onBusinessClick={handleBusinessClick} />;
      case 'brands':
        return <BrandsView onBusinessClick={handleBusinessClick} />;
      case 'submit-business':
        return <BusinessForm />;
      case 'submit-event':
        return <EventForm />;
      default:
        return <MapView onBusinessClick={handleBusinessClick} />;
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-primary text-primary-foreground p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <button
            onClick={() => {
              analytics.trackHomeClick();
              navigate('/');
            }}
            className="flex items-start gap-3 hover:opacity-80 transition-opacity"
          >
            <img src={logo} alt="PopMap Logo" className="h-10 w-10" />
            <div>
              <h1 className="text-2xl font-bold">PopMap</h1>
              <p className="text-sm opacity-90">
                Discover local popup events in the DMV region.
              </p>
            </div>
          </button>
        </div>
      </header>
      <main className="flex-1 flex overflow-hidden">
        <Routes>
          <Route
            path="/p/:businessId"
            element={
              <>
                <Sidebar
                  currentView={currentView}
                  onViewChange={handleViewChange}
                />
                <div className="flex-1 overflow-auto">
                  <BusinessProfile />
                </div>
              </>
            }
          />
          <Route
            path="/e/:eventId"
            element={
              <>
                <Sidebar
                  currentView={currentView}
                  onViewChange={handleViewChange}
                />
                <div className="flex-1 overflow-auto">
                  <EventDetailPage />
                </div>
              </>
            }
          />
          <Route
            path="/my-rsvps"
            element={
              <>
                <Sidebar
                  currentView={currentView}
                  onViewChange={handleViewChange}
                />
                <div className="flex-1 overflow-auto">
                  <MyRSVPs />
                </div>
              </>
            }
          />
          <Route
            path="/brands"
            element={
              <>
                <Sidebar
                  currentView={currentView}
                  onViewChange={handleViewChange}
                />
                <div className="flex-1 overflow-auto">
                  <BrandsView onBusinessClick={handleBusinessClick} />
                </div>
              </>
            }
          />
          <Route
            path="/*"
            element={
              <>
                <Sidebar
                  currentView={currentView}
                  onViewChange={handleViewChange}
                />
                <div className="flex-1 overflow-auto">{renderView()}</div>
              </>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <AppContent />
    </HelmetProvider>
  );
}

export default App;
