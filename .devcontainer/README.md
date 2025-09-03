# USpark Development Container

This development container provides a complete development environment for the USpark project using Docker Compose.

## Services

- **app**: Main development container based on Ubuntu 22.04
- **db**: PostgreSQL 17 database for local development

## Docker Image Pinning

For improved security and reproducibility, you can pin the base image to a specific digest hash:

1. Get the current digest:
```bash
docker pull mcr.microsoft.com/devcontainers/base:ubuntu-22.04
docker inspect mcr.microsoft.com/devcontainers/base:ubuntu-22.04 --format='{{index .RepoDigests 0}}'
```

2. Update `docker-compose.yml` to use the digest:
```yaml
image: mcr.microsoft.com/devcontainers/base@sha256:<hash>
```

## Port Configuration

The devcontainer forwards the following ports:

- **4983**: Development tools port (e.g., Vitest UI test interface, dev servers)
- **5432**: PostgreSQL database port

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string for the local database
- `CLAUDE_CONFIG_DIR`: Directory for Claude configuration files
- `HISTFILE`: Custom location for zsh history

## Volumes

- **config**: VSCode configuration persistence
- **cache**: Development cache directory
- **vercel**: Vercel CLI data persistence
- **postgres-data**: PostgreSQL data persistence