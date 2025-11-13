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
- **Status**: Pending
- **Type**: Feature - Business Tools
- **Description**: Configurable CTA buttons in event builder
- **Implementation**:
  - Configure button text
  - Configure button link/URL
  - Display on event detail pages

### 9. Integrate payment processor for subscriptions
- **Status**: Pending
- **Type**: Feature - Monetization
- **Description**: Payment gateway for recurring subscriptions
- **Recommended**: Stripe
- **Implementation**:
  - Subscription plans
  - Payment processing
  - Billing management

### 10. Implement custom subdomains for paying businesses
- **Status**: Pending
- **Type**: Feature - Premium
- **Description**: Custom subdomain support for premium/paying businesses
- **Dependencies**: Requires #9 (payment processor) to be completed first
- **Implementation**:
  - Subdomain routing
  - DNS configuration
  - Business subdomain settings

---

## Notes

**Dependencies:**
- Tasks 5-7 are sequential (auth → attendees → RSVP → reminders)
- Task 10 depends on Task 9 (payment must be set up before custom subdomains)

**Quick Wins Strategy:**
Tasks 1-3 are independent and provide immediate value. Start here to build momentum.

**Last Updated**: 2025-11-13
