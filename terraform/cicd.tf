# GitHub OIDC Provider for GitHub Actions
# This allows GitHub Actions to authenticate to AWS without storing credentials

data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com/.well-known/openid-configuration"
}

resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  thumbprint_list = [data.tls_certificate.github.certificates[0].sha1_fingerprint]

  tags = {
    Name        = "${var.project_name}-github-oidc"
    Project     = var.project_name
    Environment = var.environment
  }
}

# IAM Role for GitHub Actions - Frontend Deployment
resource "aws_iam_role" "github_actions_frontend" {
  name = "${var.project_name}-github-actions-frontend"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:*"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-github-actions-frontend"
    Project     = var.project_name
    Environment = var.environment
  }
}

# IAM Policy for Frontend Deployment (S3 + CloudFront)
resource "aws_iam_role_policy" "github_actions_frontend" {
  name = "frontend-deployment"
  role = aws_iam_role.github_actions_frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3Access"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:PutObjectAcl"
        ]
        Resource = [
          aws_s3_bucket.frontend.arn,
          "${aws_s3_bucket.frontend.arn}/*"
        ]
      },
      {
        Sid    = "CloudFrontInvalidation"
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation",
          "cloudfront:GetInvalidation",
          "cloudfront:ListInvalidations"
        ]
        Resource = aws_cloudfront_distribution.frontend.arn
      }
    ]
  })
}

# IAM Role for GitHub Actions - Backend Deployment (for future use)
resource "aws_iam_role" "github_actions_backend" {
  name = "${var.project_name}-github-actions-backend"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:*"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-github-actions-backend"
    Project     = var.project_name
    Environment = var.environment
  }
}

# IAM Policy for Backend Deployment (Elastic Beanstalk/ECS - placeholder)
# Uncomment and customize when backend hosting is set up
# resource "aws_iam_role_policy" "github_actions_backend" {
#   name = "backend-deployment"
#   role = aws_iam_role.github_actions_backend.id
#
#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Sid    = "ElasticBeanstalkDeploy"
#         Effect = "Allow"
#         Action = [
#           "elasticbeanstalk:*",
#           "ec2:*",
#           "autoscaling:*",
#           "elasticloadbalancing:*",
#           "s3:*"
#         ]
#         Resource = "*"
#       }
#     ]
#   })
# }
