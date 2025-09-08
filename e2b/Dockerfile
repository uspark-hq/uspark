# E2B Sandbox Template for Claude Code
FROM e2bdev/code-interpreter:latest

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Verify Node.js installation
RUN node --version && npm --version

# Install Claude Code CLI globally
# Note: Replace with actual package name when available
# For now, we'll prepare the environment
RUN npm install -g npm@latest

# Create workspace directory
WORKDIR /home/user/workspace

# Set up environment
ENV NODE_ENV=production
ENV PATH="/usr/local/bin:${PATH}"

# Add a health check script
RUN echo '#!/bin/bash\necho "E2B Claude Code Sandbox Ready"' > /usr/local/bin/health-check \
    && chmod +x /usr/local/bin/health-check