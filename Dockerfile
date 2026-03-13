# ── Stage 1: Build Expo web app ───────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Build tools needed for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx expo export --platform web

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Build tools needed to compile better-sqlite3
RUN apk add --no-cache python3 make g++

# Install production dependencies only + static file server
COPY package*.json ./
RUN npm ci --omit=dev && npm install -g serve

# Copy server and built web app
COPY server.js .
COPY --from=builder /app/dist ./dist

# Persistent data directory (mount a volume here)
RUN mkdir -p data

EXPOSE 3747 8082

# Start API server + static web server
CMD sh -c "node server.js & serve -s dist -l 8082"
