#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")"

PROTO_FILES=(common.proto analysis.proto github.proto)
BUILD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/mitig8it-protos.XXXXXX")"
JS_OUT="${BUILD_DIR}/js"
PYTHON_OUT="${BUILD_DIR}/python"

cleanup() {
  rm -rf "${BUILD_DIR}"
}
trap cleanup EXIT

echo "Generating gRPC stubs..."

mkdir -p "${JS_OUT}" "${PYTHON_OUT}"

echo "Generating JavaScript stubs..."
npx grpc_tools_node_protoc \
  --js_out=import_style=commonjs,binary:"${JS_OUT}" \
  --grpc_out=grpc_js:"${JS_OUT}" \
  --plugin=protoc-gen-grpc=./node_modules/.bin/grpc_tools_node_protoc_plugin \
  -I . \
  "${PROTO_FILES[@]}"

echo "Generating Python stubs..."
python -m grpc_tools.protoc \
  -I. \
  --python_out="${PYTHON_OUT}" \
  --grpc_python_out="${PYTHON_OUT}" \
  "${PROTO_FILES[@]}"

echo "Copying generated files to services..."

rm -rf ../services/api-service/src/grpc/generated
mkdir -p ../services/api-service/src/grpc/generated
cp \
  "${JS_OUT}/analysis_grpc_pb.js" \
  "${JS_OUT}/analysis_pb.js" \
  "${JS_OUT}/common_pb.js" \
  "${JS_OUT}/github_grpc_pb.js" \
  "${JS_OUT}/github_pb.js" \
  ../services/api-service/src/grpc/generated/

rm -rf ../services/github-service/src/grpc/generated
mkdir -p ../services/github-service/src/grpc/generated
cp \
  "${JS_OUT}/common_pb.js" \
  "${JS_OUT}/github_grpc_pb.js" \
  "${JS_OUT}/github_pb.js" \
  ../services/github-service/src/grpc/generated/

rm -rf ../services/analysis-service/src/grpc/generated
mkdir -p ../services/analysis-service/src/grpc/generated
cp \
  "${PYTHON_OUT}/analysis_pb2.py" \
  "${PYTHON_OUT}/analysis_pb2_grpc.py" \
  "${PYTHON_OUT}/common_pb2.py" \
  ../services/analysis-service/src/grpc/generated/

echo "Done."
echo "Generated:"
echo "  services/api-service/src/grpc/generated"
echo "  services/github-service/src/grpc/generated"
echo "  services/analysis-service/src/grpc/generated"
