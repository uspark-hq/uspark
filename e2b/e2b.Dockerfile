FROM node:22-slim

# Install basic tools
RUN apt-get update && apt-get install -y git curl

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code@2.0.14

# Install uspark CLI globally
RUN npm install -g @uspark/cli@0.11.3

# Verify installations
RUN claude --version
RUN uspark --version

# Create workspace directory with proper permissions
# E2B runs as user 'user' (uid 1000), so we need to set ownership
RUN mkdir -p /workspace && chown -R 1000:1000 /workspace

# Add initialization script
COPY init.sh /usr/local/bin/init.sh
RUN chmod +x /usr/local/bin/init.sh

# Switch to non-root user
USER 1000

# Set working directory
WORKDIR /workspace

# Set entrypoint to initialization script
ENTRYPOINT ["/usr/local/bin/init.sh"]
