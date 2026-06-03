# Gateway (backend) image — barcha API servislari shu jarayonda.
FROM node:22-slim AS base
RUN corepack enable
WORKDIR /app

# Workspace manifestlari
COPY pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/gateway ./apps/gateway

RUN pnpm install --prod=false

ENV NODE_ENV=production
ENV GATEWAY_HOST=0.0.0.0
ENV GATEWAY_PORT=8000
ENV STORAGE_DIR=/data/storage

EXPOSE 8000
VOLUME ["/data/storage"]

CMD ["pnpm", "--filter", "@storagedb/gateway", "start"]
