# Custom Subdomain Routing Guide

## Overview

Custom subdomains allow premium business owners to have their own branded URL (e.g., `mybusiness.popmap.co`) that automatically redirects to their business profile page.

## How It Works

### 1. User Flow

1. **Business owner sets up subdomain:**
   - Goes to Business Dashboard → Settings tab
   - Enters desired subdomain: `mybusiness`
   - System creates: `mybusiness.popmap.co`

2. **Customer visits subdomain:**
   - Visits: `https://mybusiness.popmap.co`
   - Automatically redirected to: `https://mybusiness.popmap.co/p/123/`
   - Sees the business profile page with subdomain URL preserved

### 2. Technical Implementation

#### Middleware (`apps/events/middleware.py`)

The `SubdomainMiddleware` intercepts all requests and handles subdomain routing:

```python
class SubdomainMiddleware:
    def __call__(self, request):
        # 1. Extract subdomain from hostname
        host = request.get_host()  # e.g., "mybusiness.popmap.co"
        subdomain = self.get_subdomain(host)  # Returns "mybusiness"

        # 2. Skip reserved subdomains
        if subdomain in ['www', 'api', 'admin']:
            return self.get_response(request)

        # 3. Look up business by subdomain
        business = Business.objects.get(
            custom_subdomain=subdomain,
            is_verified=True
        )

        # 4. Redirect root path to business profile
        if request.path == '/':
            return redirect(f'/p/{business.id}/')

        # 5. Attach business to request for other paths
        request.business = business
        return self.get_response(request)
```

**Key Points:**
- Only verified businesses can use subdomains
- Reserved subdomains: `www`, `api`, `admin`
- Root path (`/`) redirects to business profile (`/p/{id}/`)
- Business object attached to `request.business` for all subdomain requests
- 404 returned if subdomain doesn't exist

#### API Endpoint

**Get business by subdomain:**
```http
GET /api/businesses/by-subdomain/<subdomain>/
```

Example:
```bash
curl https://popmap.co/api/businesses/by-subdomain/mybusiness/
```

Response:
```json
{
  "id": 123,
  "name": "My Business",
  "custom_subdomain": "mybusiness",
  "subdomain_url": "https://mybusiness.popmap.co",
  ...
}
```

### 3. URL Routing Examples

| User Visits | What Happens | Final URL |
|------------|--------------|-----------|
| `mybusiness.popmap.co` | Redirects to business profile | `mybusiness.popmap.co/p/123/` |
| `mybusiness.popmap.co/e/456` | Shows event page (no redirect) | `mybusiness.popmap.co/e/456/` |
| `mybusiness.popmap.co/api/...` | API request (no redirect) | `mybusiness.popmap.co/api/...` |
| `invalid.popmap.co` | 404 error | N/A |
| `www.popmap.co` | Normal site (no subdomain) | `www.popmap.co` |
| `api.popmap.co` | API subdomain (no redirect) | `api.popmap.co` |

### 4. Permission Requirements

**To use custom subdomains, a business must:**
1. Have an owner assigned (`business.owner != None`)
2. Owner must have active subscription (`status = 'active' or 'trialing'`)
3. Subscription plan must enable subdomains (`plan.custom_subdomain_enabled = True`)

**Checked in:**
- `Business.can_use_custom_subdomain()` method (models.py:83-102)
- `BusinessSerializer.validate_custom_subdomain()` method (serializers.py:42-49)

### 5. Database Schema

```sql
-- Business table
custom_subdomain VARCHAR(50) UNIQUE NULL  -- Stores subdomain (e.g., "mybusiness")
is_verified BOOLEAN DEFAULT FALSE        -- Only verified businesses can use subdomains
owner_id INTEGER NULL                    -- Foreign key to User

-- Subscription Plans table
custom_subdomain_enabled BOOLEAN DEFAULT FALSE  -- Feature flag for subdomain access

-- Subscriptions table
status VARCHAR(20)  -- Must be 'active' or 'trialing'
plan_id INTEGER     -- Must reference plan with custom_subdomain_enabled=True
```

### 6. Reserved Subdomains

The following subdomains are reserved and cannot be used:
- `www` - Main website
- `api` - API endpoints
- `admin` - Django admin panel

**To add more reserved subdomains, update middleware.py:31:**
```python
if subdomain not in ['www', 'api', 'admin', 'app', 'staging', 'beta']:
```

## Production Setup Requirements

### DNS Configuration

**Add wildcard DNS record:**
```dns
# Route all subdomains to your main domain
*.popmap.co.  CNAME  popmap.co.

# Or use A records
*.popmap.co.  A  123.456.789.0
```

### SSL Certificate

**Option 1: Wildcard SSL Certificate (Recommended)**
```bash
# Using Let's Encrypt with DNS validation
certbot certonly \
  --dns-route53 \
  -d "*.popmap.co" \
  -d "popmap.co"
```

**Option 2: Individual Certificates**
- More complex to manage
- Not recommended for dynamic subdomains

### Web Server Configuration

**Nginx Example:**
```nginx
server {
    listen 443 ssl;
    server_name *.popmap.co popmap.co;

    ssl_certificate /etc/letsencrypt/live/popmap.co/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/popmap.co/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;  # Important: passes subdomain to Django
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Apache Example:**
```apache
<VirtualHost *:443>
    ServerName popmap.co
    ServerAlias *.popmap.co

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/popmap.co/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/popmap.co/privkey.pem

    ProxyPass / http://127.0.0.1:8000/
    ProxyPassReverse / http://127.0.0.1:8000/
    ProxyPreserveHost On  # Important: passes subdomain to Django
</VirtualHost>
```

### Django Settings

**Ensure middleware is enabled:**
```python
# config/settings.py
MIDDLEWARE = [
    # ...
    'apps.events.middleware.SubdomainMiddleware',  # Must be included
    # ...
]

# Allow subdomain hosts
ALLOWED_HOSTS = [
    'popmap.co',
    '.popmap.co',  # Allows all subdomains
    'localhost',
    '127.0.0.1',
]
```

## Testing Locally

### Option 1: Using hosts file

**Edit `/etc/hosts` (Mac/Linux) or `C:\Windows\System32\drivers\etc\hosts` (Windows):**
```
127.0.0.1  localhost
127.0.0.1  test-business.localhost
127.0.0.1  mybusiness.localhost
```

**Start Django:**
```bash
python manage.py runserver 0.0.0.0:8000
```

**Visit:**
```
http://test-business.localhost:8000
```

### Option 2: Using ngrok or similar tunneling

```bash
# Start Django
python manage.py runserver 8000

# In another terminal, start ngrok
ngrok http 8000

# Use the ngrok URL
https://abc123.ngrok.io  # Acts as main domain
https://test-business-abc123.ngrok.io  # Subdomain (may not work without custom domain)
```

## Troubleshooting

### Subdomain not working

1. **Check DNS:**
   ```bash
   dig mybusiness.popmap.co
   nslookup mybusiness.popmap.co
   ```

2. **Check business exists and is verified:**
   ```bash
   python manage.py shell
   >>> from apps.events.models import Business
   >>> Business.objects.get(custom_subdomain='mybusiness')
   >>> business.is_verified  # Should be True
   ```

3. **Check middleware is enabled:**
   ```bash
   python manage.py diffsettings | grep MIDDLEWARE
   ```

4. **Check SSL certificate:**
   ```bash
   openssl s_client -connect mybusiness.popmap.co:443 -servername mybusiness.popmap.co
   ```

### 404 on subdomain

- Verify business `is_verified=True`
- Check subdomain spelling matches database
- Ensure middleware is before other middleware that might intercept

### Redirect loop

- Check that `/p/{id}/` path doesn't trigger another redirect
- Ensure `request.path` check in middleware is correct

## Security Considerations

1. **Only verified businesses** - Prevents abuse
2. **Unique subdomains** - Database constraint enforces uniqueness
3. **Reserved subdomains** - Protects critical infrastructure
4. **Subscription check** - Ensures only paying customers access feature
5. **Input validation** - Only alphanumeric + hyphens allowed

## Future Enhancements

Potential improvements:
- [ ] Custom branding on subdomain pages
- [ ] Analytics per subdomain
- [ ] Email notifications when subdomain is set up
- [ ] Subdomain reservation system
- [ ] Allow businesses to use their own domain (mybusiness.com → CNAME → popmap.co)
- [ ] QR code generator for subdomain URLs
