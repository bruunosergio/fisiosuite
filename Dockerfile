# FisioSuite — imagem única (API Nest + front Vite) para demo/produção
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci

FROM deps AS build
COPY . .
WORKDIR /app
RUN npm run prisma:generate -w @fisiosuite/api
ENV VITE_API_URL=/api
RUN npm run build -w @fisiosuite/web
RUN npm run build -w @fisiosuite/api
RUN mkdir -p apps/api/public && cp -r apps/web/dist/* apps/api/public/

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/public ./apps/api/public
WORKDIR /app/apps/api
EXPOSE 3001
# Seed via API/admin na primeira demo; migrate garante o schema.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
