# Stage 1: Base toolchain for CI/CD and minimal development
FROM ubuntu:22.04 AS toolchain

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Install base dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    gnupg \
    lsb-release \
    ca-certificates \
    sudo \
    zsh \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 22
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm 10.15.0 and set up
ENV SHELL=/bin/bash
RUN npm install -g pnpm@10.15.0 \
    && SHELL=/bin/bash pnpm setup \
    && echo 'export PNPM_HOME="/root/.local/share/pnpm"' >> /etc/profile.d/pnpm.sh \
    && echo 'export PATH="$PNPM_HOME:$PATH"' >> /etc/profile.d/pnpm.sh

# Install lefthook using pnpm
RUN . /etc/profile.d/pnpm.sh && pnpm install -g lefthook@1.12.3

# Create non-root user
RUN useradd -m -s /usr/bin/zsh uspark \
    && echo "uspark ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Switch to non-root user
USER uspark
WORKDIR /home/uspark

# Set up shell environment and pnpm for uspark user
RUN SHELL=/usr/bin/zsh pnpm setup \
    && echo 'export PNPM_HOME="/home/uspark/.local/share/pnpm"' >> ~/.zshrc \
    && echo 'export PATH="$PNPM_HOME:$PATH"' >> ~/.zshrc

# Stage 2: Development environment with additional tools
FROM toolchain AS development

# Switch back to root for installations
USER root

# Install development tools
RUN apt-get update && apt-get install -y \
    vim \
    ripgrep \
    && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# Install Vercel CLI globally
RUN npm install -g vercel

# Create directories that will be mounted as volumes
RUN mkdir -p /home/uspark/.config \
    && mkdir -p /home/uspark/.cache \
    && mkdir -p /home/uspark/.local/share/com.vercel.cli \
    && mkdir -p /home/uspark/.local/bin \
    && chown -R uspark:uspark /home/uspark/.config \
    && chown -R uspark:uspark /home/uspark/.cache \
    && chown -R uspark:uspark /home/uspark/.local

# Switch back to non-root user
USER uspark

# Set environment variables for development
ENV CLAUDE_CONFIG_DIR=/home/uspark/.config/claude
ENV HISTFILE=/home/uspark/.cache/.zsh_history

# Default command
CMD ["/usr/bin/zsh"]