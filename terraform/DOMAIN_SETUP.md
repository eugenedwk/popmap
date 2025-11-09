# Domain Setup Guide for popmap.co

**Status:** ✅ **COMPLETE** - Domain is live at https://popmap.co

This guide walks you through setting up your custom domain (popmap.co) with AWS infrastructure.

## What You'll Get

After setup:

- `https://popmap.co` → React frontend (via CloudFront + S3)
- `https://www.popmap.co` → Same as above
- `https://api.popmap.co` → Django backend (to be configured)

## Prerequisites Completed ✅

- [x] Domain registered at Namecheap (popmap.co)
- [x] Route 53 Hosted Zone created
- [x] SSL Certificates requested in ACM:
  - Certificate 1: `arn:aws:acm:us-east-1:730335211951:certificate/bae122c5-61f0-484b-95d2-7bfbd728dad8`
  - Certificate 2: `arn:aws:acm:us-east-1:730335211951:certificate/99bf003c-1dc0-4331-aa45-6bab49958107`

## Step 1: Validate SSL Certificates

Before deploying, your SSL certificates need to be validated.

**Check certificate status:**

```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:730335211951:certificate/bae122c5-61f0-484b-95d2-7bfbd728dad8 \
  --region us-east-1

aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:730335211951:certificate/99bf003c-1dc0-4331-aa45-6bab49958107 \
  --region us-east-1
```

**If status is "PENDING_VALIDATION":**

1. AWS will provide DNS CNAME records to add
2. Go to AWS ACM Console: https://console.aws.amazon.com/acm/home?region=us-east-1
3. Click on each certificate
4. Click "Create records in Route 53" (easiest method)
5. AWS will automatically add validation records to your Route 53 hosted zone
6. Wait 5-30 minutes for validation to complete

**Check again until status shows "ISSUED"**

## Step 2: Update Namecheap Nameservers

Get your Route 53 nameservers:

```bash
aws route53 get-hosted-zone --id <YOUR_HOSTED_ZONE_ID>
```

Or find them in AWS Console: https://console.aws.amazon.com/route53/v2/hostedzones

You'll get 4 nameservers like:

```
ns-123.awsdns-12.com
ns-456.awsdns-45.net
ns-789.awsdns-78.org
ns-012.awsdns-01.co.uk
```

**Update Namecheap:**

1. Go to [Namecheap Dashboard](https://ap.www.namecheap.com/domains/list/)
2. Click "Manage" next to popmap.co
3. Find "Nameservers" section
4. Select "Custom DNS"
5. Add all 4 AWS nameservers
6. Save changes

**Wait 1-48 hours for DNS propagation** (usually 1-4 hours)

## Step 3: Deploy Infrastructure with Terraform

Your `terraform.tfvars` is already configured with:

- Domain: `popmap.co`
- Certificate ARNs (both)

**Deploy:**

```bash
cd terraform

# Review what will be created
terraform plan

# Deploy (adds CloudFront, S3, DNS records to existing RDS infrastructure)
terraform apply
```

This creates:

- S3 bucket: `popmap-frontend`
- CloudFront distribution with SSL
- Route 53 A records for popmap.co and www.popmap.co

**Takes about 15-20 minutes** (CloudFront is slow to provision)

## Step 4: Verify Deployment

After `terraform apply` completes:

```bash
# Get your CloudFront distribution ID
terraform output cloudfront_distribution_id

# Get website URLs
terraform output website_url

# Get nameservers (verify they match what you added to Namecheap)
terraform output nameservers

# Get deployment instructions
terraform output deployment_instructions
```

## Step 5: Deploy Frontend to S3

**Build and deploy:**

```bash
# Build React app
cd ../frontend
npm run build

# Get S3 bucket name
cd ../terraform
S3_BUCKET=$(terraform output -raw s3_bucket_name)

# Upload to S3
aws s3 sync ../frontend/dist/ s3://$S3_BUCKET/ --delete

# Invalidate CloudFront cache
CF_DIST=$(terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation --distribution-id $CF_DIST --paths "/*"
```

## Step 6: Update Application Configuration

**Frontend `.env`:**

```bash
# frontend/.env
VITE_API_URL=https://api.popmap.co/api
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

**Backend `.env`:**

```bash
# backend/.env
DEBUG=False
ALLOWED_HOSTS=api.popmap.co,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://popmap.co,https://www.popmap.co
DATABASE_URL=<from terraform output -raw database_url>
```

## Step 7: Test Your Site

**Check DNS propagation:**

```bash
# Should show CloudFront IP addresses
dig popmap.co
dig www.popmap.co

# Or use online tool
# https://dnschecker.org/#A/popmap.co
```

**Visit your site:**

- https://popmap.co ✅
- https://www.popmap.co ✅

**Expected behavior:**

- Both URLs work with HTTPS (green lock)
- HTTP redirects to HTTPS
- React app loads correctly

## Troubleshooting

### Certificate validation stuck at PENDING_VALIDATION

**Solution:**

1. Go to ACM Console
2. Click certificate → "Create records in Route 53"
3. Wait 5-30 minutes

### DNS not resolving after 24 hours

**Check:**

```bash
# Verify nameservers are correct
dig NS popmap.co
```

Should show AWS nameservers. If not, verify Namecheap settings.

### CloudFront shows "Access Denied"

**Likely cause:** S3 bucket policy not applied yet

**Solution:**

```bash
terraform apply  # Reapply to ensure all policies are set
```

### Site loads but shows old content

**Solution:** Invalidate CloudFront cache

```bash
CF_DIST=$(terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation --distribution-id $CF_DIST --paths "/*"
```

## Next Steps: Backend API Domain

The `api.popmap.co` domain is reserved but not yet configured. You'll set this up when deploying your backend to:

- Elastic Beanstalk, or
- ECS Fargate, or
- EC2 with Load Balancer

The SSL certificate for `api.popmap.co` is already created and validated.

When ready, uncomment the Route 53 record in `terraform/dns.tf`:

```hcl
resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.backend.dns_name  # Your load balancer
    zone_id                = aws_lb.backend.zone_id
    evaluate_target_health = true
  }
}
```

## Useful Commands

```bash
# Deploy frontend changes
cd frontend && npm run build
S3_BUCKET=$(cd ../terraform && terraform output -raw s3_bucket_name)
aws s3 sync dist/ s3://$S3_BUCKET/ --delete
CF_DIST=$(cd ../terraform && terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation --distribution-id $CF_DIST --paths "/*"

# Check CloudFront status
aws cloudfront get-distribution --id <DISTRIBUTION_ID>

# List SSL certificates
aws acm list-certificates --region us-east-1

# Check Route 53 records
aws route53 list-resource-record-sets --hosted-zone-id <ZONE_ID>
```

## Cost Breakdown

**Monthly costs:**

- Route 53 Hosted Zone: $0.50
- CloudFront (low traffic): $1-5
- S3 Storage (few GB): $0.10-0.50
- SSL Certificates: FREE
- **Total: ~$2-6/month for frontend hosting**

**Data transfer costs:**

- First 1 TB/month from CloudFront: $0.085/GB
- Example: 10,000 page loads (~50MB) = ~$5/month

## Summary

After completing these steps:

- ✅ Frontend deployed to popmap.co with HTTPS
- ✅ Global CDN via CloudFront (fast everywhere)
- ✅ Free SSL certificates (auto-renewed by AWS)
- ✅ Infrastructure as code (reproducible with Terraform)
- 🔜 Backend API at api.popmap.co (next phase)
