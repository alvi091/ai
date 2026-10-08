# syntax=docker/dockerfile:1
# Worker image: Cloud Tasks receiver running the crawl + AI pipeline.
# Build context MUST be the repo root:
#   gcloud builds submit --config=cloudbuild.yaml .
# Debian base (not Alpine) — Playwright only ships browser deps for Debian/Ubuntu.

FROM node:20-bookworm-slim AS backend
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/prisma ./prisma/
RUN npx prisma generate
COPY backend/ ./
RUN npm prune --omit=dev

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY --from=backend /app /app

# Chromium + system libraries (Playwright renders product pages here)
RUN npx playwright install --with-deps chromium

EXPOSE 8080

CMD ["node", "src/worker.js"]
