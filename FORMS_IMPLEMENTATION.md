# Forms Implementation Summary

## Overview
Added business registration and event submission forms to the PopMap application, enabling users to submit their businesses and events for admin review.

## Backend Changes

### Updated ViewSets (`backend/apps/events/views.py`)
- **CategoryViewSet**: New read-only endpoint for fetching available categories
- **BusinessViewSet**: Changed from `ReadOnlyModelViewSet` to `ModelViewSet`
  - GET: Returns only verified businesses
  - POST: Accepts new business registrations (unverified by default)
- **EventViewSet**: Changed from `ReadOnlyModelViewSet` to `ModelViewSet`
  - GET: Returns only approved events
  - POST: Accepts new event submissions (pending review)

### New API Endpoints
- `GET /api/categories/` - List all available categories
- `POST /api/businesses/` - Submit business registration
- `POST /api/events/` - Submit event for review

### Approval Workflow
1. **Businesses**:
   - Submitted with `is_verified=False` (default)
   - Admin reviews in Django admin
   - Once verified, appears in public listings

2. **Events**:
   - Submitted with `status='pending'` or `status='approved'` (default)
   - Admin reviews in Django admin
   - Once approved, appears on map and in all views

## Frontend Changes

### New Components

#### BusinessForm (`frontend/src/components/BusinessForm.jsx`)
Full-featured business registration form with:
- Business name, description
- Contact email, phone
- Website, Instagram URL
- Logo upload (optional)
- Category selection (multi-select with badge UI)
- Form validation with Zod schema
- Success/error feedback

#### EventForm (`frontend/src/components/EventForm.jsx`)
Event submission form with:
- Event title, description
- Multiple business selection
- Address and coordinates (lat/lng)
- Helper button to auto-fill DC center coordinates
- Start/End date & time pickers
- Event image upload (optional)
- Form validation with Zod schema
- Success/error feedback

### Updated Components

#### Sidebar (`frontend/src/components/Sidebar.jsx`)
- Added "SUBMIT" section with two new options:
  - "Register Business" - Opens business registration form
  - "Submit Event" - Opens event submission form
- Organized navigation into "VIEW EVENTS" and "SUBMIT" sections

#### App.jsx
- Added routing for `submit-business` and `submit-event` views
- Imports BusinessForm and EventForm components

### Updated API Service (`frontend/src/services/api.js`)
Added new API methods:
- `categoriesApi.getAll()` - Fetch all categories
- `businessesApi.create(data)` - Submit business with FormData (handles file upload)
- `eventsApi.create(data)` - Submit event with FormData (handles file upload)

## Dependencies Added

### Frontend
- `react-hook-form` - Form state management
- `@hookform/resolvers` - Zod integration for react-hook-form
- `zod` - Schema validation
- `@radix-ui/react-icons` - Icons for ShadCN components

### ShadCN Components
- form, input, textarea, button, label, select - Form UI components

## Form Validation

### Business Form
- Name: Required, max 255 characters
- Description: Required, min 10 characters
- Email: Required, valid email format
- Phone: Optional, must match pattern `^\+?1?\d{9,15}$`
- Website/Instagram: Optional, must be valid URL
- Categories: Required, at least 1 category
- Logo: Optional file upload

### Event Form
- Title: Required, max 255 characters
- Description: Required, min 20 characters
- Address: Required, max 500 characters
- Latitude: Required, valid decimal number
- Longitude: Required, valid decimal number
- Start/End DateTime: Required, end must be after start
- Business IDs: Required, at least 1 business
- Image: Optional file upload

## User Experience

1. **Navigation**: Users can access forms via the sidebar under the "SUBMIT" section
2. **Category Selection**: Interactive badge-based multi-select UI
3. **Business Selection**: Badge-based selection for associating events with businesses
4. **File Uploads**: Support for logos and event images
5. **Validation**: Real-time form validation with clear error messages
6. **Feedback**: Success/error messages after form submission
7. **Form Reset**: Forms automatically reset after successful submission

## Admin Workflow

Admins should regularly check Django admin for:
1. **Unverified Businesses** (`is_verified=False`)
   - Review business details
   - Verify contact information
   - Approve by setting `is_verified=True`

2. **Pending Events** (`status='pending'`)
   - Review event details
   - Verify associated businesses
   - Approve by setting `status='approved'` or reject with `status='rejected'`

## Testing the Forms

### Business Registration
1. Navigate to "Register Business" in sidebar
2. Fill out form with test data
3. Select categories by clicking badges
4. Submit form
5. Check Django admin for new unverified business

### Event Submission
1. Navigate to "Submit Event" in sidebar
2. Fill out form with test data
3. Select participating businesses
4. Use "Use DC Center Coordinates" button or enter custom coordinates
5. Submit form
6. Check Django admin for new pending event

## Next Steps

Potential enhancements:
- [ ] Add user authentication for business owners
- [ ] Allow businesses to edit their own information
- [ ] Email notifications for approval/rejection
- [ ] Geocoding API integration (address → coordinates)
- [ ] Image preview before upload
- [ ] Multi-step form wizard for complex submissions
- [ ] Draft saving functionality
