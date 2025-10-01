#!/bin/bash

# Simple setup script for dev container
set -e

echo "🚀 Setting up dev container..."

# Setup PostgreSQL (handled by postgresql feature)
sudo chown -R postgres:postgres /var/lib/postgresql 2>/dev/null || true
sudo service postgresql start 2>/dev/null || true

# Setup directories
sudo mkdir -p /home/vscode/.local/bin
sudo chown -R vscode:vscode /home/vscode/.config /home/vscode/.cache /home/vscode/.local

# Setup local domains in hosts file
if ! grep -q "www.uspark.dev" /etc/hosts; then
  echo "Adding local domains to hosts..."
  echo "127.0.0.1 uspark.dev www.uspark.dev app.uspark.dev docs.uspark.dev" | sudo tee -a /etc/hosts > /dev/null
fi

# Setup mkcert root CA
echo "Installing mkcert root CA..."
mkcert -install

echo "✅ Dev container ready!"
echo ""
echo "📝 Note: Caddy proxy is now managed via turbo/pnpm"
echo "   - Start all services: cd turbo && pnpm dev"
echo "   - Generate certificates: cd turbo/packages/proxy && npm run generate-certs"