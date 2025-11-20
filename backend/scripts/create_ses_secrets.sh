#!/bin/bash
# Script to create AWS Secrets Manager secret for SES SMTP credentials

aws secretsmanager create-secret \
  --name popmap/prod/ses-smtp \
  --description "SES SMTP credentials for sending emails" \
  --secret-string '{
    "EMAIL_HOST_USER": "AKIA2UC266GX77BSDV77",
    "EMAIL_HOST_PASSWORD": "BFgf+dVRDgpu5aNGNh1IGLMj/StJQoAuaHkBB8gpx5WE"
  }' \
  --region us-east-1

echo "Secret created successfully!"
echo "Secret ARN will be printed above"
