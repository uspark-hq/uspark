FROM node:22-slim

# Install basic tools
RUN apt-get update && apt-get install -y git curl

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code@2.0.13

# Install uspark CLI globally
RUN npm install -g @uspark/cli@0.11.2

# Verify installations
RUN claude --version
RUN uspark --version

# Create workspace directory
WORKDIR /workspace

# Add initialization script
COPY init.sh /usr/local/bin/init.sh
RUN chmod +x /usr/local/bin/init.sh

# Set entrypoint to initialization script
ENTRYPOINT ["/usr/local/bin/init.sh"]
