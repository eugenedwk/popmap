# PopMap Terraform Infrastructure

This directory contains Terraform configuration for provisioning AWS infrastructure for the PopMap project, including:
- VPC with public and private subnets
- RDS PostgreSQL instance
- Security groups
- IAM roles for monitoring

## Prerequisites

1. **Install Terraform**
   ```bash
   # macOS
   brew install terraform

   # Verify installation
   terraform version
   ```

2. **AWS Account & Credentials**
   - AWS account with permissions to create VPC, RDS, and IAM resources
   - AWS CLI installed and configured

## Initial Setup

### Step 1: Configure AWS Credentials

You need to get your AWS credentials from the AWS Console:

1. Go to [AWS Console](https://console.aws.amazon.com)
2. Click your username (top right) → Security credentials
3. Under "Access keys", click "Create access key"
4. Choose "Command Line Interface (CLI)" → Create
5. Save the Access Key ID and Secret Access Key

Configure AWS CLI:
```bash
aws configure
```

Enter:
- AWS Access Key ID: `<from step 3>`
- AWS Secret Access Key: `<from step 3>`
- Default region: `us-west-2` (or your preferred region)
- Default output format: `json`

Verify:
```bash
aws sts get-caller-identity
```

### Step 2: Get Your IP Address

The database will be configured to only accept connections from your IP:

```bash
curl -s https://checkip.amazonaws.com
```

Save this IP address - you'll need it in the next step.

### Step 3: Create terraform.tfvars

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and update:

**REQUIRED VALUES:**
- `allowed_cidr_blocks`: Add your IP from Step 2 in format `["x.x.x.x/32"]`
- `db_password`: Set a strong password (min 16 characters recommended)

**OPTIONAL VALUES:**
- `aws_region`: Change if you want a different region
- `db_instance_class`: Use `db.t3.small` or larger for production
- `multi_az`: Set to `true` for production (high availability)

Example terraform.tfvars:
```hcl
aws_region          = "us-west-2"
allowed_cidr_blocks = ["203.0.113.42/32"]  # Your actual IP
db_password         = "SuperSecurePassword123!@#"
```

## Deploy Infrastructure

### Step 4: Initialize Terraform

```bash
cd terraform
terraform init
```

This downloads the AWS provider and prepares Terraform.

### Step 5: Review the Plan

```bash
terraform plan
```

This shows what resources will be created. Review carefully! You should see:
- 1 VPC
- 4 Subnets (2 public, 2 private)
- 1 Internet Gateway
- 1 Route table
- 1 DB subnet group
- 1 Security group
- 1 RDS instance
- 1 IAM role (if monitoring enabled)

### Step 6: Apply the Configuration

```bash
terraform apply
```

Type `yes` when prompted.

This will take **10-15 minutes** to create the RDS instance.

### Step 7: Get Database Connection Info

After apply completes, get your database URL:

```bash
terraform output -raw database_url
```

Copy this entire URL - you'll use it in your Django backend.

## Update Django Backend

1. Open `backend/.env`
2. Update the DATABASE_URL:
   ```
   DATABASE_URL=<paste the terraform output from Step 7>
   ```

3. Run Django migrations:
   ```bash
   cd ../backend
   source venv/bin/activate
   python manage.py migrate
   python manage.py createsuperuser  # Create admin user
   ```

## Useful Terraform Commands

### View Outputs
```bash
terraform output                      # All outputs
terraform output -raw database_url    # Just the database URL
terraform output connection_instructions  # Connection help
```

### View Current State
```bash
terraform show
terraform state list  # List all resources
```

### Update Infrastructure
After changing `terraform.tfvars` or `*.tf` files:
```bash
terraform plan   # Preview changes
terraform apply  # Apply changes
```

### Destroy Infrastructure
**WARNING: This deletes everything!**
```bash
terraform destroy
```

## AWS Console Verification

After deploying, verify in AWS Console:

1. **RDS Console** ([link](https://console.aws.amazon.com/rds))
   - Click "Databases" → You should see `popmap-dev-db`
   - Check status is "Available"
   - Note the endpoint and port

2. **VPC Console** ([link](https://console.aws.amazon.com/vpc))
   - VPCs → You should see `popmap-vpc`
   - Subnets → 4 subnets (2 public, 2 private)
   - Security Groups → `popmap-rds-sg`

3. **EC2 Console** ([link](https://console.aws.amazon.com/ec2))
   - Security Groups → Click `popmap-rds-sg`
   - Inbound rules → Should show port 5432 from your IP

## Cost Estimation

**Free Tier (first 12 months):**
- db.t3.micro with 20GB storage: **FREE** (750 hours/month)
- After free tier: ~$15-20/month

**Production (db.t3.small + Multi-AZ):**
- ~$60-80/month

Stop unnecessary resources:
```bash
terraform destroy  # When not in use
```

## Troubleshooting

### Can't connect to database

1. **Check security group:**
   ```bash
   # Get your current IP
   curl -s https://checkip.amazonaws.com

   # Update terraform.tfvars with new IP
   # Then apply
   terraform apply
   ```

2. **Verify RDS is running:**
   - Go to RDS Console
   - Check database status is "Available"

3. **Test connection:**
   ```bash
   # Install PostgreSQL client if needed
   brew install postgresql

   # Get connection details
   terraform output db_instance_endpoint
   terraform output -raw database_url

   # Test connection
   psql "$(terraform output -raw database_url)"
   ```

### Error: "Error creating DB Instance: DBInstanceAlreadyExists"

The database already exists. Either:
- Import existing: `terraform import aws_db_instance.postgres popmap-dev-db`
- Or destroy and recreate: `terraform destroy` then `terraform apply`

### Error: "InvalidParameterValue: DB instance class db.t3.micro is not available"

Your region might not support db.t3.micro. Change in terraform.tfvars:
```hcl
db_instance_class = "db.t4g.micro"  # Or db.t3.small
```

## Security Best Practices

1. **Never commit terraform.tfvars** - Contains secrets (already in .gitignore)
2. **Use strong passwords** - Min 16 characters, mixed case, numbers, symbols
3. **Restrict IP access** - Only add IPs that need database access
4. **Enable Multi-AZ for production** - Set `multi_az = true`
5. **Use private subnets for production** - Set `publicly_accessible = false`
6. **Enable deletion protection** - Automatic for `environment = "prod"`

## Next Steps

1. Connect your Django app to the new database
2. Run migrations: `python manage.py migrate`
3. Create superuser: `python manage.py createsuperuser`
4. Test the application end-to-end
5. For production: Update `environment = "prod"` in terraform.tfvars and enable Multi-AZ

## Support

If you encounter issues:
1. Check AWS CloudWatch logs
2. Review RDS events in AWS Console
3. Check `terraform.log` if terraform commands fail
4. Verify AWS credentials: `aws sts get-caller-identity`
