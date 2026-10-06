FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

# Copy prisma schema and generate
COPY backend/prisma ./prisma/
RUN npx prisma generate

# Copy source and build frontend
COPY backend/ ./backend/
COPY frontend/ ./frontend/

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

# Copy prisma migrations and schema for db push
COPY --from=builder /app/backend/prisma ./prisma/
RUN npx prisma generate

# Copy built backend files
COPY --from=builder /app/backend/src ./src
COPY --from=builder /app/backend/config ./config

# Copy built frontend static files
COPY --from=builder /app/frontend/dist ./dist

# Expose Cloud Run port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/api/health || exit 1

# Start server
CMD ["node", "src/server.js"]