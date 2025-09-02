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

# Install pnpm 10
RUN npm install -g pnpm@10.0.0

# Install lefthook for git hooks
RUN curl -fsSL https://raw.githubusercontent.com/evilmartians/lefthook/master/install.sh | bash \
    && mv lefthook /usr/local/bin/

# Create non-root user
RUN useradd -m -s /usr/bin/zsh vscode \
    && echo "vscode ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Switch to non-root user
USER vscode
WORKDIR /home/vscode

# Set up shell environment
RUN touch ~/.zshrc

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
RUN mkdir -p /home/vscode/.config \
    && mkdir -p /home/vscode/.cache \
    && mkdir -p /home/vscode/.local/share/com.vercel.cli \
    && mkdir -p /home/vscode/.local/bin \
    && chown -R vscode:vscode /home/vscode/.config \
    && chown -R vscode:vscode /home/vscode/.cache \
    && chown -R vscode:vscode /home/vscode/.local

# Switch back to non-root user
USER vscode

# Set environment variables for development
ENV CLAUDE_CONFIG_DIR=/home/vscode/.config/claude
ENV HISTFILE=/home/vscode/.cache/.zsh_history

# Default command
CMD ["/usr/bin/zsh"]