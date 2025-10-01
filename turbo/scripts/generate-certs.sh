#!/bin/bash

# Generate SSL certificates for local development using mkcert
# This script generates separate certificate files for each domain required by Caddy

set -e

# Certificate directory (relative to project root)
CERT_DIR="$(cd "$(dirname "$0")/../.." && pwd)/.certs"

echo "🔐 Generating SSL certificates for local development..."
echo "Certificate directory: $CERT_DIR"
echo ""

# Create certificate directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
    echo "❌ Error: mkcert is not installed"
    echo ""
    echo "Please install mkcert:"
    echo "  - macOS: brew install mkcert"
    echo "  - Linux: Install from https://github.com/FiloSottile/mkcert"
    echo "  - Dev Container: Already included in the image"
    exit 1
fi

# Check if mkcert root CA is installed
if ! mkcert -CAROOT &> /dev/null; then
    echo "⚠️  mkcert root CA not found. Installing..."
    mkcert -install
    echo ""
fi

# Generate certificates for each domain
echo "Generating certificates..."
echo ""

# www.uspark.dev
echo "📝 Generating certificate for www.uspark.dev"
mkcert -cert-file "$CERT_DIR/www.uspark.dev.pem" \
       -key-file "$CERT_DIR/www.uspark.dev-key.pem" \
       www.uspark.dev localhost 127.0.0.1 ::1

# app.uspark.dev
echo "📝 Generating certificate for app.uspark.dev"
mkcert -cert-file "$CERT_DIR/app.uspark.dev.pem" \
       -key-file "$CERT_DIR/app.uspark.dev-key.pem" \
       app.uspark.dev localhost 127.0.0.1 ::1

# docs.uspark.dev
echo "📝 Generating certificate for docs.uspark.dev"
mkcert -cert-file "$CERT_DIR/docs.uspark.dev.pem" \
       -key-file "$CERT_DIR/docs.uspark.dev-key.pem" \
       docs.uspark.dev localhost 127.0.0.1 ::1

# uspark.dev
echo "📝 Generating certificate for uspark.dev"
mkcert -cert-file "$CERT_DIR/uspark.dev.pem" \
       -key-file "$CERT_DIR/uspark.dev-key.pem" \
       uspark.dev localhost 127.0.0.1 ::1

echo ""
echo "✅ All SSL certificates generated successfully!"
echo ""
echo "Generated certificates:"
ls -lh "$CERT_DIR"/*.pem | awk '{print "  - " $9}'
echo ""
echo "📝 Certificates will expire in ~2 years"
echo "🚀 You can now start the dev server with: pnpm dev"
