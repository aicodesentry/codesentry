#!/bin/bash

# Continuous monitoring script for service health checks
# Checks health every 30 seconds and alerts on failures

set -e

# Service URLs
API_SERVICE="${API_SERVICE_URL:-http://localhost:3000}"
GITHUB_SERVICE="${GITHUB_SERVICE_URL:-http://localhost:3002}"
ANALYSIS_SERVICE="${ANALYSIS_SERVICE_URL:-http://localhost:8001}"

# Alert webhook (optional - for Slack/Discord notifications)
WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counter for consecutive failures
declare -A failures

# Function to send alert
send_alert() {
    local service=$1
    local message=$2

    echo -e "${RED}[ALERT] ${service}: ${message}${NC}"

    if [ -n "$WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 Alert: ${service} - ${message}\"}" \
            "$WEBHOOK_URL" 2>/dev/null || true
    fi
}

# Function to check service with retry
check_service_health() {
    local name=$1
    local url=$2
    local max_retries=3
    local retry_delay=5

    for ((i=1; i<=max_retries; i++)); do
        response=$(curl -s -o /dev/null -w "%{http_code}" "${url}/health" --max-time 10 2>/dev/null || echo "000")

        if [ "$response" == "200" ]; then
            echo -e "${GREEN}✓${NC} ${name} is healthy"

            # Reset failure counter
            failures[$name]=0
            return 0
        fi

        if [ $i -lt $max_retries ]; then
            echo -e "${YELLOW}⚠${NC} ${name} check failed (attempt $i/$max_retries), retrying in ${retry_delay}s..."
            sleep $retry_delay
        fi
    done

    # Increment failure counter
    failures[$name]=$((${failures[$name]:-0} + 1))

    echo -e "${RED}✗${NC} ${name} is unhealthy (${failures[$name]} consecutive failures)"

    # Send alert after 3 consecutive failures
    if [ ${failures[$name]} -ge 3 ]; then
        send_alert "$name" "Service down for ${failures[$name]} checks ($(( ${failures[$name]} * 30 / 60 )) minutes)"
    fi

    return 1
}

# Initialize failure counters
failures[api]=0
failures[github]=0
failures[analysis]=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Service Monitor Started${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Monitoring:"
echo -e "  - API Service: ${API_SERVICE}"
echo -e "  - GitHub Service: ${GITHUB_SERVICE}"
echo -e "  - Analysis Service: ${ANALYSIS_SERVICE}"
echo -e ""
echo -e "Check interval: 30 seconds"
echo -e "Press Ctrl+C to stop"
echo -e "${BLUE}========================================${NC}\n"

# Continuous monitoring loop
while true; do
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "\n${BLUE}[${timestamp}] Checking services...${NC}"

    check_service_health "API Service     " "$API_SERVICE"
    check_service_health "GitHub Service  " "$GITHUB_SERVICE"
    check_service_health "Analysis Service" "$ANALYSIS_SERVICE"

    # Sleep for 30 seconds
    sleep 30
done
