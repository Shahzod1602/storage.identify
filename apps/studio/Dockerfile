# Studio (dashboard) image — mustaqil Next.js ilovasi.
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /app
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
