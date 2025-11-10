# S3 bucket for media files (business logos, event images)
resource "aws_s3_bucket" "media" {
  bucket = "${var.project_name}-media-${var.environment}"

  tags = {
    Name        = "${var.project_name}-media-${var.environment}"
    Environment = var.environment
    Purpose     = "Media storage"
  }
}

# Enable versioning for media files
resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Block public access by default - CloudFront will access via OAC
resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CORS configuration for direct uploads from frontend (if needed later)
resource "aws_s3_bucket_cors_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    allowed_origins = [
      "https://${var.domain_name}",
      "https://www.${var.domain_name}",
      "http://localhost:5173"  # Development
    ]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Lifecycle rules to manage old versions
resource "aws_s3_bucket_lifecycle_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    filter {}  # Empty filter applies to all objects

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }

  rule {
    id     = "abort-incomplete-multipart-uploads"
    status = "Enabled"

    filter {}  # Empty filter applies to all objects

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# CloudFront Origin Access Control for media bucket
resource "aws_cloudfront_origin_access_control" "media" {
  name                              = "${var.project_name}-media-oac"
  description                       = "OAC for media bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront distribution for media files
resource "aws_cloudfront_distribution" "media" {
  enabled             = true
  comment             = "Media CDN for ${var.project_name}"
  default_root_object = ""
  price_class         = "PriceClass_100"  # US, Canada, Europe

  origin {
    domain_name              = aws_s3_bucket.media.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.media.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.media.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.media.id}"

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400   # 1 day
    max_ttl                = 31536000 # 1 year
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    # TODO: Add custom domain for media (media.popmap.co) with ACM certificate
    # acm_certificate_arn      = var.media_certificate_arn
    # ssl_support_method       = "sni-only"
    # minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name        = "${var.project_name}-media-cdn"
    Environment = var.environment
  }
}

# S3 bucket policy to allow CloudFront OAC access
resource "aws_s3_bucket_policy" "media" {
  bucket = aws_s3_bucket.media.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAC"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.media.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.media.arn
          }
        }
      }
    ]
  })
}

# IAM policy for Django backend to upload media files
resource "aws_iam_policy" "media_upload" {
  name        = "${var.project_name}-media-upload-policy"
  description = "Allow Django backend to upload media files to S3"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowMediaUpload"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.media.arn,
          "${aws_s3_bucket.media.arn}/*"
        ]
      }
    ]
  })
}

# IAM user for backend application (for local/EC2 deployments)
resource "aws_iam_user" "backend_media" {
  name = "${var.project_name}-backend-media-user"

  tags = {
    Name        = "${var.project_name}-backend-media-user"
    Environment = var.environment
    Purpose     = "Django backend media uploads"
  }
}

# Attach media upload policy to backend user
resource "aws_iam_user_policy_attachment" "backend_media" {
  user       = aws_iam_user.backend_media.name
  policy_arn = aws_iam_policy.media_upload.arn
}

# Create access key for backend user (only for development - use IAM roles in production)
resource "aws_iam_access_key" "backend_media" {
  user = aws_iam_user.backend_media.name
}
