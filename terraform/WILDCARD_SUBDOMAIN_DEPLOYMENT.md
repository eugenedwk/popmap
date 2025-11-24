# Wildcard Subdomain Deployment Guide

This guide walks you through deploying wildcard subdomain support for PopMap, enabling custom business subdomains like `mybusiness.popmap.co`.

## What This Deployment Does

1. **Creates wildcard SSL certificate** - `*.popmap.co` certificate in AWS Certificate Manager (ACM)
2. **Adds DNS validation** - Automatically validates the certificate via Route 53
3. **Updates CloudFront** - Configures CloudFront to accept wildcard subdomains
4. **Creates wildcard DNS record** - Routes `*.popmap.co` to CloudFront
5. **Updates Django ALLOWED_HOSTS** - Allows all `.popmap.co` subdomains

## Architecture Overview

```
Custom Subdomain Request Flow:
1. User visits: mybusiness.popmap.co
2. Route 53: *.popmap.co → CloudFront
3. CloudFront: Serves React SPA (index.html)
4. React App: Makes API calls to api.popmap.co/api/...
5. Django Middleware: Detects subdomain, redirects to /p/{business_id}/
```

## Prerequisites

- Terraform installed (`>= 1.0`)
- AWS CLI configured with appropriate credentials
- Access to popmap AWS account (account ID: 730335211951)
- Existing Route 53 hosted zone for `popmap.co`

## Step-by-Step Deployment

### 1. Review Terraform Changes

```bash
cd terraform/
terraform plan
```

**Expected new resources:**
- `aws_acm_certificate.wildcard` - Wildcard SSL certificate
- `aws_route53_record.wildcard_cert_validation` - DNS validation records
- `aws_acm_certificate_validation.wildcard` - Certificate validation waiter
- `aws_route53_record.frontend_wildcard` - Wildcard DNS record

**Expected modified resources:**
- `aws_cloudfront_distribution.frontend` - Updated aliases and certificate

### 2. Apply Terraform Changes

```bash
terraform apply
```

**Important:** This will take **5-15 minutes** because:
- ACM certificate validation takes 3-5 minutes
- CloudFront distribution update takes 10-15 minutes

**What happens during apply:**
1. Creates wildcard certificate in ACM (us-east-1)
2. Creates DNS validation records in Route 53
3. Waits for certificate to be validated
4. Updates CloudFront distribution (triggers full distribution update)
5. Creates wildcard DNS record

### 3. Verify Certificate Creation

```bash
# Check certificate status
aws acm list-certificates --region us-east-1 | grep "*.popmap.co"

# Get certificate details
aws acm describe-certificate \
  --certificate-arn <arn-from-output> \
  --region us-east-1
```

**Expected output:**
```json
{
  "Certificate": {
    "DomainName": "*.popmap.co",
    "Status": "ISSUED",
    "SubjectAlternativeNames": ["*.popmap.co", "popmap.co"],
    "DomainValidationOptions": [...]
  }
}
```

### 4. Verify DNS Records

```bash
# Check wildcard DNS record
dig *.popmap.co

# Test specific subdomain
dig mybusiness.popmap.co
```

**Expected output:**
```
mybusiness.popmap.co.  300  IN  A  <CloudFront IP>
```

### 5. Verify CloudFront Update

```bash
# Check CloudFront distribution
aws cloudfront list-distributions | jq '.DistributionList.Items[] | select(.Aliases.Items[] | contains("*.popmap.co"))'
```

**Expected:**
- Aliases should include: `popmap.co`, `www.popmap.co`, `*.popmap.co`
- ViewerCertificate should point to new wildcard certificate

### 6. Update Production Environment Variables

Update your production `.env` file (or ECS task definition):

```bash
# In ECS task definition or .env file
ALLOWED_HOSTS=popmap.co,.popmap.co,localhost,127.0.0.1
```

**Note:** The leading dot `.popmap.co` allows all subdomains.

### 7. Deploy Backend with Updated Settings

```bash
# If using ECS, update task definition and restart service
aws ecs update-service \
  --cluster popmap-dev-cluster \
  --service popmap-backend \
  --force-new-deployment
```

### 8. Test Subdomain Routing

#### Create a Test Business with Subdomain

1. Log in to Django admin: `https://api.popmap.co/admin/`
2. Navigate to Businesses
3. Find a verified business
4. Set `custom_subdomain` to `test-business`
5. Save

#### Test the Subdomain

```bash
# Test subdomain resolution
curl -I https://test-business.popmap.co

# Should redirect to business profile
curl -L https://test-business.popmap.co
```

**Expected behavior:**
1. `https://test-business.popmap.co` loads (SSL works)
2. Redirects to `https://test-business.popmap.co/p/123/`
3. Shows business profile page

## Troubleshooting

### Certificate Validation Stuck

**Problem:** Certificate stays in "Pending Validation" status

**Solution:**
```bash
# Check DNS validation records exist
aws route53 list-resource-record-sets \
  --hosted-zone-id <zone-id> | grep _acm-challenge

# If missing, rerun:
terraform apply -target=aws_route53_record.wildcard_cert_validation
```

### CloudFront Update Fails

**Problem:** CloudFront distribution update fails

**Possible causes:**
1. Old certificate still in use by another distribution
2. Alias already claimed by another distribution

**Solution:**
```bash
# Check for conflicting aliases
aws cloudfront list-distributions | jq '.DistributionList.Items[] | {Id: .Id, Aliases: .Aliases.Items}'

# If conflict, remove old alias first or use different approach
```

### DNS Not Resolving

**Problem:** `dig mybusiness.popmap.co` returns NXDOMAIN

**Solution:**
```bash
# Check wildcard record exists
aws route53 list-resource-record-sets \
  --hosted-zone-id <zone-id> | grep "\\*\\.popmap\\.co"

# Wait for DNS propagation (up to 48 hours, usually < 5 minutes)
# Test with Google DNS
dig @8.8.8.8 mybusiness.popmap.co
```

### Django ALLOWED_HOSTS Error

**Problem:** Getting "DisallowedHost" error in Django

**Solution:**
```python
# In settings.py or .env
ALLOWED_HOSTS=popmap.co,.popmap.co  # The dot prefix allows all subdomains
```

**Verify in Django shell:**
```bash
python manage.py shell
>>> from django.conf import settings
>>> settings.ALLOWED_HOSTS
['popmap.co', '.popmap.co', ...]
```

### Subdomain Shows 404

**Problem:** Subdomain loads but shows 404 error

**Possible causes:**
1. Business not verified (`is_verified=False`)
2. Subdomain doesn't exist in database
3. Middleware not enabled

**Solution:**
```bash
# Check business in database
python manage.py shell
>>> from apps.events.models import Business
>>> Business.objects.filter(custom_subdomain='test-business', is_verified=True)

# Check middleware is enabled
>>> from django.conf import settings
>>> 'apps.events.middleware.SubdomainMiddleware' in settings.MIDDLEWARE
True
```

## Cost Implications

### Estimated Monthly Costs

- **ACM Certificate:** $0 (free)
- **Route 53 DNS queries:** ~$0.50/month (first 1B queries free)
- **CloudFront:** Existing cost (no change)
- **Total new cost:** ~$0.50/month

### CloudFront Pricing (existing)

- First 10 TB: $0.085/GB
- 10-50 TB: $0.080/GB
- 50+ TB: $0.060/GB

**Note:** Wildcard subdomains don't add extra CloudFront cost. You pay only for actual data transfer.

## Rollback Plan

If issues occur, rollback with:

```bash
# 1. Revert Terraform changes
git revert <commit-hash>
terraform apply

# 2. CloudFront will revert to old certificate
# 3. Wildcard DNS record will be removed
# 4. Certificate can be deleted manually if needed

# Delete certificate (after CloudFront is updated)
aws acm delete-certificate \
  --certificate-arn <wildcard-cert-arn> \
  --region us-east-1
```

## Security Considerations

### Certificate Security

- ✅ **Wildcard certs are safe** - Only you control DNS, so only you can use the cert
- ✅ **SNI is used** - Modern browsers support this (coverage: 99.9%+)
- ✅ **TLS 1.2+ required** - Minimum protocol version enforced

### Subdomain Security

- ✅ **Only verified businesses** - Middleware checks `is_verified=True`
- ✅ **Reserved subdomains** - `www`, `api`, `admin` are protected
- ✅ **Unique constraint** - Database enforces unique `custom_subdomain`
- ✅ **Subscription check** - `can_use_custom_subdomain()` verifies payment

### Potential Risks

1. **Subdomain hijacking** - Mitigated by database uniqueness constraint
2. **Reserved subdomain bypass** - Mitigated by middleware checks
3. **Certificate expiration** - ACM auto-renews certificates
4. **DNS hijacking** - Mitigated by AWS account security

## Post-Deployment Verification Checklist

- [ ] Certificate shows "ISSUED" status in ACM
- [ ] DNS wildcard record resolves to CloudFront
- [ ] `test-business.popmap.co` loads without SSL errors
- [ ] Subdomain redirects to business profile (`/p/123/`)
- [ ] Django admin can set/change custom subdomains
- [ ] Non-existent subdomains return proper 404
- [ ] Reserved subdomains (`api`, `admin`) still work normally
- [ ] Frontend loads correctly on custom subdomains
- [ ] API calls work from custom subdomains

## Monitoring

### CloudWatch Alarms (Recommended)

```hcl
# Add to Terraform
resource "aws_cloudwatch_metric_alarm" "cloudfront_errors" {
  alarm_name          = "popmap-cloudfront-4xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "4xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = "300"
  statistic           = "Average"
  threshold           = "5"  # Alert if >5% error rate
  alarm_description   = "CloudFront 4xx errors (may indicate subdomain issues)"
}
```

### Key Metrics to Monitor

1. **CloudFront 4xx errors** - High rate may indicate subdomain routing issues
2. **Certificate expiration** - ACM should auto-renew, but monitor anyway
3. **Django subdomain 404s** - Log and monitor unrecognized subdomains

## Support Resources

- [AWS ACM Documentation](https://docs.aws.amazon.com/acm/)
- [CloudFront Custom Domain Names](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html)
- [Route 53 Wildcard Records](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html)
- [Django ALLOWED_HOSTS](https://docs.djangoproject.com/en/stable/ref/settings/#allowed-hosts)

## Timeline

**Expected deployment time:** ~20-30 minutes

1. Terraform plan review: 2 minutes
2. Terraform apply: 15-20 minutes
   - Certificate creation + validation: 5 minutes
   - CloudFront distribution update: 10-15 minutes
3. Backend deployment: 3-5 minutes
4. Testing: 5-10 minutes

**Total:** 20-30 minutes for full deployment and verification
