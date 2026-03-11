#!/bin/sh
set -e

echo "Fixing gRPC imports..."
python /app/fix_grpc_imports.py

# Start the main application
exec "$@"
