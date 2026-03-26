#!/bin/bash

# Initialize all databases for production
# Sets up PostgreSQL, MongoDB, and Redis

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Database Initialization${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check environment variables
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not set${NC}"
    echo "Please set DATABASE_URL to your Neon PostgreSQL connection string"
    exit 1
fi

if [ -z "$MONGODB_URL" ]; then
    echo -e "${RED}Error: MONGODB_URL not set${NC}"
    echo "Please set MONGODB_URL to your MongoDB Atlas connection string"
    exit 1
fi

echo -e "${YELLOW}1. Initializing PostgreSQL...${NC}"

# Run PostgreSQL initialization
if [ -f "infrastructure/docker/postgres/init.sql" ]; then
    echo "Executing schema..."
    psql "$DATABASE_URL" < infrastructure/docker/postgres/init.sql
    echo -e "${GREEN}✓ PostgreSQL schema created${NC}"
else
    echo -e "${RED}Warning: init.sql not found${NC}"
fi

echo -e "\n${YELLOW}2. Testing MongoDB connection...${NC}"

# Test MongoDB connection using Node.js
node << 'EOF'
const { MongoClient } = require('mongodb');

async function testConnection() {
    const url = process.env.MONGODB_URL;
    const client = new MongoClient(url);

    try {
        await client.connect();
        console.log('✓ Connected to MongoDB');

        const db = client.db(process.env.MONGODB_DB_NAME || 'analysis_results');

        // Create collections
        await db.createCollection('analyses');
        await db.createCollection('metrics');
        console.log('✓ Collections created');

        // Create indexes
        await db.collection('analyses').createIndex({ pull_request_id: 1 });
        await db.collection('analyses').createIndex({ created_at: -1 });
        await db.collection('analyses').createIndex({ repository_id: 1, created_at: -1 });
        console.log('✓ Indexes created');

    } catch (error) {
        console.error('✗ MongoDB error:', error.message);
        process.exit(1);
    } finally {
        await client.close();
    }
}

testConnection();
EOF

echo -e "${GREEN}✓ MongoDB initialized${NC}"

echo -e "\n${YELLOW}3. Testing Redis connection...${NC}"

# Test Redis connection
node << 'EOF'
const redis = require('redis');

async function testRedis() {
    const url = process.env.REDIS_URL;
    const client = redis.createClient({ url });

    client.on('error', (err) => {
        console.error('✗ Redis error:', err.message);
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
        console.error('✗ Redis error:', error.message);
        process.exit(1);
    }
}

testRedis();
EOF

echo -e "${GREEN}✓ Redis initialized${NC}"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}All databases initialized successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
