#!/bin/bash

# Initialize databases deliberately.
# This script is admin-only and may mutate the target database.

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Database Initialization${NC}"
echo -e "${BLUE}========================================${NC}\n"

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not set${NC}"
    exit 1
fi

if [ "${ALLOW_SCHEMA_INIT:-}" != "true" ]; then
    echo -e "${RED}Refusing to run without ALLOW_SCHEMA_INIT=true${NC}"
    echo "This guard exists to prevent accidental execution against the wrong database."
    exit 1
fi

if [ -z "${REDIS_URL:-}" ]; then
    echo -e "${RED}Error: REDIS_URL not set${NC}"
    exit 1
fi

echo -e "${YELLOW}Target database:${NC} ${DATABASE_URL}"
echo -e "${YELLOW}Target redis:${NC} ${REDIS_URL}"

echo -e "${YELLOW}1. Initializing PostgreSQL...${NC}"

if [ -f "infrastructure/docker/postgres/init.sql" ]; then
    echo "Executing schema..."
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 < infrastructure/docker/postgres/init.sql
    echo -e "${GREEN}✓ PostgreSQL schema created${NC}"
else
    echo -e "${RED}Warning: init.sql not found${NC}"
fi

echo -e "\n${YELLOW}2. Testing Redis connection...${NC}"

node << 'EOF'
const redis = require('redis');

async function testRedis() {
    const url = process.env.REDIS_URL;
    const client = redis.createClient({ url });

    client.on('error', (err) => {
        console.error('Redis error:', err.message);
        process.exit(1);
    });

    try {
        await client.connect();
        console.log('✓ Connected to Redis');

        await client.set('health_check', 'ok');
        const value = await client.get('health_check');

        if (value === 'ok') {
            console.log('✓ Redis read/write working');
        }

        await client.del('health_check');
        await client.disconnect();
    } catch (error) {
        console.error('Redis error:', error.message);
        process.exit(1);
    }
}

testRedis();
EOF

echo -e "${GREEN}✓ Redis initialized${NC}"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}All databases initialized successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
