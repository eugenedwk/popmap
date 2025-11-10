output "db_instance_endpoint" {
  description = "Connection endpoint for the RDS instance"
  value       = aws_db_instance.postgres.endpoint
}

output "db_instance_address" {
  description = "Address of the RDS instance"
  value       = aws_db_instance.postgres.address
}

output "db_instance_name" {
  description = "Name of the database"
  value       = aws_db_instance.postgres.db_name
}

output "db_instance_port" {
  description = "Port of the RDS instance"
  value       = aws_db_instance.postgres.port
}

output "db_username" {
  description = "Master username for the database"
  value       = aws_db_instance.postgres.username
  sensitive   = true
}

output "database_url" {
  description = "Full database URL for Django (use this in backend .env)"
  value       = "postgresql://${aws_db_instance.postgres.username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/${aws_db_instance.postgres.db_name}"
  sensitive   = true
}

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "security_group_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.rds.id
}

output "connection_instructions" {
  description = "Instructions for connecting to the database"
  value       = <<-EOT
    To connect to your database:

    1. Get the DATABASE_URL (run: terraform output -raw database_url)
    2. Add it to your backend/.env file:
       DATABASE_URL=<the output from step 1>

    3. To connect with psql:
       psql postgresql://${aws_db_instance.postgres.username}:<password>@${aws_db_instance.postgres.endpoint}/${aws_db_instance.postgres.db_name}

    4. Run Django migrations:
       cd backend
       python manage.py migrate
  EOT
}

# Frontend and Domain Outputs
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "s3_bucket_name" {
  description = "S3 bucket name for frontend hosting"
  value       = aws_s3_bucket.frontend.id
}

output "website_url" {
  description = "Website URL"
  value       = "https://${var.domain_name}"
}

output "api_url" {
  description = "API URL (configure backend endpoint separately)"
  value       = "https://api.${var.domain_name}"
}

output "nameservers" {
  description = "Route 53 nameservers (add these to Namecheap)"
  value       = data.aws_route53_zone.main.name_servers
}

output "deployment_instructions" {
  description = "Instructions for deploying the frontend"
  value       = <<-EOT
    Frontend Deployment Instructions:

    1. Build your React app:
       cd frontend
       npm run build

    2. Upload to S3:
       aws s3 sync dist/ s3://${aws_s3_bucket.frontend.id}/ --delete

    3. Invalidate CloudFront cache:
       aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.frontend.id} --paths "/*"

    4. Your site will be live at:
       https://${var.domain_name}
       https://www.${var.domain_name}

    5. Update frontend/.env:
       VITE_API_URL=https://api.${var.domain_name}/api

    6. Update backend/.env:
       ALLOWED_HOSTS=api.${var.domain_name},localhost
       CORS_ALLOWED_ORIGINS=https://${var.domain_name},https://www.${var.domain_name}
  EOT
}

# CI/CD Outputs
output "github_actions_role_arn_frontend" {
  description = "ARN of the IAM role for GitHub Actions frontend deployment"
  value       = aws_iam_role.github_actions_frontend.arn
}

output "github_actions_role_arn_backend" {
  description = "ARN of the IAM role for GitHub Actions backend deployment"
  value       = aws_iam_role.github_actions_backend.arn
}

output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

# Media Storage Outputs
output "media_bucket_name" {
  description = "S3 bucket name for media files"
  value       = aws_s3_bucket.media.id
}

output "media_bucket_arn" {
  description = "S3 bucket ARN for media files"
  value       = aws_s3_bucket.media.arn
}

output "media_cloudfront_url" {
  description = "CloudFront URL for media files"
  value       = "https://${aws_cloudfront_distribution.media.domain_name}"
}

output "media_cloudfront_distribution_id" {
  description = "CloudFront distribution ID for media files"
  value       = aws_cloudfront_distribution.media.id
}

output "backend_media_access_key_id" {
  description = "AWS Access Key ID for backend media uploads"
  value       = aws_iam_access_key.backend_media.id
  sensitive   = true
}

output "backend_media_secret_access_key" {
  description = "AWS Secret Access Key for backend media uploads"
  value       = aws_iam_access_key.backend_media.secret
  sensitive   = true
}

output "media_setup_instructions" {
  description = "Instructions for configuring media storage"
  value       = <<-EOT
    Media Storage Configuration:

    1. Install django-storages:
       cd backend
       pip install django-storages[s3]
       pip freeze > requirements.txt

    2. Add to backend/.env:
       AWS_STORAGE_BUCKET_NAME=${aws_s3_bucket.media.id}
       AWS_S3_REGION_NAME=${var.aws_region}
       AWS_S3_CUSTOM_DOMAIN=${aws_cloudfront_distribution.media.domain_name}
       AWS_ACCESS_KEY_ID=<run: terraform output -raw backend_media_access_key_id>
       AWS_SECRET_ACCESS_KEY=<run: terraform output -raw backend_media_secret_access_key>
       USE_S3=True  # Set to False for local development

    3. Media files will be served from:
       https://${aws_cloudfront_distribution.media.domain_name}

    4. When you upload images via Django admin, they'll automatically go to S3
  EOT
}

# ECS Backend Outputs
output "ecr_repository_url" {
  description = "ECR repository URL for backend Docker images"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.backend.name
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = aws_lb.backend.dns_name
}

output "alb_zone_id" {
  description = "Application Load Balancer zone ID (for Route 53 alias record)"
  value       = aws_lb.backend.zone_id
}

output "backend_api_endpoint" {
  description = "Backend API endpoint"
  value       = "https://api.${var.domain_name}"
}

output "django_secret_key_arn" {
  description = "ARN of Django secret key in Secrets Manager"
  value       = aws_secretsmanager_secret.django_secret_key.arn
  sensitive   = true
}

output "db_secret_arn" {
  description = "ARN of the database credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
  sensitive   = true
}

output "db_secret_name" {
  description = "Name of the database credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.name
}

output "ecs_deployment_instructions" {
  description = "Instructions for deploying the backend to ECS"
  value       = <<-EOT
    ECS Backend Deployment Instructions:

    1. Build and push Docker image:
       cd backend
       aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${aws_ecr_repository.backend.repository_url}
       docker build -t ${aws_ecr_repository.backend.repository_url}:latest .
       docker push ${aws_ecr_repository.backend.repository_url}:latest

    2. Run migrations (one-time task):
       aws ecs run-task \
         --cluster ${aws_ecs_cluster.main.name} \
         --task-definition ${aws_ecs_task_definition.backend.family} \
         --launch-type FARGATE \
         --network-configuration "awsvpcConfiguration={subnets=[${join(",", aws_subnet.public[*].id)}],securityGroups=[${aws_security_group.ecs_tasks.id}],assignPublicIp=ENABLED}" \
         --overrides '{"containerOverrides": [{"name": "backend", "command": ["python", "manage.py", "migrate"]}]}'

    3. Update ECS service to use new image:
       aws ecs update-service \
         --cluster ${aws_ecs_cluster.main.name} \
         --service ${aws_ecs_service.backend.name} \
         --force-new-deployment

    4. Monitor deployment:
       aws ecs describe-services \
         --cluster ${aws_ecs_cluster.main.name} \
         --services ${aws_ecs_service.backend.name}

    5. View logs:
       aws logs tail /ecs/${var.project_name}-backend --follow

    6. Your API will be available at:
       https://api.${var.domain_name}

    Note: The Django secret key has been automatically generated and stored in AWS Secrets Manager.
  EOT
}
