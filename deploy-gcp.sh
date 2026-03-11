#!/bin/bash
# =============================================================================
# CodeSentry - Google Cloud Run Free Tier Deployment Script
# =============================================================================
# Usage: ./deploy-gcp.sh
# Reads credentials from .deploy-credentials in the same directory
# =============================================================================

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC}   $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERR]${NC}  $1"; exit 1; }
header()  { echo -e "\n${BLUE}══════════════════════════════════════${NC}"; echo -e "${BLUE}  $1${NC}"; echo -e "${BLUE}══════════════════════════════════════${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CREDS_FILE="${SCRIPT_DIR}/.deploy-credentials"

# ── Load credentials ──────────────────────────────────────────────────────────
header "Loading Credentials"

[ ! -f "$CREDS_FILE" ] && error ".deploy-credentials not found. Run: cp .deploy-credentials.example .deploy-credentials"

# Source the credentials file (ignores comment lines)
set -a
while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  key=$(echo "$key" | tr -d '[:space:]')
  value=$(echo "$value" | sed 's/^[[:space:]]*//')
  export "$key=$value"
done < "$CREDS_FILE"
set +a

# Validate required fields
REQUIRED=(DATABASE_URL MONGODB_URL REDIS_URL GEMINI_API_KEY FRONTEND_URL
          GITHUB_CLIENT_ID GITHUB_CLIENT_SECRET JWT_SECRET WEBHOOK_SECRET)

MISSING=()
for var in "${REQUIRED[@]}"; do
  val="${!var}"
  if [ -z "$val" ]; then
    MISSING+=("$var")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo -e "${RED}Missing values in .deploy-credentials:${NC}"
  for m in "${MISSING[@]}"; do echo "  - $m"; done
  error "Fill in all required fields and re-run."
fi

success "All credentials loaded"

# ── GCP config ────────────────────────────────────────────────────────────────
GCP_PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
[ -z "$GCP_PROJECT_ID" ] && error "No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID"

REGION="${REGION:-us-central1}"
REPO_NAME="codesentry"
IMAGE_PREFIX="${REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${REPO_NAME}"

info "Project  : $GCP_PROJECT_ID"
info "Region   : $REGION"
info "Registry : $IMAGE_PREFIX"

# ── Build & Push Images ───────────────────────────────────────────────────────
header "Building & Pushing Docker Images"

# analysis-service
info "Building analysis-service..."
docker build -t "${IMAGE_PREFIX}/analysis-service:latest" \
  -f "${SCRIPT_DIR}/services/analysis-service/Dockerfile.prod" \
  "${SCRIPT_DIR}/services/analysis-service"
docker push "${IMAGE_PREFIX}/analysis-service:latest"
success "analysis-service pushed"

# github-service
info "Building github-service..."
docker build -t "${IMAGE_PREFIX}/github-service:latest" \
  -f "${SCRIPT_DIR}/services/github-service/Dockerfile.prod" \
  "${SCRIPT_DIR}/services/github-service"
docker push "${IMAGE_PREFIX}/github-service:latest"
success "github-service pushed"

# api-service
info "Building api-service..."
docker build -t "${IMAGE_PREFIX}/api-service:latest" \
  -f "${SCRIPT_DIR}/services/api-service/Dockerfile.prod" \
  "${SCRIPT_DIR}/services/api-service"
docker push "${IMAGE_PREFIX}/api-service:latest"
success "api-service pushed"

# ── Deploy to Cloud Run ───────────────────────────────────────────────────────
header "Deploying to Cloud Run"

FLAGS="--region=${REGION} --platform=managed --allow-unauthenticated --quiet"

# 1. analysis-service
info "Deploying analysis-service..."
gcloud run deploy analysis-service \
  --image="${IMAGE_PREFIX}/analysis-service:latest" \
  $FLAGS \
  --memory=512Mi \
  --min-instances=0 \
  --max-instances=2 \
  --set-env-vars="\
PORT=8080,\
MONGODB_URL=${MONGODB_URL},\
MONGODB_DB_NAME=code_review_analysis,\
REDIS_URL=${REDIS_URL},\
GEMINI_API_KEY=${GEMINI_API_KEY},\
GOOGLE_CLOUD_PROJECT=${GCP_PROJECT_ID},\
GOOGLE_CLOUD_LOCATION=${REGION},\
MAX_FILE_SIZE_MB=10,\
ANALYSIS_TIMEOUT_SECONDS=60,\
ENABLE_STYLE_ANALYSIS=true,\
ANALYSIS_STORE_IN_MONGO=true,\
ANALYSIS_CACHE_TTL_DAYS=30"

ANALYSIS_URL=$(gcloud run services describe analysis-service \
  --region="${REGION}" --format='value(status.url)')
success "analysis-service: ${ANALYSIS_URL}"

# 2. github-service
info "Deploying github-service..."
EMAIL_VARS=""
if [ -n "$EMAIL_USER" ]; then
  EMAIL_VARS=",EMAIL_SERVICE=gmail,EMAIL_USER=${EMAIL_USER},EMAIL_PASSWORD=${EMAIL_PASSWORD},EMAIL_FROM_NAME=CodeSentry,DEFAULT_REVIEWER_EMAIL=${DEFAULT_REVIEWER_EMAIL:-$EMAIL_USER}"
fi

gcloud run deploy github-service \
  --image="${IMAGE_PREFIX}/github-service:latest" \
  $FLAGS \
  --memory=256Mi \
  --min-instances=0 \
  --max-instances=2 \
  --set-env-vars="\
PORT=8080,\
NODE_ENV=production,\
DATABASE_URL=${DATABASE_URL},\
REDIS_URL=${REDIS_URL},\
WEBHOOK_SECRET=${WEBHOOK_SECRET},\
ANALYSIS_SERVICE_URL=${ANALYSIS_URL},\
FRONTEND_URL=${FRONTEND_URL}${EMAIL_VARS}"

GITHUB_SVC_URL=$(gcloud run services describe github-service \
  --region="${REGION}" --format='value(status.url)')

# Update WEBHOOK_URL to point to itself
gcloud run services update github-service --region="${REGION}" \
  --update-env-vars="WEBHOOK_URL=${GITHUB_SVC_URL}" --quiet
success "github-service: ${GITHUB_SVC_URL}"

# 3. api-service
info "Deploying api-service..."
gcloud run deploy api-service \
  --image="${IMAGE_PREFIX}/api-service:latest" \
  $FLAGS \
  --memory=256Mi \
  --min-instances=0 \
  --max-instances=2 \
  --set-env-vars="\
PORT=8080,\
NODE_ENV=production,\
DATABASE_URL=${DATABASE_URL},\
REDIS_URL=${REDIS_URL},\
GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID},\
GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET},\
JWT_SECRET=${JWT_SECRET},\
ENCRYPTION_KEY=${ENCRYPTION_KEY},\
GITHUB_SERVICE_URL=${GITHUB_SVC_URL},\
FRONTEND_URL=${FRONTEND_URL}"

API_URL=$(gcloud run services describe api-service \
  --region="${REGION}" --format='value(status.url)')

# Update callback URL now that we know the API URL
gcloud run services update api-service --region="${REGION}" \
  --update-env-vars="GITHUB_CALLBACK_URL=${API_URL}/auth/github/callback" --quiet
success "api-service: ${API_URL}"

# ── Summary ───────────────────────────────────────────────────────────────────
header "Deployment Complete!"

echo ""
echo -e "${GREEN}Your service URLs:${NC}"
echo -e "  api-service      → ${CYAN}${API_URL}${NC}"
echo -e "  github-service   → ${CYAN}${GITHUB_SVC_URL}${NC}"
echo -e "  analysis-service → ${CYAN}${ANALYSIS_URL}${NC}"
echo ""
echo -e "${YELLOW}Required post-deploy steps:${NC}"
echo ""
echo "1. Update GitHub OAuth callback URL to:"
echo "   ${API_URL}/auth/github/callback"
echo "   → https://github.com/settings/developers"
echo ""
echo "2. Deploy frontend to Vercel:"
echo "   cd frontend && vercel --prod"
echo "   Set env var: VITE_API_URL=${API_URL}"
echo ""
echo "3. Health checks:"
echo "   curl ${API_URL}/health"
echo "   curl ${GITHUB_SVC_URL}/health"
echo "   curl ${ANALYSIS_URL}/health"
echo ""
echo -e "${GREEN}Done!${NC}"
