#!/bin/bash

# Simple setup script for dev container
set -e

echo "🚀 Setting up dev container..."

# Setup PostgreSQL (handled by postgresql feature)
sudo chown -R postgres:postgres /var/lib/postgresql 2>/dev/null || true
sudo service postgresql start 2>/dev/null || true

# Setup directories
sudo mkdir -p /home/vscode/.local/bin
sudo chown -R vscode:vscode /home/vscode/.config /home/vscode/.cache /home/vscode/.local /home/vscode/.pki

# Setup local domains in hosts file
if ! grep -q "www.uspark.dev" /etc/hosts; then
  echo "Adding local domains to hosts..."
  echo "127.0.0.1 uspark.dev www.uspark.dev app.uspark.dev docs.uspark.dev" | sudo tee -a /etc/hosts > /dev/null
fi

# Setup mkcert root CA
echo "Installing mkcert root CA..."
# Initialize NSS database if it doesn't exist
if [ ! -f "/home/vscode/.pki/nssdb/cert9.db" ]; then
  mkdir -p /home/vscode/.pki/nssdb
  certutil -d sql:/home/vscode/.pki/nssdb -N --empty-password
fi
# Install to NSS database only (not system trust store)
TRUST_STORES=nss mkcert -install

# Import mkcert CA to Chrome MCP profile
CHROME_MCP_PROFILE="/home/vscode/.cache/chrome-devtools-mcp/chrome-profile"
if [ -f "/home/vscode/.local/share/mkcert/rootCA.pem" ]; then
  echo "Importing mkcert CA to Chrome MCP profile..."
  mkdir -p "$CHROME_MCP_PROFILE"
  # Initialize NSS database if it doesn't exist
  if [ ! -f "$CHROME_MCP_PROFILE/cert9.db" ]; then
    certutil -d sql:"$CHROME_MCP_PROFILE" -N --empty-password
  fi
  # Get the certificate nickname from system NSS database (includes serial number)
  CERT_NAME=$(certutil -d sql:/home/vscode/.pki/nssdb -L | grep "mkcert development CA" | awk '{print $1" "$2" "$3" "$4}')
  # Remove any existing mkcert certificates from Chrome profile
  certutil -d sql:"$CHROME_MCP_PROFILE" -L 2>/dev/null | grep -i "mkcert" | while read -r line; do
    # Extract certificate nickname (everything except the last 3 columns which are trust attributes)
    cert_nickname=$(echo "$line" | awk '{for(i=1;i<=NF-3;i++) printf "%s ", $i; print ""}' | sed 's/[[:space:]]*$//')
    certutil -d sql:"$CHROME_MCP_PROFILE" -D -n "$cert_nickname" 2>/dev/null || true
  done
  # Import the current mkcert certificate
  certutil -d sql:"$CHROME_MCP_PROFILE" -A -t "C,," -n "$CERT_NAME" -i "/home/vscode/.local/share/mkcert/rootCA.pem"
fi

echo "✅ Dev container ready!"
echo ""
echo "📝 Note: Caddy proxy is now managed via turbo/pnpm"
echo "   - Start all services: cd turbo && pnpm dev"
echo "   - Generate certificates: cd turbo/packages/proxy && npm run generate-certs"