# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package*.json ./
COPY nx.json ./
COPY tsconfig.base.json ./

# Copy packages
COPY packages/core ./packages/core
COPY packages/api ./packages/api

# Install dependencies
RUN npm ci

# Build the API
RUN npm run build -- @6fb/api

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 8000

# Start the server
CMD ["node", "dist/packages/api/server.js"]