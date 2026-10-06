FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

# Copy prisma schema and generate
COPY backend/prisma ./prisma/
RUN npx prisma generate

# Copy source
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Install Playwright with chromium (for rendering)
RUN npm install -D playwright
RUN npx playwright install --with-deps

# Build frontend
WORKDIR ./frontend
RUN npm ci && npm run build

# Final stage
FROM node:20-alpine

WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Install only production dependencies
COPY --from=builder /app/backend/package.json ./
RUN npm ci --omit=dev

# Copy prisma for runtime
COPY --from=builder /app/backend/prisma ./prisma/

# Copy built backend files
COPY --from=builder /app/backend/src ./src
COPY --from=builder /app/backend/config ./config

# Copy built frontend static files
COPY --from=builder /app/frontend/dist ./dist

# Copy Playwright cache from builder
COPY --from=builder /app/frontend/node_modules/.cache ./frontend/node_modules/.cache 2>/dev/null || true

# Copy playwright installed browsers
COPY --from=builder /app/node_modules/playwright ./
COPY --from=builder /root/.cache/ms-playwright ./.cache/ms-playwright 2>/dev/null || true

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/api/health || exit 1

CMD ["node", "src/worker.js"]