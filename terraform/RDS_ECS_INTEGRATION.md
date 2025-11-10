# RDS Configuration for ECS/Fargate Integration

**Status:** Configuration changes required before ECS deployment
**Last Updated:** 2025-11-09

## Current RDS Configuration

### Network Details
- **VPC ID:** `vpc-06756472c019bf350`
- **RDS Security Group ID:** `sg-0b8bca4f0d7dc2e78`
- **RDS Endpoint:** `popmap-dev-db.c2tma4ou6yce.us-east-1.rds.amazonaws.com:5432`
- **Database Name:** `popmap`
- **Username:** `popmap_admin` (from terraform output)
- **Region:** `us-east-1`

### Network Architecture
- **Public Subnets (2):** For NAT, ALB, or public ECS tasks with Internet Gateway
- **Private Subnets (2):** Currently housing RDS instance
- **Internet Gateway:** ✅ Configured
- **NAT Gateway:** ❌ Not configured (optional, adds ~$32/month)

## Critical Issues Blocking ECS Deployment

### 🔴 Issue #1: RDS Security Group Blocks ECS Access

**Current Configuration** (`main.tf:116-122`):
```hcl
resource "aws_security_group" "rds" {
  # ...
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks  # Only specific IPs allowed
    description = "PostgreSQL access from allowed IPs"
  }
}
```

**Problem:**
- Only allows connections from IP addresses in `allowed_cidr_blocks`
- ECS tasks will be denied when trying to connect to database
- Security group needs to allow traffic from ECS tasks' security group

**Solution:** See "Required Terraform Changes" below

### ⚠️ Issue #2: Database Credentials Need Secrets Manager

**Current State:**
- Database password stored in `terraform.tfvars`
- Not suitable for ECS tasks to reference

**Required:**
- Store credentials in AWS Secrets Manager
- ECS task definition will reference secret ARN
- IAM role for ECS tasks needs permission to read secret

### ✅ Issue #3: VPC Subnets (Ready)

**Current Setup:**
- 2 Public subnets with IGW access ✅
- 2 Private subnets for RDS ✅

**ECS Deployment Options:**

**Option A: Public Subnets (Recommended for Dev)**
- Deploy ECS tasks in public subnets
- Tasks get public IPs, access internet via IGW
- Lower cost (no NAT Gateway needed)
- Secure with tight security groups
- **Use this for initial deployment**

**Option B: Private Subnets + NAT Gateway**
- More secure, tasks don't have public IPs
- Requires NAT Gateway (~$32/month)
- Implement later if needed for production

## Required Terraform Changes

### 1. Create ECS Tasks Security Group

Add to `main.tf` or create new `ecs-integration.tf`:

```hcl
# Security Group for ECS Tasks
resource "aws_security_group" "ecs_tasks" {
  name        = "${var.project_name}-ecs-tasks-sg"
  description = "Security group for ECS Fargate tasks"
  vpc_id      = aws_vpc.main.id

  # Inbound from ALB (add ALB security group reference when created)
  # ingress {
  #   from_port       = 8000
  #   to_port         = 8000
  #   protocol        = "tcp"
  #   security_groups = [aws_security_group.alb.id]
  #   description     = "Allow traffic from ALB"
  # }

  # Outbound to RDS
  egress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.rds.id]
    description     = "PostgreSQL access to RDS"
  }

  # Outbound HTTPS (for ECR, AWS APIs, pip installs)
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS to internet"
  }

  # Outbound HTTP (if needed)
  egress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP to internet"
  }

  tags = {
    Name        = "${var.project_name}-ecs-tasks-sg"
    Project     = var.project_name
    Environment = var.environment
  }
}

# Allow RDS to accept connections from ECS tasks
resource "aws_security_group_rule" "rds_from_ecs" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds.id
  source_security_group_id = aws_security_group.ecs_tasks.id
  description              = "PostgreSQL access from ECS tasks"
}
```

### 2. Create Secrets Manager Secret for Database

```hcl
# Database credentials secret
resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${var.project_name}/${var.environment}/db-credentials"
  description = "Database credentials for ${var.project_name}"

  tags = {
    Name        = "${var.project_name}-db-credentials"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username     = var.db_username
    password     = var.db_password
    engine       = "postgres"
    host         = aws_db_instance.postgres.address
    port         = aws_db_instance.postgres.port
    dbname       = aws_db_instance.postgres.db_name
    DATABASE_URL = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/${aws_db_instance.postgres.db_name}"
  })
}
```

### 3. Add Required Outputs

Add to `outputs.tf`:

```hcl
# ECS-related outputs
output "ecs_tasks_security_group_id" {
  description = "Security group ID for ECS tasks"
  value       = aws_security_group.ecs_tasks.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs for ECS tasks"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "db_secret_arn" {
  description = "ARN of the database credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "db_secret_name" {
  description = "Name of the database credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.name
}
```

## ECS Task IAM Role Permissions Required

The ECS task execution role will need these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:popmap/dev/db-credentials-*"
    }
  ]
}
```

## Deployment Checklist

### Before ECS Deployment

- [ ] Apply Terraform changes for ECS security group
- [ ] Apply Terraform changes for RDS security group rule
- [ ] Create Secrets Manager secret with database credentials
- [ ] Verify security group rules are active
- [ ] Get subnet IDs for ECS task placement

### ECS Task Definition Configuration

**Network Configuration:**
```yaml
VPC: vpc-06756472c019bf350
Subnets: [use public_subnet_ids from terraform output]
Security Groups: [ecs_tasks_security_group_id]
Assign Public IP: ENABLED  # Required for public subnets without NAT
```

**Environment Variables:**
Reference the secret in ECS task definition:
```json
{
  "secrets": [
    {
      "name": "DATABASE_URL",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:popmap/dev/db-credentials-XXXXXX:DATABASE_URL::"
    }
  ]
}
```

Or retrieve the full secret and parse in application startup.

### After ECS Deployment

- [ ] Test database connectivity from ECS task
- [ ] Run Django migrations: `python manage.py migrate`
- [ ] Create superuser: `python manage.py createsuperuser`
- [ ] Verify admin panel accessible at https://api.popmap.co/admin

## Testing Database Connection

Once ECS task is running, exec into the container and test:

```bash
# Get ECS task ID
aws ecs list-tasks --cluster <cluster-name> --service-name <service-name>

# Exec into container
aws ecs execute-command \
  --cluster <cluster-name> \
  --task <task-id> \
  --container <container-name> \
  --interactive \
  --command "/bin/bash"

# Inside container, test connection
python manage.py shell
>>> from django.db import connection
>>> connection.ensure_connection()
>>> print("Database connected successfully!")
```

## Quick Reference Values

Use these when setting up ECS in the other window:

```bash
# Network
VPC_ID="vpc-06756472c019bf350"
RDS_SECURITY_GROUP="sg-0b8bca4f0d7dc2e78"

# Database
DB_ENDPOINT="popmap-dev-db.c2tma4ou6yce.us-east-1.rds.amazonaws.com"
DB_PORT="5432"
DB_NAME="popmap"
DB_USERNAME="popmap_admin"  # (password in Secrets Manager)

# Region
AWS_REGION="us-east-1"

# After applying terraform changes:
ECS_SECURITY_GROUP=$(terraform output -raw ecs_tasks_security_group_id)
PUBLIC_SUBNETS=$(terraform output -json public_subnet_ids)
DB_SECRET_ARN=$(terraform output -raw db_secret_arn)
```

## Additional Notes

### RDS Accessibility
- `publicly_accessible = true` is set in variables.tf (line 87)
- RDS is in private subnets, so this setting doesn't make it truly public
- Access is controlled entirely by security groups
- Safe for development; consider setting to `false` for production

### Cost Considerations
- Current setup: Minimal cost (no NAT Gateway)
- RDS db.t3.micro: ~$15-20/month (after free tier)
- If NAT Gateway is added later: Additional ~$32/month

### Security Best Practices
- ECS tasks in public subnets: Use tight security group rules
- Only allow inbound traffic from ALB security group
- Secrets Manager: Automatic rotation can be enabled later
- Database: Consider enabling deletion protection for production

## Next Steps

1. **In this window:** Apply the Terraform changes above
2. **In ECS window:** Use the security group and subnet IDs from terraform outputs
3. **After ECS deployment:** Run migrations and create superuser via ECS Exec

---

**Created:** 2025-11-09
**For:** ECS/Fargate deployment configuration
**Reference:** See terraform/main.tf, terraform/outputs.tf
