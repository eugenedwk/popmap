# PopMap

A platform for small businesses to submit and display their popup events on an interactive map.

**Live Site:** https://popmap.co

## Current Status

### ✅ Production (Live)
- **Frontend**: Deployed to https://popmap.co via CloudFront + S3
- **CI/CD**: GitHub Actions auto-deploys on push to `main`
- **SSL/DNS**: Custom domain with SSL certificates configured
- **Infrastructure**: Managed with Terraform (VPC, RDS, CloudFront, Route 53)

### 🚧 In Development
- **Backend API**: Running locally on port 8000
- **Database**: Local PostgreSQL (production RDS exists but in private subnets)
- **Google Maps Integration**: Requires API key configuration

## Project Structure

- `backend/` - Django REST API
- `frontend/` - React application with Vite
- `terraform/` - AWS infrastructure as code
- `.github/workflows/` - CI/CD pipelines

## Tech Stack

### Frontend
- React with Vite
- TanStack Query (React Query)
- Tailwind CSS
- Google Maps (@vis.gl/react-google-maps)
- **Hosting**: AWS S3 + CloudFront CDN

### Backend
- Django 5.x with Django REST Framework
- PostgreSQL 15 (local dev + AWS RDS production)
- Python 3.13 with psycopg3
- **Admin**: http://localhost:8000/admin

### Infrastructure
- **AWS Services**: RDS, VPC, S3, CloudFront, Route 53, ACM
- **IaC**: Terraform
- **CI/CD**: GitHub Actions with OIDC (no stored credentials)
- **Domain**: popmap.co (via Namecheap → Route 53)

## Development Phases

### Phase 1: Admin Dashboard (Current)
- Admin interface to enter events on behalf of businesses
- Google Maps integration to display events
- Event management (create, edit, delete)
- **Status**: In development

### Phase 2: Business Self-Service (Future)
- Business account creation and authentication
- Self-service event submission
- Event approval workflow

## Quick Start

### Backend (Local Development)

```bash
cd backend

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser (if not exists)
python manage.py createsuperuser

# Start server
python manage.py runserver
```

Backend available at http://localhost:8000
Admin at http://localhost:8000/admin

### Frontend (Local Development)

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend available at http://localhost:5173

### Production Deployment

Frontend automatically deploys to https://popmap.co on push to `main` via GitHub Actions.

```bash
# Manual frontend deployment (if needed)
cd frontend
npm run build
aws s3 sync dist/ s3://popmap-frontend/ --delete
aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
```

## Documentation

- [CLAUDE.md](CLAUDE.md) - Detailed development guide for AI assistants
- [terraform/README.md](terraform/README.md) - Infrastructure setup guide
- [terraform/DOMAIN_SETUP.md](terraform/DOMAIN_SETUP.md) - Domain configuration guide
- [.github/CICD_SETUP.md](.github/CICD_SETUP.md) - CI/CD setup instructions

## Database Configuration

**Local Development:**
```bash
DATABASE_URL=postgresql://eugenekim@localhost/popmap
```

**Production (RDS):**
```bash
# Located in private subnets, requires VPN/bastion or backend deployment
# postgresql://popmap_admin:***@popmap-dev-db.c2tma4ou6yce.us-east-1.rds.amazonaws.com:5432/popmap
```

## Cost Overview

**Current Monthly Costs (~$2-6):**
- Route 53 Hosted Zone: $0.50
- CloudFront (low traffic): $1-5
- S3 Storage: $0.10-0.50
- RDS db.t3.micro (dev): ~$15-20 (after free tier)
- SSL Certificates: FREE (AWS ACM)

## Environment Variables

### Backend (.env)
```
DEBUG=False
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://eugenekim@localhost/popmap
ALLOWED_HOSTS=localhost,127.0.0.1,api.popmap.co
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://popmap.co,https://www.popmap.co
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000/api
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

## Contributing

This is a personal project currently in development.

## License

All rights reserved.
