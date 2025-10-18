FROM node:22-slim

# Install basic tools
RUN apt-get update && apt-get install -y git curl

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code@2.0.15

# Install uspark CLI globally
RUN npm install -g @uspark/cli@0.11.9

# Verify installations
RUN claude --version
RUN uspark --version

# Add initialization script
COPY init.sh /usr/local/bin/init.sh
RUN chmod +x /usr/local/bin/init.sh

# Switch to non-root user
USER 1000

# Create workspace in home directory (guaranteed writable)
RUN mkdir -p $HOME/workspace

# Set working directory to user's home workspace
WORKDIR /home/user/workspace

# Set entrypoint to initialization script
ENTRYPOINT ["/usr/local/bin/init.sh"]
