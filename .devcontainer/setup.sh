#!/bin/bash

# Setup script for dev container initialization
set -e

echo "🚀 Setting up dev container..."

# Setup PostgreSQL
echo "Setting up PostgreSQL..."
sudo chown -R postgres:postgres /var/lib/postgresql 2>/dev/null || true
sudo service postgresql start 2>/dev/null || true

# Setup directories
sudo mkdir -p /home/vscode/.local/bin
sudo chown -R vscode:vscode /home/vscode/.config /home/vscode/.cache /home/vscode/.local

# Install Caddy
echo "Installing Caddy..."
if ! command -v caddy &> /dev/null; then
  wget -q -O - https://github.com/caddyserver/caddy/releases/download/v2.7.6/caddy_2.7.6_linux_amd64.tar.gz | sudo tar -xz -C /usr/local/bin caddy
  sudo chmod +x /usr/local/bin/caddy
fi

# Setup hosts file
if ! grep -q "www.uspark.dev" /etc/hosts; then
  echo "Setting up local domains..."
  echo "127.0.0.1 uspark.dev www.uspark.dev app.uspark.dev docs.uspark.dev" | sudo tee -a /etc/hosts > /dev/null
fi

# Create Caddy service
echo "Setting up Caddy service..."
sudo tee /etc/systemd/system/caddy-dev.service > /dev/null <<EOF
[Unit]
Description=Caddy Dev Proxy
After=network.target

[Service]
Type=exec
User=vscode
Group=vscode
ExecStart=/usr/local/bin/caddy run --config /workspaces/uspark2/turbo/Caddyfile --adapter caddyfile
ExecReload=/usr/local/bin/caddy reload --config /workspaces/uspark2/turbo/Caddyfile --adapter caddyfile
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

# Start Caddy service
sudo systemctl daemon-reload
sudo systemctl enable caddy-dev 2>/dev/null || true
sudo systemctl start caddy-dev || true

echo "✅ Dev container setup complete!"
echo "📝 Available domains:"
echo "   - https://www.uspark.dev (web app)"
echo "   - https://app.uspark.dev (workspace)"
echo "   - https://docs.uspark.dev (documentation)"
echo ""
echo "⚠️  First access will show certificate warning - click 'Advanced' → 'Proceed' to continue."