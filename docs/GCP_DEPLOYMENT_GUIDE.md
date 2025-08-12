# GCP Deployment Guide - Staging Environment

## 🚀 Phase 1A: Basic Staging Infrastructure (Week 1)

### GCP Services Selection

#### Core Infrastructure
- **Compute Engine**: Application hosting (f1-micro for staging cost efficiency)
- **Cloud SQL**: MongoDB alternative (Firestore or Cloud SQL for MongoDB)
- **Cloud Storage**: File and backup storage
- **Cloud Build**: CI/CD pipeline
- **Cloud DNS**: Domain management
- **Cloud Load Balancing**: HTTPS and SSL termination

#### Recommended GCP Architecture for Staging

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cloud DNS     │    │ Load Balancer   │    │ Compute Engine  │
│   staging.      │───►│ SSL/HTTPS       │───►│ App Server      │
│   yourdomain    │    │ Health Checks   │    │ (f1-micro)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┐    ┌─────────────────┐
                       │ Cloud Storage   │    │ MongoDB Atlas   │
                       │ Files/Backups   │◄───┤ Database        │
                       └─────────────────┘    └─────────────────┘
```

## 📋 Week 1 Action Items

### Day 1: GCP Project Setup
```bash
# 1. Create GCP project
gcloud projects create document-ai-staging --name="Document AI Staging"

# 2. Set project as default
gcloud config set project document-ai-staging

# 3. Enable required APIs
gcloud services enable compute.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable container.googleapis.com
gcloud services enable dns.googleapis.com
```

### Day 2: MongoDB Atlas Setup (Free Tier)
1. **Create MongoDB Atlas Account**: https://www.mongodb.com/cloud/atlas
2. **Create Free Cluster (M0)**:
   - Provider: Google Cloud
   - Region: us-central1 (Iowa) - matches GCP region
   - Cluster Name: document-ai-staging
3. **Database Configuration**:
   - Database: form-autofill-staging
   - Collections: formdata, keyvalueindices, chathistories
4. **Security Setup**:
   - Create database user with read/write permissions
   - Configure IP whitelist (0.0.0.0/0 for staging, restrict later)
   - Get connection string

### Day 3: Domain and SSL Setup
```bash
# 1. Create DNS zone
gcloud dns managed-zones create document-ai-staging \
  --description="Document AI Staging DNS" \
  --dns-name=staging.yourdomain.com

# 2. Reserve static IP
gcloud compute addresses create document-ai-staging-ip --global

# 3. Get reserved IP
gcloud compute addresses list --filter="name=document-ai-staging-ip"
```

### Day 4: Application Dockerization

#### Production Dockerfile
```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ cairo-dev pango-dev giflib-dev

# Build frontend
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --only=production
COPY client/ ./
RUN npm run build

# Build backend
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ ./

# Production stage
FROM node:18-alpine
RUN apk add --no-cache cairo pango giflib

WORKDIR /app

# Copy built application
COPY --from=builder /app/client/build ./client/build
COPY --from=builder /app/server ./server
COPY --from=builder /app/server/node_modules ./server/node_modules

WORKDIR /app/server
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["node", "index.js"]
```

#### Environment Configuration (.env.production)
```env
# Server Configuration
PORT=8000
NODE_ENV=production

# MongoDB Atlas (replace with your connection string)
MONGODB_URI=mongodb+srv://username:password@document-ai-staging.mongodb.net/form-autofill-staging?retryWrites=true&w=majority

# AI Providers
AI_PROVIDER=google
GOOGLE_API_KEY=your_google_api_key_here
CLAUDE_API_KEY=your_claude_api_key_here

# GCP Configuration
GCP_PROJECT_ID=document-ai-staging
GOOGLE_APPLICATION_CREDENTIALS=/app/config/gcp-service-account.json

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/app/uploads

# Security
SESSION_SECRET=your-secure-session-secret-here
```

### Day 5: GCP Deployment

#### 1. Build and Push Container
```bash
# Build container image
gcloud builds submit --tag gcr.io/document-ai-staging/document-ai-app

# Or with docker:
docker build -t gcr.io/document-ai-staging/document-ai-app .
docker push gcr.io/document-ai-staging/document-ai-app
```

#### 2. Create Compute Engine Instance
```bash
# Create VM instance
gcloud compute instances create document-ai-staging \
  --zone=us-central1-a \
  --machine-type=f1-micro \
  --image-family=cos-stable \
  --image-project=cos-cloud \
  --boot-disk-size=20GB \
  --tags=http-server,https-server \
  --metadata=startup-script='#!/bin/bash
    docker run -d \
      --name document-ai-app \
      --restart unless-stopped \
      -p 8000:8000 \
      -e MONGODB_URI="'$MONGODB_URI'" \
      -e GOOGLE_API_KEY="'$GOOGLE_API_KEY'" \
      -e NODE_ENV=production \
      gcr.io/document-ai-staging/document-ai-app'
```

#### 3. Configure Load Balancer
```bash
# Create health check
gcloud compute health-checks create http document-ai-health-check \
  --port 8000 \
  --request-path /api/health

# Create backend service
gcloud compute backend-services create document-ai-backend \
  --protocol HTTP \
  --health-checks document-ai-health-check \
  --global

# Add instance group
gcloud compute instance-groups unmanaged create document-ai-group \
  --zone=us-central1-a

gcloud compute instance-groups unmanaged add-instances document-ai-group \
  --instances=document-ai-staging \
  --zone=us-central1-a

gcloud compute backend-services add-backend document-ai-backend \
  --instance-group=document-ai-group \
  --instance-group-zone=us-central1-a \
  --global

# Create URL map
gcloud compute url-maps create document-ai-map \
  --default-service document-ai-backend

# Create SSL certificate
gcloud compute ssl-certificates create document-ai-ssl \
  --domains staging.yourdomain.com

# Create HTTPS proxy
gcloud compute target-https-proxies create document-ai-proxy \
  --ssl-certificates document-ai-ssl \
  --url-map document-ai-map

# Create forwarding rule
gcloud compute forwarding-rules create document-ai-https-rule \
  --address document-ai-staging-ip \
  --global \
  --target-https-proxy document-ai-proxy \
  --ports 443
```

## 🔧 Configuration Files

### docker-compose.staging.yml
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
    volumes:
      - uploads:/app/uploads
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  uploads:
```

### cloudbuild.yaml (CI/CD Pipeline)
```yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/document-ai-app:$COMMIT_SHA', '.']
  
  # Push to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/document-ai-app:$COMMIT_SHA']
  
  # Deploy to Compute Engine
  - name: 'gcr.io/cloud-builders/gcloud'
    entrypoint: 'bash'
    args:
    - '-c'
    - |
      gcloud compute ssh document-ai-staging \
        --zone=us-central1-a \
        --command="docker pull gcr.io/$PROJECT_ID/document-ai-app:$COMMIT_SHA && \
                   docker stop document-ai-app || true && \
                   docker rm document-ai-app || true && \
                   docker run -d --name document-ai-app --restart unless-stopped \
                     -p 8000:8000 \
                     -e NODE_ENV=production \
                     -e MONGODB_URI='$$MONGODB_URI' \
                     -e GOOGLE_API_KEY='$$GOOGLE_API_KEY' \
                     gcr.io/$PROJECT_ID/document-ai-app:$COMMIT_SHA"

options:
  machineType: 'E2_HIGHCPU_8'
  
substitutions:
  _DEPLOY_REGION: us-central1
```

## 💰 Cost Estimation (Free Tier + Minimal Costs)

### Free Tier Resources
- **Compute Engine**: f1-micro (1 instance free)
- **Cloud Storage**: 5GB free
- **Cloud Build**: 120 build-minutes/day free
- **MongoDB Atlas**: M0 cluster (512MB) free

### Estimated Monthly Costs
- **Domain**: $12/year (~$1/month)
- **SSL Certificate**: Free (Let's Encrypt via GCP)
- **Additional Storage**: ~$2-5/month if needed
- **Total**: ~$3-6/month for staging

## 🎯 Week 1 Deliverables Checklist

- [ ] GCP project created and configured
- [ ] MongoDB Atlas free cluster setup
- [ ] Domain and DNS configuration
- [ ] SSL certificate provisioned
- [ ] Application dockerized for production
- [ ] Container pushed to GCP Container Registry
- [ ] Compute Engine instance deployed
- [ ] Load balancer and health checks configured
- [ ] HTTPS access working at staging.yourdomain.com
- [ ] Basic monitoring dashboard setup
- [ ] CI/CD pipeline configured (GitHub Actions or Cloud Build)

## 🧪 Testing Staging Deployment

### Health Check Commands
```bash
# Test application health
curl -f https://staging.yourdomain.com/api/health

# Test document upload
curl -X POST -F "document=@test.pdf" https://staging.yourdomain.com/api/process-document

# Test document listing
curl https://staging.yourdomain.com/api/documents

# Test chat functionality
curl -X POST -H "Content-Type: application/json" \
  -d '{"query":"What documents do I have?"}' \
  https://staging.yourdomain.com/api/chat/query
```

### Monitoring Setup
```bash
# Create uptime check
gcloud monitoring uptime-check-configs create \
  --display-name="Document AI Staging Health" \
  --http-check-path="/api/health" \
  --hostname="staging.yourdomain.com" \
  --port=443 \
  --use-ssl
```

## 🚀 Next Steps (Week 2)

1. **Performance Monitoring**: Set up Cloud Monitoring and Logging
2. **User Feedback**: Implement basic analytics and error tracking
3. **UI Polish**: Mobile responsiveness and loading states
4. **Security**: Basic authentication and rate limiting
5. **Documentation**: User guides and API documentation

---

*Last Updated: January 2025*  
*Phase: 1A - Basic Staging Infrastructure*  
*Target: Week 1 Completion*