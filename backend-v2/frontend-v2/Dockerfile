# Multi-stage build for Next.js application

# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Install sharp for image optimization in production
RUN npm install sharp

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# Accept build arguments for API configuration
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v2
ARG NEXT_PUBLIC_ENVIRONMENT=development

# Set environment variables for build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_ENVIRONMENT=$NEXT_PUBLIC_ENVIRONMENT

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Use Docker-specific environment file for proper API URLs
RUN cp .env.docker .env.production

# Install sharp for image optimization during build
RUN npm install sharp

# Build the application
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
ENV SKIP_LINT true
RUN npm run build && ls -la .next/

# Stage 3: Runner
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV development
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy all source files for development mode
COPY --from=builder /app .

# Install sharp in runner stage too
RUN npm install sharp

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT 3000

# Start the application in development mode
CMD ["npm", "run", "dev"]