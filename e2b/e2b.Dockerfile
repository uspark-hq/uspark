FROM node:22-slim

# Install basic tools
RUN apt-get update && apt-get install -y git curl

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code@2.0.22

# Install uspark CLI globally
RUN npm install -g @uspark/cli@0.13.0

# Verify installations
RUN claude --version
RUN uspark --version

# Add Claude turn execution script
COPY execute-claude-turn.sh /usr/local/bin/execute-claude-turn.sh
RUN chmod +x /usr/local/bin/execute-claude-turn.sh

# Switch to non-root user
USER 1000

# Create workspace in home directory (guaranteed writable)
RUN mkdir -p $HOME/workspace

# Set working directory to user's home workspace
WORKDIR /home/user/workspace
