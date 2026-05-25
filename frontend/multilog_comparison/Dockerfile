# Frontend Dockerfile - Next.js
FROM node:20-alpine AS builder

WORKDIR /app/frontend

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Copy environment file
COPY .env .env

# Build Next.js app (with env vars available)
ARG NEXT_PUBLIC_API_URL=http://localhost:8000

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app/frontend

# Copy package files
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built app from builder
COPY --from=builder /app/frontend/.next ./.next
COPY --from=builder /app/frontend/public ./public

# Set runtime environment variables
ENV NEXT_PUBLIC_API_URL=http://localhost:8000

# Expose port
EXPOSE 3000

# Run Next.js in production mode
CMD ["npm", "run", "start"]
