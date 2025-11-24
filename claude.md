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

## Phase 4: UX Enhancements & Mobile Optimization

### 11. Custom map pins to reflect event type
- **Status**: Completed
- **Type**: Feature - UX Improvement
- **Description**: Different pin icons/colors for different event types on the map
- **Implementation**:
  - ✅ Frontend: CustomMapPin component with category-based icons and colors
  - ✅ Frontend: Lucide icons for each category (food&bev, dessert, arts+crafts, vintage)
  - ✅ Frontend: Color-coded pins with hover animations
  - ✅ Map: MapView updated to use CustomMapPin for all event markers
- **Files Created**:
  - `frontend/src/components/CustomMapPin.tsx`
- **Files Modified**:
  - `frontend/src/components/MapView.tsx`

### 12. Attendee profile page with RSVP history
- **Status**: Pending
- **Type**: Feature - User Profile
- **Description**: Profile page showing previously RSVP'd events
- **Future**: Verified attendance tracking
- **Implementation**:
  - Backend: API endpoint for user's RSVP history
  - Frontend: AttendeeProfile component
  - Frontend: List of past and upcoming RSVP'd events
  - Frontend: Filter by "Interested" vs "Going"
  - Frontend: Placeholder for future verified attendance badges

### 13. Business page customization options (PREMIUM)
- **Status**: Pending
- **Type**: Feature - Premium Business Tools
- **Description**: Allow paying businesses to customize their page appearance
- **Dependencies**: Requires active subscription (Task #9)
- **Implementation**:
  - Backend: Business model fields (background_image, default_view_mode)
  - Backend: Subscription check for customization access
  - Frontend: BusinessPageSettings component (premium only)
  - Frontend: Background image upload/URL input
  - Frontend: Toggle between map view and date/list view
  - Frontend: Save preferences per business
  - Frontend: Upgrade prompt for non-subscribed businesses

### 14. Mobile responsive sidebar and layout
- **Status**: Completed
- **Type**: Feature - Mobile UX
- **Description**: Optimize mobile layout with bottom navigation and full-width cards
- **Implementation**:
  - ✅ Frontend: Hide sidebar on mobile breakpoints (<768px) using Tailwind classes
  - ✅ Frontend: Fixed bottom navigation bar with 4 main views (Map, List, Cards, Brands)
  - ✅ Frontend: Full-width cards on mobile (no side borders, edge-to-edge)
  - ✅ Frontend: Reduced padding on mobile for better space utilization
  - ✅ Frontend: Touch-friendly 64px bottom bar with icons and labels
  - ✅ Frontend: Bottom padding (pb-16) added to content areas to prevent overlap
- **Files Created**:
  - `frontend/src/components/MobileNavigation.tsx`
- **Files Modified**:
  - `frontend/src/App.tsx` - Added mobile navigation, hidden sidebar on mobile
  - `frontend/src/components/CardView.tsx` - Mobile-responsive padding and full-width cards
  - `frontend/src/components/ListView.tsx` - Mobile-responsive padding and full-width cards

### 15. Add paywall to inquiry form builder (PREMIUM)
- **Status**: Pending
- **Type**: Feature - Premium Business Tools
- **Description**: Restrict existing form builder to paying subscribers only
- **Dependencies**: Requires active subscription (Task #9)
- **Note**: Form builder already exists, just needs subscription gating
- **Implementation**:
  - Backend: Add subscription check to form builder endpoints
  - Frontend: Hide/disable form builder for non-subscribed users
  - Frontend: Show upgrade prompt when accessing form builder
  - Frontend: Display premium badge on form builder feature

### 16. Gift premium subscriptions via Django admin
- **Status**: Pending
- **Type**: Feature - Admin Tools
- **Description**: Allow admins to manually grant premium subscriptions
- **Implementation**:
  - Backend: Admin action to gift subscription
  - Backend: Create subscription without Stripe payment
  - Backend: Set custom expiration dates
  - Backend: Add notes/reason for gifted subscription
  - Backend: Track gifted vs paid subscriptions
  - Backend: Email notification to recipient

## Phase 5: Exploration & Future Features

### 17. CMS system for a blog
- **Status**: Exploration
- **Type**: Feature - Content Management
- **Description**: Explore and implement a CMS system to manage blog content
- **Potential Approaches**:
  - Django CMS integration
  - Wagtail CMS (Django-based)
  - Custom blog app with rich text editor
  - Headless CMS (Contentful, Strapi)
- **Considerations**:
  - SEO optimization for blog posts
  - Content categorization and tagging
  - Author management
  - Draft/publish workflow
  - RSS feed support

### 18. Instagram hashtag feed embedding capabilities
- **Status**: Exploration
- **Type**: Feature - Social Integration
- **Description**: Embed Instagram posts by hashtag on event or business pages
- **Potential Approaches**:
  - Instagram Basic Display API
  - Instagram Graph API (requires business account)
  - Third-party embedding services
  - Custom hashtag aggregation
- **Considerations**:
  - API rate limits and authentication
  - Real-time vs cached feed updates
  - Display gallery/grid layout
  - Mobile responsiveness
  - Moderation and filtering capabilities

### 19. Geofenced check-in system for attendees
- **Status**: Exploration
- **Type**: Feature - Attendance Verification
- **Description**: Allow attendees to check in to events when physically present using geolocation
- **Implementation Ideas**:
  - Backend: Check-in model with geolocation verification
  - Backend: Radius-based validation (e.g., within 100m of event location)
  - Frontend: Check-in button available only when in range
  - Frontend: Real-time location tracking during event
  - Gamification: Badges, points, or rewards for verified attendance
- **Considerations**:
  - Privacy concerns and user consent
  - GPS accuracy and indoor locations
  - Battery usage for continuous location tracking
  - Fraud prevention (spoofing detection)
  - Integration with existing RSVP system (Task #6)
- **Dependencies**: Builds on Task #12 (Attendee profile page)

---

## Notes

**Dependencies:**
- Tasks 5-7 are sequential (auth → attendees → RSVP → reminders)
- Task 10 depends on Task 9 (payment must be set up before custom subdomains)
- Tasks 13, 15, 16 depend on Task 9 (payment/subscription system)

**Quick Wins Strategy:**
Tasks 1-3 are independent and provide immediate value. Start here to build momentum.

**Phase 3 Completion:**
All Phase 3 tasks (8-10) have been completed and are ready for production deployment. Stripe configuration and DNS setup required for full activation.

**Phase 4 Progress:**
- ✅ Tasks 11 and 14 completed (custom map pins and mobile responsive layout)
- Tasks 12, 13, 15, 16 pending
- Tasks 13, 15, 16 depend on subscription system (Task #9)

**Phase 5 - Exploration:**
New exploration tasks for future consideration:
- Task 17: CMS system for blog
- Task 18: Instagram hashtag feed embedding
- Task 19: Geofenced check-in system (builds on Task #12)

**Last Updated**: 2025-11-23

---

## GDPR & Privacy Considerations

### Legal Basis for Data Processing
- **Authentication data**: Contractual necessity (to provide the service)
- **Location data**: Explicit consent (especially for geofenced check-ins - Task #19)
- **RSVP data**: Legitimate interest or consent
- **Payment data**: Contractual necessity (Stripe is GDPR compliant)
- **Marketing emails**: Explicit consent required (Task #7 email reminders)

### User Rights Implementation (Required Features)
- **Right to Access**: API endpoint for users to download their data
- **Right to Erasure**: Account deletion that removes all personal data
- **Right to Portability**: Export user data in machine-readable format (JSON/CSV)
- **Right to Rectification**: Users can edit their profile data
- **Right to Object**: Opt-out of marketing emails and data processing

### Consent Management by Feature
- **Task #7 (Email Reminders)**: Explicit opt-in checkbox, not pre-checked
- **Task #2 (Geolocation)**: Browser prompt + clear explanation of why location is needed
- **Task #19 (Geofenced Check-ins)**: Separate consent from general location access
- **Social SSO (Tasks #4, #5)**: Clear disclosure of what data is collected from social providers
- **Task #18 (Instagram Embedding)**: Only public posts, no personal data scraping

### Privacy Policy & Transparency Requirements
Must document:
- What data is collected (auth, location, RSVPs, payment, behavior)
- Why it's collected (provide service, improve UX, billing)
- Data retention periods
- Third-party data sharing (AWS, Stripe, social platforms)
- User rights and how to exercise them
- Cookie usage

### Third-Party Processors (Data Processing Agreements Required)
- AWS Cognito (authentication)
- Stripe (payments) - ✅ GDPR compliant
- AWS SES (email reminders - Task #7)
- Facebook/TikTok/Google (SSO providers)
- Future: Instagram API (Task #18)

**Action needed**: Ensure Data Processing Agreements (DPAs) are in place with all processors.

### High-Risk Features Requiring Privacy Impact Assessment
**Task #19 (Geofenced Check-ins)** is particularly sensitive:
- Privacy Impact Assessment (PIA) required before implementation
- Continuous location tracking = high privacy risk
- Must minimize data collection (only during check-in window)
- Clear communication: "We only track your location when you initiate a check-in"
- Consider: Single location snapshot vs continuous tracking
- Implement fraud prevention without excessive surveillance

### Data Retention & Deletion Policies
Define retention periods for:
- Active user accounts: Retain while account is active
- Deleted accounts: Hard delete within 30 days
- RSVP history: Delete with account or after event + X months
- Payment records: May need retention for tax/legal reasons (consult accountant)
- Location data (Task #19): Delete immediately after check-in verification
- Event reminders: Delete sent email logs after X months

### International Data Transfers
- If using AWS US regions: Standard Contractual Clauses (SCCs) may be required
- Consider AWS EU regions for EU users
- AWS offers GDPR-compliant infrastructure

### Technical Implementation Checklist
- [ ] Privacy policy page
- [ ] Cookie consent banner
- [ ] Terms of service with GDPR rights
- [ ] Account settings page with data controls:
  - [ ] Download my data (JSON/CSV export)
  - [ ] Delete my account
  - [ ] Email preferences (opt-out of reminders)
  - [ ] Manage social connections
- [ ] Data deletion API endpoints
- [ ] Automated data export functionality
- [ ] Audit logging for data access/changes
- [ ] Encryption at rest and in transit
- [ ] Secure password storage (✅ Cognito handles this)

### GDPR Considerations by Feature
**Task #13 (Business page customization)**: Ensure businesses can't upload images that violate GDPR (e.g., photos with identifiable people without consent)

**Task #16 (Gift subscriptions)**: Don't require personal data from gift recipients until they accept

**Task #18 (Instagram embedding)**: Only embed public posts, respect user privacy settings

### Regional Compliance
**If you have EU users:**
- GDPR applies regardless of where business is based
- Appoint Data Protection Officer if processing large amounts of data
- Register with relevant EU data protection authority

**If you're US-only:**
- Consider California CCPA (similar requirements to GDPR)
- Privacy policy still strongly recommended

### Immediate Priority Action Items
1. **Create Privacy Policy** - highest priority
2. **Add consent checkboxes** to registration/signup flows
3. **Implement account deletion** functionality
4. **Add email unsubscribe links** (for Task #7)
5. **Document data flows** (what data goes where)
6. **Review AWS/Stripe DPAs** to ensure compliance
7. **Implement data export endpoint** (user right to access)
8. **Create cookie consent banner** if using analytics/tracking
