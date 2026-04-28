FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

# Skip bundled Chrome download — we use the system Chromium installed in the runner stage
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# ─── Production image ─────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# openssl for Prisma; chromium + fonts for Puppeteer PDF generation
RUN apk add --no-cache openssl chromium nss freetype harfbuzz ca-certificates ttf-freefont

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

EXPOSE 3001

# Run migrations then start — safe for fresh or existing DB
CMD ["sh", "-c", "mkdir -p uploads && npx prisma migrate deploy && node dist/prisma/seed.js && node dist/src/main"]
