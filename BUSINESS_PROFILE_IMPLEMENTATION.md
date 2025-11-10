# Business Profile Page Implementation

## Overview
Added business profile pages that display comprehensive information about a business and all events they've participated in. Business names throughout the app are now clickable links that navigate to their profile pages.

## Features Implemented

### Business Profile Page (`frontend/src/components/BusinessProfile.jsx`)

#### Business Information Section
- **Logo Display**: Shows business logo if available (large 128x128 image)
- **Business Name**: Prominent heading
- **Categories**: Displays all business categories as badges
- **Description**: Full business description
- **Contact Information**:
  - Email (clickable mailto: link)
  - Phone (clickable tel: link)
  - Website (opens in new tab)
  - Instagram (opens in new tab)

#### Events Section
The profile shows two separate event lists:

**1. Upcoming Events**
- Full event cards with images
- Event title, categories, dates, times, and location
- Displayed in a responsive grid (1-2 columns)
- Shows count badge
- Prominent placement above past events

**2. Past Events**
- Smaller, condensed cards (slightly transparent)
- Basic info: image, title, date
- Displayed in a responsive grid (1-3 columns)
- Shows count badge
- Separated from upcoming events with a divider

#### Navigation
- **Back Button**: Returns to the previous view (list, cards, or map)
- **Error Handling**: Shows friendly error if business not found

## Backend Changes

### Updated EventListSerializer (`backend/apps/events/serializers.py`)
Added a `businesses` field that returns a list of businesses with id and name:
```python
def get_businesses(self, obj):
    """Return list of businesses with id and name for linking"""
    return [{'id': business.id, 'name': business.name} for business in obj.businesses.all()]
```

This allows the frontend to:
- Display business names
- Create clickable links with business IDs
- Maintain backward compatibility with `business_names` string field

## Frontend Changes

### Updated Components

#### 1. ListView (`frontend/src/components/ListView.jsx`)
- Added `onBusinessClick` prop
- Business names are now clickable buttons
- Clicking a business name navigates to business profile
- Multiple businesses shown as comma-separated clickable links

#### 2. CardView (`frontend/src/components/CardView.jsx`)
- Added `onBusinessClick` prop
- Business names in card descriptions are clickable
- Maintains clean card layout while adding interactivity

#### 3. MapView (`frontend/src/components/MapView.jsx`)
- Added `onBusinessClick` prop
- Business names clickable in:
  - InfoWindow popups (when clicking map markers)
  - Event cards in the sidebar
- Consistent interaction pattern across all views

#### 4. App.jsx (Main Application)
- Added `selectedBusinessId` state to track current business
- Added `handleBusinessClick` to navigate to business profile
- Added `handleBackFromBusiness` to return to previous view
- Business profile overlays the current view when a business is selected
- All view components receive the `onBusinessClick` handler

## User Flow

### Navigating to Business Profile
1. User browses events in any view (List, Card, or Map)
2. User sees business names displayed with events
3. User clicks on any business name
4. Business profile page opens, showing:
   - Full business information
   - All upcoming events
   - All past events
5. User can click "Back" to return to the previous view

### From Business Profile
- Users can view all events a business has participated in
- Contact information is readily accessible
- Users can return to browsing events with the Back button

## Event Filtering Logic

The profile page filters events by checking if the event's `business_names` includes the current business name:
```javascript
const businessEvents = allEvents?.filter(event =>
  event.business_names?.includes(business.name)
) || []
```

Events are then split into:
- **Upcoming**: `end_datetime >= current date`
- **Past**: `end_datetime < current date`

## Styling & UX

### Visual Hierarchy
1. Business info (top, prominent)
2. Upcoming events (large cards with images)
3. Separator
4. Past events (smaller, condensed cards)

### Interactive Elements
- Hover effects on clickable business names
- Smooth transitions
- Shadow effects on event cards
- Responsive grid layouts

### Responsive Design
- Mobile: Single column
- Tablet: 2 columns for upcoming, 2-3 for past
- Desktop: 2 columns for upcoming, 3 for past

### Empty States
- "This business hasn't participated in any events yet" when no events found
- "Business Not Found" error state with back button

## Technical Details

### Data Flow
1. User clicks business name → `onBusinessClick(businessId)` called
2. App.jsx sets `selectedBusinessId` state
3. `renderView()` sees `selectedBusinessId` and renders `BusinessProfile`
4. BusinessProfile fetches:
   - Business details via `businessesApi.getById(businessId)`
   - All events via `eventsApi.getAll()`
5. Component filters events by business name
6. Component groups events into upcoming/past
7. User clicks back → `onBack()` clears `selectedBusinessId`
8. App returns to previous view

### Performance Considerations
- Uses React Query for caching business and event data
- Filters events client-side (no additional API calls)
- Separate queries for business and events allow independent caching

## Future Enhancements

Potential improvements:
- [ ] Add direct API endpoint to fetch events by business ID
- [ ] Add event details modal from business profile
- [ ] Add social media sharing for business profiles
- [ ] Add "Follow" or "Favorite" business functionality
- [ ] Add statistics (total events, upcoming events count)
- [ ] Add event calendar view for business events
- [ ] Add reviews/ratings for businesses
- [ ] Add business hours and operational details
- [ ] Add map showing all event locations for a business
