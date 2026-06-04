# Studio (dashboard) image — mustaqil Next.js ilovasi.
# npm ishlatamiz (pnpm v10'ning ignored-builds gate'idan qochish uchun).
# NEXT_PUBLIC_* o'zgaruvchilar BUILD vaqtida bakelanadi (Next.js client uchun).
FROM node:22-slim AS build
WORKDIR /app

ARG NEXT_PUBLIC_GATEWAY_URL=http://localhost:8000
ARG NEXT_PUBLIC_ADMIN_TOKEN=dev-admin-token-change-me
ENV NEXT_PUBLIC_GATEWAY_URL=$NEXT_PUBLIC_GATEWAY_URL
ENV NEXT_PUBLIC_ADMIN_TOKEN=$NEXT_PUBLIC_ADMIN_TOKEN

COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-slim AS run
WORKDIR /app
COPY --from=build /app ./
ENV NODE_ENV=production
EXPOSE 3001
CMD ["npm", "start"]
