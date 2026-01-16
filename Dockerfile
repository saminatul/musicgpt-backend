FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY prisma ./prisma/

# Install all dependencies (needed for build)
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine

# Install curl for health checks
RUN apk add --no-cache curl

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