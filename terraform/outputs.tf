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
