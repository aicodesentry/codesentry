#!/bin/bash

# Generate gRPC stubs for all services
set -e

echo "🔨 Generating gRPC Protocol Buffers..."

# Create output directories
mkdir -p generated/js
mkdir -p generated/python

# Generate JavaScript stubs (for Node.js services)
echo "📦 Generating JavaScript stubs..."
npx grpc_tools_node_protoc \
  --js_out=import_style=commonjs,binary:./generated/js \
  --grpc_out=grpc_js:./generated/js \
  --plugin=protoc-gen-grpc=./node_modules/.bin/grpc_tools_node_protoc_plugin \
  -I . \
  analysis.proto github.proto

# Generate Python stubs (for Python analysis service)
echo "🐍 Generating Python stubs..."
python -m grpc_tools.protoc \
  -I. \
  --python_out=./generated/python \
  --grpc_python_out=./generated/python \
  analysis.proto github.proto

# Copy generated files to service directories
echo "📋 Copying generated files to services..."

# Copy to api-service
mkdir -p ../services/api-service/src/grpc
cp generated/js/* ../services/api-service/src/grpc/

# Copy to github-service
mkdir -p ../services/github-service/src/grpc
cp generated/js/* ../services/github-service/src/grpc/

# Copy to analysis-service
mkdir -p ../services/analysis-service/src/grpc_generated
cp generated/python/* ../services/analysis-service/src/grpc_generated/

echo "✅ gRPC stubs generated successfully!"
echo ""
echo "Generated files:"
echo "  - JavaScript: proto/generated/js/"
echo "  - Python: proto/generated/python/"
echo ""
echo "Files copied to services:"
echo "  - api-service/src/grpc/"
echo "  - github-service/src/grpc/"
echo "  - analysis-service/src/grpc_generated/"
