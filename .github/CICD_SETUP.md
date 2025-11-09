# CI/CD Setup Guide - GitHub Actions

**Status:** ✅ **COMPLETE** - CI/CD is live and operational

This guide walks you through setting up automated deployments using GitHub Actions with AWS OIDC authentication (no credentials needed!).

## Overview

**What you get:**
- Automatic frontend deployment to S3 + CloudFront on every push to `main`
- No AWS credentials stored in GitHub (uses OIDC federation)
- Secure, auditable deployments
- Cache invalidation included

## Prerequisites

- [x] GitHub repository created (`eugenedwk/popmap`)
- [x] AWS infrastructure deployed via Terraform
- [x] Terraform applied with CI/CD resources
- [x] GitHub secrets configured
- [x] Frontend deployed to https://popmap.co

## Step 1: Deploy CI/CD Infrastructure with Terraform

The CI/CD resources (IAM roles, OIDC provider) are already defined in `terraform/cicd.tf`.

```bash
cd terraform

# Apply Terraform to create GitHub OIDC provider and IAM roles
terraform apply

# Note the outputs - you'll need these for GitHub secrets
terraform output github_actions_role_arn_frontend
terraform output s3_bucket_name
terraform output cloudfront_distribution_id
terraform output aws_region
```

**What this creates:**
- AWS IAM OIDC provider for GitHub Actions
- IAM role `popmap-github-actions-frontend` with S3 and CloudFront permissions
- IAM role `popmap-github-actions-backend` (for future use)

## Step 2: Configure GitHub Secrets

Go to your GitHub repository settings:
**https://github.com/eugenedwk/popmap/settings/secrets/actions**

Click **"New repository secret"** and add each of these:

### Required Secrets

| Secret Name | Value | Where to find it |
|-------------|-------|------------------|
| `AWS_ROLE_ARN_FRONTEND` | ARN of the GitHub Actions IAM role | `terraform output github_actions_role_arn_frontend` |
| `AWS_REGION` | `us-east-1` | `terraform output aws_region` |
| `S3_BUCKET` | `popmap-frontend` | `terraform output s3_bucket_name` |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID | `terraform output cloudfront_distribution_id` |
| `GOOGLE_MAPS_API_KEY` | Your Google Maps API key | From Google Cloud Console |

### How to add secrets:

```bash
# Get the values from Terraform
cd terraform

echo "AWS_ROLE_ARN_FRONTEND:"
terraform output -raw github_actions_role_arn_frontend

echo -e "\nAWS_REGION:"
terraform output -raw aws_region

echo -e "\nS3_BUCKET:"
terraform output -raw s3_bucket_name

echo -e "\nCLOUDFRONT_DISTRIBUTION_ID:"
terraform output -raw cloudfront_distribution_id
```

Copy each value and add it as a secret in GitHub.

## Step 3: Verify the Workflow

The workflow file is at `.github/workflows/deploy-frontend.yml`.

**Triggers:**
- Automatically on push to `main` branch when files in `frontend/` change
- Manually via "Actions" tab → "Deploy Frontend" → "Run workflow"

**Steps:**
1. Checkout code
2. Setup Node.js 18
3. Install dependencies (`npm ci`)
4. Build React app (`npm run build`)
5. Authenticate to AWS via OIDC (no credentials!)
6. Upload to S3
7. Invalidate CloudFront cache

## Step 4: Test the Deployment

### Manual Test (first time):

1. Go to **https://github.com/eugenedwk/popmap/actions**
2. Click "Deploy Frontend to S3 & CloudFront" workflow
3. Click "Run workflow" → Select `main` branch → "Run workflow"
4. Watch the deployment progress

### Automatic Test:

Make a small change to the frontend and push:

```bash
# Make a change to the frontend
echo "<!-- Test CI/CD -->" >> frontend/src/App.jsx

# Commit and push
git add frontend/src/App.jsx
git commit -m "Test CI/CD deployment"
git push origin main
```

Go to **Actions** tab and watch it deploy automatically!

## Step 5: Verify Live Site

After deployment completes (usually 2-3 minutes):

- Visit: **https://popmap.co**
- Check CloudFront invalidation completed

## Troubleshooting

### Workflow fails with "AccessDenied" error

**Cause:** IAM role not created or secrets incorrect

**Fix:**
```bash
cd terraform
terraform apply  # Ensure CI/CD resources are created
terraform output github_actions_role_arn_frontend  # Verify role ARN
```

Update the `AWS_ROLE_ARN_FRONTEND` secret in GitHub with the correct ARN.

### Workflow fails at "Configure AWS credentials"

**Cause:** OIDC trust relationship issue

**Fix:**
Verify the GitHub repo name in `terraform/variables.tf`:
```hcl
variable "github_repo" {
  default = "eugenedwk/popmap"  # Must match exactly!
}
```

If incorrect:
```bash
cd terraform
# Edit variables.tf
terraform apply  # Re-create IAM role with correct trust
```

### Build succeeds but site doesn't update

**Cause:** CloudFront cache not invalidated or DNS not propagated

**Fix:**
```bash
# Manually invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id $(cd terraform && terraform output -raw cloudfront_distribution_id) \
  --paths "/*"

# Check invalidation status
aws cloudfront list-invalidations \
  --distribution-id $(cd terraform && terraform output -raw cloudfront_distribution_id)
```

Wait 1-2 minutes for CloudFront to propagate globally.

### "npm ci" fails with dependency errors

**Cause:** `package-lock.json` out of sync

**Fix:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "Update package-lock.json"
git push
```

## Security Best Practices

✅ **No AWS credentials in GitHub** - Uses OIDC federation
✅ **Least privilege IAM policies** - Roles have minimal required permissions
✅ **Scoped to specific repository** - IAM trust limited to `eugenedwk/popmap`
✅ **Audit trail** - All deployments logged in CloudWatch

## Cost

GitHub Actions:
- **Free tier:** 2000 minutes/month
- Each frontend deployment: ~2-3 minutes
- **Cost:** FREE for small projects

## Workflow Customization

### Deploy only on tagged releases:

Edit `.github/workflows/deploy-frontend.yml`:
```yaml
on:
  push:
    tags:
      - 'v*'  # Only deploy on version tags (v1.0.0, v1.1.0, etc.)
```

### Add tests before deployment:

```yaml
steps:
  - name: Run tests
    working-directory: frontend
    run: npm test

  - name: Run linter
    working-directory: frontend
    run: npm run lint

  # ... rest of deployment steps
```

### Add Slack/Discord notifications:

```yaml
  - name: Notify on success
    if: success()
    uses: slackapi/slack-github-action@v1
    with:
      webhook-url: ${{ secrets.SLACK_WEBHOOK }}
      payload: |
        {
          "text": "✅ Frontend deployed to https://popmap.co"
        }
```

## Next Steps

1. **Backend CI/CD:** Once backend hosting is set up (Elastic Beanstalk/ECS), create `.github/workflows/deploy-backend.yml`
2. **Staging environment:** Create separate Terraform workspaces for staging
3. **Pull Request previews:** Deploy PR branches to temporary CloudFront distributions

## Summary

✅ **CI/CD is ready!** Every push to `main` that changes `frontend/` will automatically deploy to https://popmap.co

- **No manual deployment needed**
- **No AWS credentials to manage**
- **Automatic cache invalidation**
- **Full audit trail**

Happy deploying! 🚀
