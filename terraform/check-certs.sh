#!/bin/bash

# Check certificate validation status
echo "Checking SSL certificate validation status..."
echo ""

FRONTEND_CERT="arn:aws:acm:us-east-1:730335211951:certificate/884a2953-cd0a-4139-836f-7db57bfe349c"
API_CERT="arn:aws:acm:us-east-1:730335211951:certificate/99bf003c-1dc0-4331-aa45-6bab49958107"

echo "Frontend Certificate (popmap.co + www.popmap.co):"
FRONTEND_STATUS=$(aws acm describe-certificate --certificate-arn $FRONTEND_CERT --region us-east-1 --query 'Certificate.Status' --output text)
echo "  Status: $FRONTEND_STATUS"

if [ "$FRONTEND_STATUS" = "ISSUED" ]; then
    echo "  ✅ Validated!"
else
    echo "  ⏳ Pending validation..."
    echo ""
    echo "  Domain validation status:"
    aws acm describe-certificate --certificate-arn $FRONTEND_CERT --region us-east-1 \
        --query 'Certificate.DomainValidationOptions[*].[DomainName,ValidationStatus]' \
        --output table
fi

echo ""
echo "API Certificate (api.popmap.co):"
API_STATUS=$(aws acm describe-certificate --certificate-arn $API_CERT --region us-east-1 --query 'Certificate.Status' --output text)
echo "  Status: $API_STATUS"

if [ "$API_STATUS" = "ISSUED" ]; then
    echo "  ✅ Validated!"
else
    echo "  ⏳ Pending validation..."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$FRONTEND_STATUS" = "ISSUED" ] && [ "$API_STATUS" = "ISSUED" ]; then
    echo "✅ All certificates validated! Ready to deploy."
    echo ""
    echo "Run the following commands to deploy:"
    echo "  cd terraform"
    echo "  terraform apply"
    echo ""
    echo "Then upload the placeholder page:"
    echo "  cd .."
    echo "  S3_BUCKET=\$(cd terraform && terraform output -raw s3_bucket_name)"
    echo "  aws s3 sync placeholder/ s3://\$S3_BUCKET/ --delete"
    echo "  CF_DIST=\$(cd terraform && terraform output -raw cloudfront_distribution_id)"
    echo "  aws cloudfront create-invalidation --distribution-id \$CF_DIST --paths \"/*\""
else
    echo "⏳ Still waiting for validation..."
    echo ""
    echo "This can take 5-30 minutes. DNS records are in place."
    echo "Run this script again in a few minutes to check status."
fi
