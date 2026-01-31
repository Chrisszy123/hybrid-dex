#!/bin/bash

echo "🔧 Fixing Database Schema..."
echo ""

# Find PostgreSQL container
CONTAINER=$(docker ps --format '{{.Names}}' | grep -i postgres | head -1)

if [ -z "$CONTAINER" ]; then
    echo "❌ PostgreSQL container not found!"
    echo "Run: docker ps -a | grep postgres"
    echo "Then manually run:"
    echo "  docker exec -it <CONTAINER_NAME> psql -U postgres -d hybriddex -c \"ALTER TABLE users ALTER COLUMN nonce TYPE TEXT;\""
    exit 1
fi

echo "Found PostgreSQL container: $CONTAINER"
echo ""

# Fix the nonce column
echo "Altering users.nonce column to TEXT..."
docker exec -it "$CONTAINER" psql -U postgres -d hybriddex -c "ALTER TABLE users ALTER COLUMN nonce TYPE TEXT;" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database schema fixed!"
    echo ""
    echo "Now restart your services:"
    echo "  1. API Gateway: cd services/api-gateway && npm run dev"
    echo "  2. Market Maker: cd scripts && npx tsx market-maker.ts"
    echo "  3. Web UI: cd apps/web-trader && npm run dev"
else
    echo ""
    echo "⚠️  Command failed. Try manually:"
    echo "  docker exec -it $CONTAINER psql -U postgres -d hybriddex"
    echo "  Then run: ALTER TABLE users ALTER COLUMN nonce TYPE TEXT;"
fi
