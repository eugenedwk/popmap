# PopMap Development Todo List

## Phase 1: Quick Wins (Build Momentum)

### 1. Remove 'verified' badge from brands pages
- **Status**: Completed
- **Type**: Bug Fix
- **Description**: Remove the verified badge display from business/brand pages

### 2. Default map window to user location
- **Status**: Completed
- **Type**: Feature - UX Improvement
- **Description**: Center map on user's geolocation on initial load

### 3. Add social media sharing to event pages
- **Status**: Completed
- **Type**: Feature
- **Description**: Add share buttons for Instagram, Facebook, Twitter/X
- **Implementation**:
  - Web Share API for mobile
  - Open Graph meta tags for rich previews
  - Share buttons on event detail pages

## Phase 2: Authentication & User Engagement

### 4. Build Cognito authentication with social SSO
- **Status**: Completed
- **Type**: Feature - Authentication
- **Description**: Implement AWS Cognito with social login options
- **Providers**: Facebook, TikTok, Gmail
- **User Type**: Business owners

### 5. Expand Cognito to support attendee users
- **Status**: Completed
- **Type**: Feature - Authentication
- **Description**: Add attendee/consumer user type in addition to business users
- **Implementation**:
  - User roles (Business vs Attendee)
  - Simpler signup flow for attendees (no verification needed)
  - Social login support for attendees

### 6. Create RSVP system
- **Status**: Completed
- **Type**: Feature - User Engagement
- **Description**: Attendees can mark events with interest level
- **RSVP Options**:
  - "Interested"
  - "Going"
- **Implementation**:
  - Backend: EventRSVP model
  - Backend: API endpoints for RSVP actions
  - Frontend: RSVP buttons on event pages
  - Frontend: User dashboard showing RSVPs

### 7. Build event reminder system
- **Status**: Pending
- **Type**: Feature - Notifications
- **Description**: Email notifications before events start
- **Implementation**:
  - Backend: AWS SES integration
  - Backend: Scheduled task for sending reminders
  - Frontend: Email preference settings
  - Send reminders 24hrs before events to users who RSVP'd "going"

## Phase 3: Business Features & Monetization

### 8. Add Event Call to Action button(s)
- **Status**: Completed
- **Type**: Feature - Business Tools
- **Description**: Configurable CTA buttons in event builder
- **Implementation**:
  - ✅ Backend: Database fields (cta_button_text, cta_button_url)
  - ✅ Backend: EventSerializer includes CTA fields
  - ✅ Frontend: EventForm with CTA inputs and validation
  - ✅ Frontend: EventDetailPage displays CTA button when configured
- **Files Modified**:
  - `backend/apps/events/models.py` - Event model
  - `backend/apps/events/serializers.py` - Event serializer
  - `backend/apps/events/migrations/0008_add_event_cta_fields.py`
  - `frontend/src/components/EventForm.tsx`
  - `frontend/src/components/EventDetailPage.tsx`
  - `frontend/src/types/index.ts`

### 9. Integrate payment processor for subscriptions
- **Status**: Completed
- **Type**: Feature - Monetization
- **Description**: Payment gateway for recurring subscriptions using Stripe
- **Implementation**:
  - ✅ Backend: Billing app with models (SubscriptionPlan, Subscription, StripeCustomer, PaymentMethod)
  - ✅ Backend: API views for plans, checkout, and subscription management
  - ✅ Backend: Stripe webhook handler for event processing
  - ✅ Backend: StripeService for Stripe operations
  - ✅ Frontend: Stripe packages installed (@stripe/stripe-js, @stripe/react-stripe-js)
  - ✅ Frontend: SubscriptionPlans component with checkout flow
  - ✅ Frontend: Billing API methods and TypeScript types
- **Files Created**:
  - `backend/apps/billing/` (entire app)
  - `backend/apps/billing/models.py` - Subscription models
  - `backend/apps/billing/serializers.py` - API serializers
  - `backend/apps/billing/services.py` - StripeService
  - `backend/apps/billing/views.py` - API views
  - `backend/apps/billing/webhooks.py` - Webhook handler
  - `backend/apps/billing/urls.py` - URL routing
  - `backend/apps/billing/admin.py` - Django admin
  - `backend/apps/billing/STRIPE_IMPLEMENTATION_GUIDE.md`
  - `frontend/src/components/SubscriptionPlans.tsx`
  - `frontend/src/types/index.ts` (billing types)
- **Files Modified**:
  - `backend/config/settings.py` - Added billing app
  - `backend/config/urls.py` - Added billing URLs
  - `backend/requirements.txt` - Added stripe package
  - `frontend/src/services/api.ts` - Added billingApi
  - `frontend/package.json` - Added Stripe packages
- **API Endpoints**:
  - `GET /api/billing/plans/` - List subscription plans
  - `GET /api/billing/subscription/current/` - Get current subscription
  - `POST /api/billing/subscription/create_checkout_session/` - Create Stripe checkout
  - `POST /api/billing/subscription/cancel/` - Cancel subscription
  - `POST /api/billing/webhook/` - Stripe webhook handler

### 10. Implement custom subdomains for paying businesses
- **Status**: Completed
- **Type**: Feature - Premium
- **Description**: Custom subdomain support for premium/paying businesses
- **Dependencies**: ✅ Requires #9 (payment processor) - COMPLETED
- **Implementation**:
  - ✅ Backend: Business model with custom_subdomain field
  - ✅ Backend: can_use_custom_subdomain() method checks subscription
  - ✅ Backend: SubdomainMiddleware for routing
  - ✅ Backend: Serializer validation for subdomain eligibility
  - ✅ Frontend: BusinessSubdomainSettings component
  - ✅ Frontend: BusinessDashboard example implementation
  - ✅ Frontend: Business type updated with subdomain fields
- **Files Created**:
  - `backend/apps/events/middleware.py` - Subdomain middleware
  - `backend/apps/events/CUSTOM_SUBDOMAIN_GUIDE.md`
  - `frontend/src/components/BusinessSubdomainSettings.tsx`
  - `frontend/src/components/BusinessDashboard.tsx`
- **Files Modified**:
  - `backend/apps/events/models.py` - Business model
  - `backend/apps/events/serializers.py` - Business serializer
  - `backend/apps/events/admin.py` - Admin interface
  - `backend/apps/events/migrations/0009_add_business_custom_subdomain.py`
  - `backend/config/settings.py` - Added middleware
  - `frontend/src/types/index.ts` - Business interface
  - `frontend/src/services/api.ts` - Added update method

---

## Notes

**Dependencies:**
- Tasks 5-7 are sequential (auth → attendees → RSVP → reminders)
- Task 10 depends on Task 9 (payment must be set up before custom subdomains)

**Quick Wins Strategy:**
Tasks 1-3 are independent and provide immediate value. Start here to build momentum.

**Phase 3 Completion:**
All Phase 3 tasks (8-10) have been completed and are ready for production deployment. Stripe configuration and DNS setup required for full activation.

**Last Updated**: 2025-11-15
