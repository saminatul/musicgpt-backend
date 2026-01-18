FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install all dependencies (needed for build)
RUN npm ci || npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

# Fix build output structure if files are in dist/src instead of dist
RUN if [ -d /app/dist/src ] && [ ! -f /app/dist/main.js ]; then \
      echo "Moving files from dist/src to dist..." && \
      mv /app/dist/src/* /app/dist/ && \
      rmdir /app/dist/src 2>/dev/null || true; \
    fi

# Production stage
FROM node:20-alpine

# Install curl for health checks and OpenSSL for Prisma
RUN apk add --no-cache curl openssl libc6-compat

WORKDIR /app

# Copy package files
COPY package.json ./

# Install production dependencies only
# --omit=dev is the modern flag (npm 7+), --production is legacy
RUN npm install --omit=dev || npm install --production

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Expose port
EXPOSE 3000

# Default command (can be overridden in docker-compose)
CMD ["npm", "run", "start:prod"]