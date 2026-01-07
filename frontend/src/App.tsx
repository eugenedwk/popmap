import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import Sidebar from './components/Sidebar';
import MobileNavigation from './components/MobileNavigation';
import ListView from './components/ListView';
import CardView from './components/CardView';
import MapView from './components/MapView';
import { LandingPage } from './components/LandingPage';
import BusinessForm from './components/BusinessForm';
import EventForm from './components/EventForm';
import BusinessProfile from './components/BusinessProfile';
import EventDetailPage from './components/EventDetailPage';
import BrandsView from './components/BrandsView';
import MyRSVPs from './components/MyRSVPs';
import { Signup } from './components/Signup';
import { Login } from './components/Login';
import { AuthCallback } from './components/AuthCallback';
import { BusinessOnboarding } from './components/BusinessOnboarding';
import { BusinessDashboard } from './components/BusinessDashboard';
import { BusinessOwnerHub } from './components/BusinessOwnerHub';
import { FormTemplateBuilder } from './components/FormTemplateBuilder';
import { FormSubmissionsList } from './components/FormSubmissionsList';
import { BusinessAccountDropdown } from './components/BusinessAccountDropdown';
import { BillingPage } from './components/BillingPage';
import { SubdomainRedirect } from './components/SubdomainRedirect';
import { useAuth } from './contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { User, LogOut } from 'lucide-react';
import { trackPageView, analytics } from './lib/analytics';
import { isOnSubdomain, getMainSiteLink } from './lib/subdomain';
import { formsApi } from './services/api';
import { Loader2 } from 'lucide-react';
import logo from './noun-cafe-4738717-007435.png';

// Wrapper component for editing form templates
// Fetches the template to get the businessId, then renders FormTemplateBuilder
function FormTemplateEditWrapper() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  const { data: template, isLoading, error } = useQuery({
    queryKey: ['form-template', templateId],
    queryFn: async () => {
      const response = await formsApi.getTemplateById(parseInt(templateId!));
      return response.data;
    },
    enabled: !!templateId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-destructive">Failed to load form template</p>
      </div>
    );
  }

  return (
    <FormTemplateBuilder
      businessId={template.business}
      templateId={parseInt(templateId!)}
      onSave={() => navigate(`/business/${template.business}/dashboard?tab=forms`)}
    />
  );
}

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
  const { user, isAuthenticated, signOut } = useAuth();

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
        return (
          <div className="flex flex-col">
            <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-80px)] min-h-[400px]">
              <MapView onBusinessClick={handleBusinessClick} />
            </div>
            <LandingPage />
          </div>
        );
      case 'brands':
        return <BrandsView onBusinessClick={handleBusinessClick} />;
      case 'submit-business':
        return <BusinessForm />;
      case 'submit-event':
        return <EventForm />;
      default:
        return (
          <div className="flex flex-col">
            <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-80px)] min-h-[400px]">
              <MapView onBusinessClick={handleBusinessClick} />
            </div>
            <LandingPage />
          </div>
        );
    }
  };

  return (
    <SubdomainRedirect>
      <div className="h-screen flex flex-col">
        <header className="bg-primary text-primary-foreground p-4 shadow-lg">
        <div className="flex items-center justify-between gap-4">
          {isOnSubdomain() ? (
            <a
              href={getMainSiteLink('/')}
              className="flex items-start gap-3 hover:opacity-80 transition-opacity"
              onClick={() => analytics.trackHomeClick()}
            >
              <img src={logo} alt="PopMap Logo" className="h-10 w-10" />
              <div>
                <h1 className="text-2xl font-bold">PopMap</h1>
                <p className="text-sm opacity-90">
                  Discover local popup events in the DMV region.
                </p>
              </div>
            </a>
          ) : (
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
          )}

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              user?.is_business_owner ? (
                <BusinessAccountDropdown />
              ) : (
                <>
                  <div className="flex items-center gap-2 mr-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm hidden sm:inline">{user?.first_name || user?.email}</span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => signOut().then(() => navigate('/'))}
                  >
                    <LogOut className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </Button>
                </>
              )
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/login')}
                  className="text-primary-foreground hover:bg-primary-foreground/20"
                >
                  Sign In
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/signup')}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 flex overflow-hidden">
        <Routes>
          {/* Auth Routes - Full screen, no sidebar, scrollable */}
          <Route path="/signup" element={<div className="flex-1 overflow-auto"><Signup /></div>} />
          <Route path="/login" element={<div className="flex-1 overflow-auto"><Login /></div>} />
          <Route path="/callback" element={<div className="flex-1 overflow-auto"><AuthCallback /></div>} />
          <Route path="/onboarding/business" element={<div className="flex-1 overflow-auto"><BusinessOnboarding /></div>} />

          {/* Form Builder Routes - Full screen, no sidebar, scrollable */}
          <Route path="/forms/:templateId/submissions" element={<div className="flex-1 overflow-auto"><FormSubmissionsList /></div>} />
          <Route path="/forms/:templateId/edit" element={<div className="flex-1 overflow-auto"><FormTemplateEditWrapper /></div>} />
          <Route path="/e/:eventId/edit" element={<div className="flex-1 overflow-auto"><EventForm /></div>} />
          <Route path="/business/:businessId/dashboard" element={<div className="flex-1 overflow-auto"><BusinessDashboard /></div>} />
          <Route path="/business" element={<div className="flex-1 overflow-auto"><BusinessOwnerHub /></div>} />
          <Route path="/billing" element={<div className="flex-1 overflow-auto"><BillingPage /></div>} />

          {/* Regular Routes - With sidebar (hidden on mobile) */}
          <Route
            path="/p/:businessId"
            element={
              <>
                <div className="hidden md:block">
                  <Sidebar
                    currentView={currentView}
                    onViewChange={handleViewChange}
                  />
                </div>
                <div className="flex-1 overflow-auto pb-16 md:pb-0">
                  <BusinessProfile />
                </div>
                <MobileNavigation
                  currentView={currentView}
                  onViewChange={handleViewChange}
                />
              </>
            }
          />
          <Route
            path="/e/:eventId"
            element={
              <>
                <div className="hidden md:block">
                  <Sidebar
                    currentView={currentView}
                    onViewChange={handleViewChange}
                  />
                </div>
                <div className="flex-1 overflow-auto pb-16 md:pb-0">
                  <EventDetailPage />
                </div>
                <MobileNavigation
                  currentView={currentView}
                  onViewChange={handleViewChange}
                />
              </>
            }
          />
          <Route
            path="/my-rsvps"
            element={
              <>
                <div className="hidden md:block">
                  <Sidebar
                    currentView={currentView}
                    onViewChange={handleViewChange}
                  />
                </div>
                <div className="flex-1 overflow-auto pb-16 md:pb-0">
                  <MyRSVPs />
                </div>
                <MobileNavigation
                  currentView={currentView}
                  onViewChange={handleViewChange}
                />
              </>
            }
          />
          <Route
            path="/brands"
            element={
              <>
                <div className="hidden md:block">
                  <Sidebar
                    currentView={currentView}
                    onViewChange={handleViewChange}
                  />
                </div>
                <div className="flex-1 overflow-auto pb-16 md:pb-0">
                  <BrandsView onBusinessClick={handleBusinessClick} />
                </div>
                <MobileNavigation
                  currentView={currentView}
                  onViewChange={handleViewChange}
                />
              </>
            }
          />
          <Route
            path="/*"
            element={
              <>
                <div className="hidden md:block">
                  <Sidebar
                    currentView={currentView}
                    onViewChange={handleViewChange}
                  />
                </div>
                <div className="flex-1 overflow-auto pb-16 md:pb-0">{renderView()}</div>
                <MobileNavigation
                  currentView={currentView}
                  onViewChange={handleViewChange}
                />
              </>
            }
          />
        </Routes>
      </main>
      </div>
    </SubdomainRedirect>
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
