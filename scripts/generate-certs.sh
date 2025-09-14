#!/bin/bash

# Script to generate certificates on the host machine using mkcert
# Run this script on your host machine, NOT inside the dev container

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 Certificate Generation for USpark Development${NC}"
echo ""

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
    echo -e "${RED}❌ mkcert is not installed${NC}"
    echo ""
    echo "Please install mkcert first:"
    echo "  macOS:    brew install mkcert"
    echo "  Linux:    brew install mkcert"
    echo "  Windows:  choco install mkcert"
    echo ""
    echo "Or visit: https://github.com/FiloSottile/mkcert#installation"
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
CERTS_DIR="$PROJECT_ROOT/.certs"

echo "📁 Project root: $PROJECT_ROOT"
echo "📁 Certificates directory: $CERTS_DIR"
echo ""

# Create .certs directory if it doesn't exist
mkdir -p "$CERTS_DIR"

# Install the local CA in the system trust store (if not already done)
echo -e "${YELLOW}Installing local CA in system trust store...${NC}"
mkcert -install

echo ""
echo -e "${GREEN}Generating certificates for USpark domains...${NC}"

# Generate certificates for each domain
domains=(
    "uspark.dev"
    "www.uspark.dev"
    "app.uspark.dev"
    "docs.uspark.dev"
)

cd "$CERTS_DIR"

for domain in "${domains[@]}"; do
    echo "  🔑 Generating certificate for $domain..."
    mkcert -cert-file "$domain.pem" -key-file "$domain-key.pem" "$domain"
done

# Also generate a wildcard certificate for convenience
echo "  🔑 Generating wildcard certificate for *.uspark.dev..."
mkcert -cert-file "wildcard.uspark.dev.pem" -key-file "wildcard.uspark.dev-key.pem" "*.uspark.dev"

echo ""
echo -e "${GREEN}✅ Certificates generated successfully!${NC}"
echo ""
echo "Certificate files are in: $CERTS_DIR"
echo ""
echo "Next steps:"
echo "1. Make sure /etc/hosts contains:"
echo "   127.0.0.1 uspark.dev www.uspark.dev app.uspark.dev docs.uspark.dev"
echo ""
echo "2. Start or restart your dev container"
echo "3. The container will automatically use these certificates"
echo ""
echo -e "${YELLOW}Note: These certificates are only for local development and are ignored by git${NC}"