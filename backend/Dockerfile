# syntax=docker/dockerfile:1
# API image: Express server + built React SPA (same-origin) + Chromium.
# Build context MUST be the repo root:
#   gcloud builds submit --config=cloudbuild.yaml .

# ---------- Frontend ----------
FROM node:20-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- Backend deps ----------
FROM node:20-alpine AS backend
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/prisma ./prisma/
RUN npx prisma generate
COPY backend/ ./
RUN npm prune --omit=dev

# ---------- Runtime ----------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY --from=backend /app /app
# server.js resolves the SPA at <root>/frontend/dist by default
COPY --from=frontend /frontend/dist ./frontend/dist

# Chromium + system libraries for the API-side crawlers
RUN npx playwright install --with-deps chromium

EXPOSE 8080

CMD ["node", "src/server.js"]
