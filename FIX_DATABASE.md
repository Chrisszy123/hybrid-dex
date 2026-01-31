# Database Schema Fix

## Problem
The `users.nonce` column is VARCHAR(64), but nonces can be longer (66+ characters).

## Solution

### Find your PostgreSQL container:
```bash
docker ps -a | grep postgres
```

Look for the container name (e.g., `postgres`, `hybrid-dex-postgres-1`, etc.)

### Fix the schema:
```bash
# Replace <CONTAINER_NAME> with your actual container name
docker exec -it <CONTAINER_NAME> psql -U postgres -d hybriddex -c "ALTER TABLE users ALTER COLUMN nonce TYPE TEXT;"
```

### Or drop and recreate (if no important data):
```bash
docker exec -it <CONTAINER_NAME> psql -U postgres -d hybriddex <<EOF
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS balances CASCADE;
DROP TABLE IF EXISTS settlements CASCADE;
EOF
```

Then restart the API gateway - it will recreate tables with the correct schema.

## Verify Fix
```bash
docker exec -it <CONTAINER_NAME> psql -U postgres -d hybriddex -c "\d users"
```

Should show:
```
nonce | text | not null
```
