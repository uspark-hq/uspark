FROM node:22-slim

RUN npm install -g @anthropic-ai/claude-code

WORKDIR /workspace
