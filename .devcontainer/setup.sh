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

# Start Caddy with our config (Caddy installed by devcontainer feature)
echo "Starting Caddy proxy..."
caddy start --config /workspaces/uspark2/turbo/Caddyfile --adapter caddyfile || echo "Caddy start failed, will try later"

echo "✅ Dev container ready!"
echo "📝 Domains: https://www.uspark.dev | https://app.uspark.dev | https://docs.uspark.dev"