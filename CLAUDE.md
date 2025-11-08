# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PopMap is a platform for small businesses to submit and display popup events on an interactive Google Map. The project consists of a Django REST API backend and a React frontend.

**Development Phases:**
- **Phase 1 (Current)**: Admin dashboard for entering events on behalf of businesses
- **Phase 2 (Future)**: Business self-registration and event submission

## Tech Stack

### Backend
- Django 5.x with Django REST Framework
- PostgreSQL database (AWS RDS in production, SQLite for local dev)
- Python 3.x

### Frontend
- React 18 with Vite
- TanStack Query (React Query) for data fetching
- Tailwind CSS for styling
- Google Maps (@vis.gl/react-google-maps)

## Project Structure

```
popmap/
├── backend/
│   ├── config/              # Django project settings
│   │   ├── settings.py      # Main settings file
│   │   ├── urls.py          # Root URL configuration
│   │   ├── wsgi.py          # WSGI application
│   │   └── asgi.py          # ASGI application
│   ├── apps/
│   │   └── events/          # Events and businesses app
│   │       ├── models.py    # Event and Business models
│   │       ├── admin.py     # Django admin configuration
│   │       ├── serializers.py   # DRF serializers
│   │       ├── views.py     # API viewsets
│   │       └── urls.py      # API endpoints
│   ├── manage.py
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/      # React components
    │   │   ├── EventMap.jsx     # Main map component
    │   │   └── EventCard.jsx    # Event list item
    │   ├── hooks/           # Custom React hooks
    │   │   └── useEvents.js     # Event data fetching hooks
    │   ├── services/        # API client services
    │   │   └── api.js           # Axios API configuration
    │   ├── App.jsx          # Root component
    │   ├── main.jsx         # Entry point
    │   └── index.css        # Global styles with Tailwind
    ├── package.json
    └── vite.config.js
```

## Development Commands

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file and configure
cp .env.example .env
# Edit .env with your settings (SECRET_KEY, DATABASE_URL, etc.)

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser for admin access
python manage.py createsuperuser

# Run development server
python manage.py runserver
# Backend available at http://localhost:8000
# Admin at http://localhost:8000/admin
# API at http://localhost:8000/api/
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env
# Add VITE_GOOGLE_MAPS_API_KEY to .env

# Run development server
npm run dev
# Frontend available at http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Database Migrations

```bash
cd backend

# Create new migration after model changes
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Show migration status
python manage.py showmigrations

# Rollback migration
python manage.py migrate events <migration_name>
```

### Running Tests

```bash
# Backend tests
cd backend
python manage.py test

# Run specific test
python manage.py test apps.events.tests.test_models

# Frontend tests (when added)
cd frontend
npm test
```

## Key Architecture Patterns

### Backend Architecture

**Models** (`backend/apps/events/models.py`):
- `Business`: Represents a small business (Phase 1: admin-created, Phase 2: self-registered)
  - Links to Django User model via `owner` field (prepared for Phase 2)
  - `is_verified` flag for business verification workflow
- `Event`: Popup events with location data
  - Foreign key to Business
  - Location stored as `latitude`/`longitude` decimal fields
  - Status choices: pending, approved, rejected, cancelled
  - Phase 1: Default status is 'approved' for admin-created events

**API Endpoints** (`backend/apps/events/views.py`):
- `GET /api/events/` - Paginated list of approved events
- `GET /api/events/active/` - Only active/upcoming events
- `GET /api/events/map_data/` - Lightweight endpoint optimized for map markers
- `GET /api/events/{id}/` - Event details
- `GET /api/businesses/` - List of verified businesses

**Admin Interface** (`backend/apps/events/admin.py`):
- Custom admin for Event and Business models
- Auto-sets `created_by` to current admin user when creating events
- Organized fieldsets for better UX

### Frontend Architecture

**State Management**:
- TanStack Query for server state (events, businesses)
- Local component state for UI (selected event, map position)
- Query keys: `['events']`, `['events', 'active']`, `['events', 'map']`

**Data Fetching**:
- Custom hooks in `hooks/useEvents.js` abstract API calls
- `useMapEvents()` auto-refetches every 2 minutes
- API client configured in `services/api.js` with axios

**Component Structure**:
- `App.jsx`: Root component with header and main layout
- `EventMap.jsx`: Google Maps integration with markers and sidebar
- `EventCard.jsx`: Reusable event list item component

**Map Integration**:
- Uses `@vis.gl/react-google-maps` (official Google Maps React library)
- AdvancedMarker for event locations
- InfoWindow for event details on marker click
- Sidebar displays list of all events with click-to-focus

## Environment Configuration

### Backend (.env)
```
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:pass@localhost:5432/popmap
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000/api
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

## Database Schema

### Business Model
- `name`: CharField(255)
- `description`: TextField
- `contact_email`: EmailField
- `contact_phone`: CharField(20) with regex validation
- `website`: URLField
- `logo`: ImageField (uploaded to media/business_logos/)
- `owner`: ForeignKey to User (nullable, for Phase 2)
- `is_verified`: BooleanField
- `created_at`, `updated_at`: DateTimeField

### Event Model
- `business`: ForeignKey to Business
- `title`: CharField(255)
- `description`: TextField
- `address`: CharField(500)
- `latitude`, `longitude`: DecimalField (9, 6)
- `start_datetime`, `end_datetime`: DateTimeField
- `image`: ImageField (uploaded to media/event_images/)
- `status`: CharField (choices: pending, approved, rejected, cancelled)
- `created_by`: ForeignKey to User (nullable)
- `created_at`, `updated_at`: DateTimeField
- Indexes on: `(status, start_datetime)`, `(latitude, longitude)`

## Phase 2 Preparation

The codebase is structured to support Phase 2 features:

1. **Business Model** already has `owner` field linking to User
2. **Event Model** already has `status` field for approval workflow
3. **API ViewSets** are currently read-only but can be extended to support create/update
4. Authentication/authorization can be added to DRF settings

To implement Phase 2:
- Add authentication (JWT or session-based)
- Update Event viewset to allow business users to create events (status: pending)
- Add business registration and profile management endpoints
- Implement event approval workflow in admin
- Add permissions: businesses can only edit their own events

## API Response Formats

### Event List (Map Data)
```json
[
  {
    "id": 1,
    "business_name": "Coffee Shop",
    "title": "Weekend Pop-up",
    "latitude": "37.774900",
    "longitude": "-122.419400",
    "start_datetime": "2024-03-15T10:00:00Z",
    "end_datetime": "2024-03-15T18:00:00Z"
  }
]
```

### Event Detail
```json
{
  "id": 1,
  "business": 1,
  "business_name": "Coffee Shop",
  "business_logo": "/media/business_logos/logo.jpg",
  "title": "Weekend Pop-up",
  "description": "Special weekend event...",
  "address": "123 Main St, San Francisco, CA",
  "latitude": "37.774900",
  "longitude": "-122.419400",
  "start_datetime": "2024-03-15T10:00:00Z",
  "end_datetime": "2024-03-15T18:00:00Z",
  "image": "/media/event_images/event.jpg",
  "status": "approved",
  "created_at": "2024-03-01T12:00:00Z",
  "updated_at": "2024-03-01T12:00:00Z"
}
```

## Common Development Tasks

### Adding a new field to Event model
1. Edit `backend/apps/events/models.py` - add field to Event class
2. Create migration: `python manage.py makemigrations`
3. Apply migration: `python manage.py migrate`
4. Update serializer in `serializers.py` if field should be exposed via API
5. Update admin if field should be editable: `admin.py`

### Adding a new API endpoint
1. Add method to viewset in `backend/apps/events/views.py`
2. Use `@action` decorator for custom endpoints
3. Router automatically creates URL routes

### Adding a new React component
1. Create component in `frontend/src/components/`
2. Import and use in parent component
3. Use Tailwind classes for styling
4. Use React Query hooks for data fetching

## Deployment Considerations

- Set `DEBUG=False` in production
- Use environment variables for all secrets
- Configure static files serving (whitenoise or S3)
- Set up media files storage (S3 recommended)
- Configure PostgreSQL connection in DATABASE_URL
- Set proper ALLOWED_HOSTS and CORS_ALLOWED_ORIGINS
- Enable HTTPS in production
- Run `python manage.py collectstatic` before deployment
