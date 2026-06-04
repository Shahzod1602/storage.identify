# Studio (dashboard) image — mustaqil Next.js ilovasi.
# NEXT_PUBLIC_* o'zgaruvchilar BUILD vaqtida bakelanadi (Next.js client uchun).
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /app

ARG NEXT_PUBLIC_GATEWAY_URL=http://localhost:8000
ARG NEXT_PUBLIC_ADMIN_TOKEN=dev-admin-token-change-me
ENV NEXT_PUBLIC_GATEWAY_URL=$NEXT_PUBLIC_GATEWAY_URL
ENV NEXT_PUBLIC_ADMIN_TOKEN=$NEXT_PUBLIC_ADMIN_TOKEN

COPY package.json ./
RUN pnpm install --ignore-workspace
COPY . .
RUN pnpm run build

FROM node:22-slim AS run
RUN corepack enable
WORKDIR /app
COPY --from=build /app ./
ENV NODE_ENV=production
EXPOSE 3001
CMD ["pnpm", "start"]
