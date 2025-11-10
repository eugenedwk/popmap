# PopMap Backend Deployment Guide

## ECS Fargate Infrastructure - Complete! ✅

Your Django backend is now ready to deploy to AWS ECS Fargate with the following infrastructure:

### What's Deployed:
- **ECS Cluster**: `popmap-dev-cluster`
- **ECR Repository**: `730335211951.dkr.ecr.us-east-1.amazonaws.com/popmap-backend`
- **Application Load Balancer**: HTTPS enabled with SSL certificate
- **DNS**: `api.popmap.co` → ALB
- **Secrets Manager**:
  - Django SECRET_KEY (auto-generated)
  - Database credentials (RDS PostgreSQL)
- **Auto-scaling**: 1-4 tasks based on CPU/Memory
- **Security**: All following AWS best practices

### Architecture:
```
Internet → ALB (HTTPS) → ECS Fargate → RDS PostgreSQL
                        ↓
                      S3 Media (CloudFront)
```

---

## Deployment Options

### Option A: Manual Docker Build (Requires Docker Desktop)

1. **Install Docker Desktop** (if not already installed):
   - Download from https://www.docker.com/products/docker-desktop/

2. **Build and Push to ECR**:
   ```bash
   cd backend

   # Login to ECR
   aws ecr get-login-password --region us-east-1 | \
     docker login --username AWS --password-stdin \
     730335211951.dkr.ecr.us-east-1.amazonaws.com

   # Build Docker image
   docker build -t 730335211951.dkr.ecr.us-east-1.amazonaws.com/popmap-backend:latest .

   # Push to ECR
   docker push 730335211951.dkr.ecr.us-east-1.amazonaws.com/popmap-backend:latest
   ```

3. **Run Database Migrations**:
   ```bash
   aws ecs run-task \
     --cluster popmap-dev-cluster \
     --task-definition popmap-backend \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[subnet-096e6a0b0570a0280,subnet-0b6930b373f703aba],securityGroups=[sg-0088d511f71588704],assignPublicIp=ENABLED}" \
     --overrides '{"containerOverrides": [{"name": "backend", "command": ["python", "manage.py", "migrate"]}]}'
   ```

4. **Force Service Deployment**:
   ```bash
   aws ecs update-service \
     --cluster popmap-dev-cluster \
     --service popmap-backend-service \
     --force-new-deployment
   ```

---

### Option B: GitHub Actions CI/CD (Recommended - No Docker needed!)

**This is the easiest way!** Just push your code and GitHub Actions will build and deploy automatically.

#### Setup GitHub Secrets:

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add:

```
AWS_REGION=us-east-1
AWS_BACKEND_ROLE_ARN=arn:aws:iam::730335211951:role/popmap-github-actions-backend
ECR_REPOSITORY=popmap-backend
ECS_CLUSTER=popmap-dev-cluster
ECS_SERVICE=popmap-backend-service
ECS_TASK_DEFINITION=popmap-backend
```

#### Trigger Deployment:

```bash
cd /Users/eugenekim/Repos/popmap

# Commit and push
git add .
git commit -m "Deploy Django backend to ECS Fargate"
git push origin main
```

GitHub Actions will automatically:
1. Build the Docker image
2. Push to ECR
3. Update ECS task definition
4. Deploy new tasks
5. Run database migrations
6. Verify deployment

---

## Post-Deployment Tasks

### 1. Verify API is Running

Wait 3-5 minutes after deployment, then test:

```bash
# Test API endpoint
curl https://api.popmap.co/api/events/

# Should return JSON response
```

### 2. Create Django Superuser

```bash
# Get running task ARN
TASK_ARN=$(aws ecs list-tasks \
  --cluster popmap-dev-cluster \
  --service-name popmap-backend-service \
  --query 'taskArns[0]' \
  --output text)

# Create superuser (interactive)
aws ecs execute-command \
  --cluster popmap-dev-cluster \
  --task $TASK_ARN \
  --container backend \
  --interactive \
  --command "python manage.py createsuperuser"
```

### 3. Access Django Admin

Visit: https://api.popmap.co/admin

### 4. Load Initial Data (Optional)

```bash
# Execute into container
aws ecs execute-command \
  --cluster popmap-dev-cluster \
  --task $TASK_ARN \
  --container backend \
  --interactive \
  --command "/bin/bash"

# Inside container, run your data scripts
python create_categories.py
python add_test_data.py
```

---

## Monitoring and Debugging

### View Logs:
```bash
# Tail logs in real-time
aws logs tail /ecs/popmap-backend --follow

# View recent logs
aws logs tail /ecs/popmap-backend --since 10m
```

### Check Service Status:
```bash
aws ecs describe-services \
  --cluster popmap-dev-cluster \
  --services popmap-backend-service \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Events:events[0:3]}'
```

### Check Task Status:
```bash
aws ecs list-tasks \
  --cluster popmap-dev-cluster \
  --service-name popmap-backend-service

aws ecs describe-tasks \
  --cluster popmap-dev-cluster \
  --tasks <task-arn>
```

### Common Issues:

**Issue: Task keeps restarting**
- Check logs: `aws logs tail /ecs/popmap-backend --follow`
- Verify secrets are accessible
- Check database connectivity

**Issue: Health check failing**
- Ensure `/api/events/` endpoint returns 200
- Check Django ALLOWED_HOSTS setting
- Verify database migrations ran successfully

**Issue: Can't connect to database**
- Verify security groups allow ECS → RDS
- Check DATABASE_URL secret is correct
- Ensure RDS is in same VPC as ECS tasks

---

## Architecture Details

### Security:
- ✅ Database credentials in Secrets Manager (not hardcoded)
- ✅ Django SECRET_KEY auto-generated in Secrets Manager
- ✅ HTTPS only (HTTP redirects to HTTPS)
- ✅ Security groups restrict traffic (Internet → ALB → ECS → RDS)
- ✅ Non-root container user
- ✅ Private database in isolated subnets

### Cost Optimization:
- ECS tasks in public subnets (no NAT Gateway needed: saves ~$32/month)
- Auto-scaling: Scales down to 1 task when idle
- Fargate Spot (can be enabled later for ~70% savings)

### Scalability:
- Auto-scales 1-4 tasks based on CPU (70%) and Memory (80%)
- Application Load Balancer distributes traffic
- CloudFront CDN for media files
- RDS can be upgraded to larger instance when needed

---

## Next Steps

1. **Choose Deployment Option** (A or B above)
2. **Run initial migrations**
3. **Create superuser**
4. **Test API endpoints**
5. **Update frontend** to use `https://api.popmap.co/api`
6. **Load initial data** (categories, test events)

---

## Production Checklist (Before Going Live)

- [ ] Enable RDS Multi-AZ for high availability
- [ ] Enable RDS automated backups (7+ days retention)
- [ ] Set up CloudWatch alarms for critical metrics
- [ ] Enable AWS WAF for DDoS protection
- [ ] Configure log retention policies
- [ ] Set up database read replicas if needed
- [ ] Enable Secrets Manager automatic rotation
- [ ] Review and adjust auto-scaling thresholds
- [ ] Set up monitoring dashboard
- [ ] Configure error tracking (Sentry, etc.)

---

**Infrastructure Status**: ✅ Ready for deployment
**API Endpoint**: https://api.popmap.co
**Region**: us-east-1
**Documentation**: This file + RDS_ECS_INTEGRATION.md
