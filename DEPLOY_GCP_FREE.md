# CodeSentry — Free GCP Deployment Guide

Deploy everything for **$0/month** using Google Cloud Run's always-free tier.

## Architecture (All Free)

| Component | Service | Free Tier |
|-----------|---------|-----------|
| api-service | **Cloud Run** | 2M req/month |
| github-service | **Cloud Run** | 2M req/month |
| analysis-service | **Cloud Run** | 2M req/month |
| Frontend | **Vercel** | Hobby (already configured) |
| PostgreSQL | **Neon.tech** | 512 MB, 1 project |
| MongoDB | **MongoDB Atlas** | M0 — 512 MB |
| Redis | **Upstash** | 10K commands/day |
| AI (Gemini) | **Google AI Studio** | 1,500 req/day free |

---

## Step 1 — Set Up Free Databases

### 1a. PostgreSQL — Neon.tech

1. Sign up at https://neon.tech (GitHub login works)
2. Create a new project → name it `codesentry`
3. Copy the **Connection string** (looks like):
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. In your Neon dashboard, go to **SQL Editor** and run the init SQL:
   ```sql
   -- Paste the contents of: infrastructure/docker/postgres/init.sql
   ```

### 1b. MongoDB — Atlas

1. Sign up at https://cloud.mongodb.com
2. Create a **Free (M0)** cluster → pick any cloud/region
3. **Database Access**: Create a user (e.g., `codesentry`) with a strong password
4. **Network Access**: Add `0.0.0.0/0` (allow all IPs — Cloud Run uses dynamic IPs)
5. Click **Connect → Drivers** and copy the connection string:
   ```
   mongodb+srv://codesentry:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### 1c. Redis — Upstash

1. Sign up at https://upstash.com
2. Create a **Redis database** (free tier, pick the closest region)
3. Copy the **Redis URL** (TLS):
   ```
   rediss://default:<password>@xxx.upstash.io:6379
   ```

---

## Step 2 — Get a Gemini API Key (Free)

1. Go to https://aistudio.google.com/app/apikey
2. Click **Create API key** → select your GCP project
3. Copy the key — this replaces the old Vertex AI credentials

**Free quota**: 1,500 requests/day with `gemini-2.0-flash-exp`

---

## Step 3 — Set Up GCP Project

### 3a. Install gcloud CLI (if not already installed)

```bash
# macOS
brew install google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install
```

### 3b. Log In and Select Project

```bash
gcloud auth login
gcloud auth application-default login

# Create a new project (or use existing)
gcloud projects create codesentry-prod --name="CodeSentry"
gcloud config set project codesentry-prod

# Link a billing account (required to enable APIs, but Cloud Run free tier = $0)
# Go to: https://console.cloud.google.com/billing
```

> **Note**: You must link a billing account to enable APIs, but Cloud Run free tier
> covers small projects without charges.

---

## Step 4 — Set Up GitHub OAuth App

1. Go to https://github.com/settings/developers → **New OAuth App**
2. Fill in:
   - **Homepage URL**: your Vercel URL (e.g., `https://yourapp.vercel.app`)
   - **Authorization callback URL**: `https://PLACEHOLDER/auth/github/callback`
     *(you'll update this after deployment)*
3. Save **Client ID** and **Client Secret**

Generate secrets:
```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Webhook Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 5 — Run the Deploy Script

Make sure Docker Desktop is running, then:

```bash
chmod +x deploy-gcp.sh
./deploy-gcp.sh
```

The script will:
1. Enable Cloud Run, Artifact Registry, Cloud Build APIs
2. Create a private Docker registry
3. Build and push production images
4. Deploy all 3 services to Cloud Run
5. Wire service URLs together automatically
6. Print all your service URLs

You'll be prompted for all the values collected in Steps 1–4.

---

## Step 6 — Deploy Frontend to Vercel

```bash
# Install Vercel CLI if needed
npm i -g vercel

cd frontend
vercel --prod
```

During setup:
- **Framework**: Vite
- **Build command**: `npm run build`
- **Output directory**: `dist`

Add environment variable in Vercel dashboard (or CLI):
```
VITE_API_URL = https://<your-api-service>.run.app
```

Then redeploy:
```bash
vercel --prod
```

---

## Step 7 — Post-Deployment Configuration

### 7a. Update GitHub OAuth Callback URL

1. Go to https://github.com/settings/developers
2. Edit your OAuth App
3. Set **Authorization callback URL** to:
   ```
   https://<api-service-url>.run.app/auth/github/callback
   ```

### 7b. Update GitHub App Webhooks

If you use the GitHub App (for webhooks), update the webhook URL to:
```
https://<github-service-url>.run.app/webhooks/github
```

### 7c. Update Vercel FRONTEND_URL

In Vercel settings, make sure `VITE_API_URL` points to your api-service Cloud Run URL.

---

## Step 8 — Verify Deployment

```bash
# Get your service URLs
gcloud run services list --region=us-central1

# Health checks
curl https://<api-service>.run.app/health
curl https://<github-service>.run.app/health
curl https://<analysis-service>.run.app/health
```

Expected responses:
```json
{ "status": "ok", "service": "api-service" }
{ "status": "ok", "service": "github-service" }
{ "status": "ok", "service": "analysis-service", "database": "connected" }
```

---

## Updating Services Later

After code changes, just rebuild and redeploy:

```bash
REGION=us-central1
PROJECT=$(gcloud config get-value project)
PREFIX="${REGION}-docker.pkg.dev/${PROJECT}/codesentry"

# Rebuild and push
docker build -t ${PREFIX}/api-service:latest \
  -f services/api-service/Dockerfile.prod \
  services/api-service
docker push ${PREFIX}/api-service:latest

# Redeploy (zero-downtime)
gcloud run deploy api-service \
  --image=${PREFIX}/api-service:latest \
  --region=${REGION} \
  --quiet
```

---

## Monitoring (Free)

View logs in real time:
```bash
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=api-service"
```

View in console:
- https://console.cloud.google.com/run

---

## Free Tier Limits Summary

| Service | Limit | Resets |
|---------|-------|--------|
| Cloud Run requests | 2M/month | Monthly |
| Cloud Run CPU | 180K vCPU-sec/month | Monthly |
| Cloud Run memory | 360K GB-sec/month | Monthly |
| Neon DB | 512 MB storage | Never |
| MongoDB Atlas M0 | 512 MB storage | Never |
| Upstash Redis | 10K commands/day | Daily |
| Gemini API | 1,500 req/day | Daily |
| Artifact Registry | 0.5 GB storage | Never |

For a small project / demo, these limits are more than sufficient.

---

## Troubleshooting

**"Billing account required" when enabling APIs**
→ You must link a billing account to your GCP project (but won't be charged within free tier). Go to https://console.cloud.google.com/billing

**analysis-service health returns `"database": "disconnected"`**
→ Check your MongoDB Atlas Network Access allows `0.0.0.0/0`. Cloud Run IPs are dynamic.

**GitHub OAuth redirects to wrong URL**
→ Make sure the callback URL in your GitHub OAuth App exactly matches `https://<api-url>/auth/github/callback`

**Redis connection errors (Upstash)**
→ Use the `rediss://` (TLS) URL, not `redis://`. Upstash free tier requires TLS.

**Cold start delays (first request)**
→ Cloud Run scales to zero when idle. First request after idle ~1-2 sec startup. Normal behavior — min-instances=0 keeps it free.
