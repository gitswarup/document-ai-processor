# GCP Deployment Guide - Serverless Cloud Run Architecture

## 🚀 Modern Serverless Infrastructure with Cloud Run

This guide covers deploying the document AI processor using Google Cloud Platform's serverless services, specifically Cloud Run for backend hosting and Cloud Storage for frontend deployment.

### GCP Services Selection

#### Core Serverless Infrastructure
- **Cloud Run**: Fully managed containerized application hosting with automatic scaling
- **Cloud Storage**: Static frontend hosting + file storage with global CDN
- **Cloud Build**: Automated CI/CD pipeline with Container Registry
- **Secret Manager**: Secure environment variable management
- **Cloud DNS**: Custom domain management (optional)
- **MongoDB Atlas**: Managed database service (free M0 tier available)
- **Cloud Monitoring**: Built-in logging and metrics

#### Cloud Run Serverless Architecture

```
┌──────────────────┐    ┌───────────────────┐    ┌────────────────────┐
│   Cloud DNS      │    │   Cloud Storage   │    │   Cloud Run        │
│   Custom Domain  │───►│   Frontend CDN    │    │   Backend API      │
│   (Optional)     │    │   React SPA       │    │   Auto 0→100       │
└──────────────────┘    └───────────────────┘    │   Pay-per-request  │
                                 │                └────────────────────┘
                                 │                          │
                                 │                          │
                        ┌────────▼─────────┐               │
                        │ Google APIs      │               │
                        │ • Document AI    │               │
                        │ • Cloud Vision   │               │
                        │ • Vertex AI      │               │
                        └──────────────────┘               │
                                                           │
┌──────────────────┐    ┌───────────────────┐    ┌────────▼─────────┐
│  Secret Manager  │    │  Cloud Storage    │    │  MongoDB Atlas   │
│  • API Keys      │◄───┤  File Uploads     │◄───┤  M0 Free Tier    │
│  • DB Credentials│    │  PDF/Images       │    │  512MB Storage   │
│  • Session Keys  │    │  Processed Docs   │    │  Auto-backups    │
└──────────────────┘    └───────────────────┘    └──────────────────┘
                                 │
                        ┌────────▼─────────┐
                        │ Cloud Monitoring │
                        │ • Request Logs   │
                        │ • Error Tracking │
                        │ • Performance    │
                        └──────────────────┘
```

#### Serverless Benefits
- **Zero Cold Start Management**: Cloud Run Gen2 minimizes cold starts
- **Automatic Scaling**: 0 to 100 instances based on demand
- **Pay-per-Request**: Only pay when processing requests
- **Built-in Security**: HTTPS, IAM, and VPC integration
- **No Infrastructure**: No servers, load balancers, or orchestration needed

## 📋 Week 1 Action Items

### Day 1: GCP Project Setup
```bash
# 1. Create GCP project
gcloud projects create document-ai-staging --name="Document AI Staging"

# 2. Set project as default
gcloud config set project document-ai-staging

# 3. Enable required APIs for serverless deployment
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable dns.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable monitoring.googleapis.com
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

### Day 3: Storage, Secrets, and DNS Setup
```bash
# 1. Create storage bucket for frontend with uniform access control
gsutil mb -p document-ai-staging gs://document-ai-staging-frontend
gsutil uniformbucketlevelaccess set on gs://document-ai-staging-frontend

# 2. Create storage bucket for file uploads
gsutil mb -p document-ai-staging gs://document-ai-staging-uploads
gsutil uniformbucketlevelaccess set on gs://document-ai-staging-uploads

# 3. Create secrets in Secret Manager for secure environment variables
echo -n "your_mongodb_connection_string" | gcloud secrets create mongodb-uri --data-file=-
echo -n "your_google_api_key" | gcloud secrets create google-api-key --data-file=-
echo -n "your_claude_api_key" | gcloud secrets create claude-api-key --data-file=-
echo -n "your_secure_session_secret" | gcloud secrets create session-secret --data-file=-

# 4. Create DNS zone (optional - Cloud Run provides HTTPS URLs)
gcloud dns managed-zones create document-ai-staging \
  --description="Document AI Staging DNS" \
  --dns-name=staging.yourdomain.com
```

### Day 4: Application Dockerization

#### Optimized Cloud Run Dockerfile (Backend)
```dockerfile
# Multi-stage build for optimized Cloud Run deployment
FROM node:20-alpine AS builder

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    giflib-dev \
    jpeg-dev \
    libc6-compat

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY server/package*.json ./
RUN npm ci --only=production --no-audit --no-fund

# Copy source code
COPY server/ ./

# Production stage - minimal image
FROM node:20-alpine AS production

# Install runtime dependencies only
RUN apk add --no-cache \
    cairo \
    pango \
    giflib \
    jpeg \
    libc6-compat \
    dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy application with correct ownership
COPY --from=builder --chown=nodejs:nodejs /app ./

# Switch to non-root user
USER nodejs

# Cloud Run uses PORT environment variable
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]
```

#### Cloud Run Environment Variables (Using Secret Manager)
```yaml
# Environment variables for Cloud Run deployment
# These reference secrets stored in Secret Manager for security

env:
  - name: PORT
    value: "8080"
  - name: NODE_ENV
    value: "production"
  - name: GCP_PROJECT_ID
    value: "document-ai-staging"
  - name: UPLOAD_BUCKET
    value: "document-ai-staging-uploads"
  - name: MAX_FILE_SIZE
    value: "10485760"
  - name: AI_PROVIDER
    value: "google"

# Secrets from Secret Manager (more secure than environment variables)
secrets:
  - name: MONGODB_URI
    valueFrom:
      secretKeyRef:
        name: mongodb-uri
        version: latest
  - name: GOOGLE_API_KEY
    valueFrom:
      secretKeyRef:
        name: google-api-key
        version: latest
  - name: CLAUDE_API_KEY
    valueFrom:
      secretKeyRef:
        name: claude-api-key
        version: latest
  - name: SESSION_SECRET
    valueFrom:
      secretKeyRef:
        name: session-secret
        version: latest
```

### Day 5: Serverless Deployment

#### 1. Deploy Frontend to Cloud Storage
```bash
# Build React frontend
cd client && npm run build

# Deploy to Cloud Storage
gsutil -m rsync -r -d build/ gs://document-ai-staging-frontend/

# Make bucket publicly readable
gsutil iam ch allUsers:objectViewer gs://document-ai-staging-frontend

# Enable website configuration
gsutil web set -m index.html -e index.html gs://document-ai-staging-frontend

# Your frontend is now available at:
# https://storage.googleapis.com/document-ai-staging-frontend/index.html
```

#### 2. Deploy Backend to Cloud Run with Secret Manager
```bash
# Grant Cloud Run access to Secret Manager secrets
gcloud projects add-iam-policy-binding document-ai-staging \
  --member="serviceAccount:$(gcloud projects describe document-ai-staging --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Build and deploy backend to Cloud Run with optimized settings
gcloud run deploy document-ai-backend \
  --source=./server \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --port=8080 \
  --memory=1Gi \
  --cpu=2 \
  --min-instances=0 \
  --max-instances=100 \
  --concurrency=80 \
  --timeout=300 \
  --execution-environment=gen2 \
  --cpu-throttling \
  --set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=document-ai-staging,UPLOAD_BUCKET=document-ai-staging-uploads,MAX_FILE_SIZE=10485760,AI_PROVIDER=google" \
  --set-secrets="MONGODB_URI=mongodb-uri:latest,GOOGLE_API_KEY=google-api-key:latest,CLAUDE_API_KEY=claude-api-key:latest,SESSION_SECRET=session-secret:latest"

# Get the service URL
BACKEND_URL=$(gcloud run services describe document-ai-backend \
  --platform=managed \
  --region=us-central1 \
  --format='value(status.url)')

echo "Backend deployed at: $BACKEND_URL"
```

#### 3. Configure Custom Domain (Optional)
```bash
# Map custom domain to Cloud Run
gcloud run domain-mappings create \
  --service=document-ai-backend \
  --domain=api.staging.yourdomain.com \
  --region=us-central1

# Map custom domain to frontend via Cloud CDN
# (This requires more complex setup - see advanced section)
```

## 🔧 Configuration Files

### app.yaml (Cloud Run Configuration)
```yaml
# Cloud Run service configuration
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: document-ai-backend
  annotations:
    run.googleapis.com/ingress: all
    run.googleapis.com/execution-environment: gen2
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "0"
        autoscaling.knative.dev/maxScale: "10"
        run.googleapis.com/memory: "512Mi"
        run.googleapis.com/cpu: "1"
    spec:
      containerConcurrency: 100
      timeoutSeconds: 300
      containers:
      - image: gcr.io/document-ai-staging/document-ai-backend
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: production
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: mongodb-credentials
              key: uri
        resources:
          limits:
            memory: 512Mi
            cpu: "1"
```

### cloudbuild.yaml (CI/CD Pipeline)
```yaml
steps:
  # Build React frontend
  - name: 'node:18-alpine'
    entrypoint: 'sh'
    args:
    - '-c'
    - |
      cd client
      npm ci
      npm run build
  
  # Deploy frontend to Cloud Storage
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'bash'
    args:
    - '-c'
    - |
      gsutil -m rsync -r -d client/build/ gs://document-ai-staging-frontend/
  
  # Build backend container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/document-ai-backend:$COMMIT_SHA', './server']
  
  # Push to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/document-ai-backend:$COMMIT_SHA']
  
  # Deploy backend to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
    - 'run'
    - 'deploy'
    - 'document-ai-backend'
    - '--image=gcr.io/$PROJECT_ID/document-ai-backend:$COMMIT_SHA'
    - '--region=us-central1'
    - '--platform=managed'
    - '--allow-unauthenticated'
    - '--memory=512Mi'
    - '--cpu=1'
    - '--min-instances=0'
    - '--max-instances=10'

options:
  machineType: 'E2_HIGHCPU_8'
  
substitutions:
  _DEPLOY_REGION: us-central1
```

## 💰 Updated Cloud Run Cost Analysis (2025)

### Free Tier Resources (Always Free)
- **Cloud Run**: 2 million requests/month + 360,000 GB-seconds/month + 180,000 vCPU-seconds/month
- **Cloud Storage**: 5GB storage + 1GB network egress/month  
- **Cloud Build**: 120 build-minutes/day (3,600 minutes/month)
- **Secret Manager**: 6 active secret versions + 10,000 access operations/month
- **Cloud Monitoring**: First 50GB of logs per month
- **MongoDB Atlas**: M0 cluster (512MB RAM, 5GB storage) free forever

### Detailed Cost Breakdown

#### Staging Environment (Low Traffic: ~1,000 requests/month)
- **Cloud Run**: $0 (well within 2M request free tier)
- **Cloud Storage**: $0 (< 5GB storage + < 1GB egress)
- **Cloud Build**: $0 (< 120 minutes/day)
- **Secret Manager**: $0 (< 6 secrets)
- **MongoDB Atlas**: $0 (M0 free tier)
- **Domain** (optional): $12/year (~$1/month)
- **Total Staging**: ~$0-1/month

#### Production Environment (Medium Traffic: ~50,000 requests/month)
- **Cloud Run**: $0 (still within free tier)
- **Cloud Storage**: ~$2-5/month (20GB storage + 10GB egress)
- **Cloud Build**: $0 (assuming < 120 min/day)
- **Secret Manager**: $0.06/month (10 secrets)
- **MongoDB Atlas**: $9/month (M10 cluster - 2GB RAM, 10GB storage)
- **Domain + SSL**: $1/month
- **Total Production**: ~$12-17/month

#### High-Scale Production (100K+ requests/month)
- **Cloud Run**: $8-15/month (beyond free tier)
- **Cloud Storage**: $10-20/month (100GB+ storage/egress)
- **Cloud Build**: $2-5/month (advanced CI/CD)
- **Secret Manager**: $0.30/month (20+ secrets)
- **MongoDB Atlas**: $57/month (M30 cluster - 8GB RAM, 40GB storage)
- **Load Balancer + CDN**: $18/month
- **Total High-Scale**: ~$95-115/month

### Cost Optimization Tips
1. **Use Cloud Run Gen2**: Better resource efficiency
2. **Implement request caching**: Reduce duplicate processing
3. **Optimize container images**: Faster cold starts, lower memory usage
4. **Monitor and set alerts**: Avoid unexpected charges
5. **Use regional resources**: Keep data close to reduce egress costs

## 🎯 Week 1 Deliverables Checklist

- [ ] GCP project created and configured
- [ ] MongoDB Atlas free cluster setup
- [ ] Cloud Storage buckets created
- [ ] Frontend deployed to Cloud Storage
- [ ] Backend containerized for Cloud Run
- [ ] Cloud Run service deployed
- [ ] Environment variables configured
- [ ] HTTPS endpoints working (auto-provided by Cloud Run)
- [ ] File uploads working with Cloud Storage
- [ ] Basic monitoring dashboard setup
- [ ] CI/CD pipeline configured (Cloud Build)

## 🧪 Testing Staging Deployment

### Health Check Commands
```bash
# Get Cloud Run service URL
BACKEND_URL=$(gcloud run services describe document-ai-backend \
  --platform=managed --region=us-central1 --format='value(status.url)')

# Test application health
curl -f $BACKEND_URL/api/health

# Test document upload
curl -X POST -F "document=@test.pdf" $BACKEND_URL/api/process-document

# Test document listing
curl $BACKEND_URL/api/documents

# Test chat functionality
curl -X POST -H "Content-Type: application/json" \
  -d '{"query":"What documents do I have?"}' \
  $BACKEND_URL/api/chat/query
```

### Monitoring Setup
```bash
# Cloud Run automatically provides monitoring
# View logs:
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=document-ai-backend" --limit 50

# Create uptime check (optional)
gcloud monitoring uptime-check-configs create \
  --display-name="Document AI Backend Health" \
  --http-check-path="/api/health" \
  --hostname="$(echo $BACKEND_URL | sed 's|https://||')" \
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