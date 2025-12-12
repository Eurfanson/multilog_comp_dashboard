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
ARG NEXTAUTH_URL=http://localhost:3000
ARG NEXTAUTH_SECRET=iS2qJpW9eJX7tLZqS4v8bKx1zP0rDf3mX8aQh7N9oU2cV6eF
ARG GITHUB_ID=Ov23liBRsQHnrA9pSBJN
ARG GITHUB_SECRET=4eff7b0ae26acc9d6176ac2e06e7ef102a03d9f2
ARG NEXT_PUBLIC_API_URL=http://localhost:8000

ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV GITHUB_ID=$GITHUB_ID
ENV GITHUB_SECRET=$GITHUB_SECRET
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
ENV NEXTAUTH_URL=http://localhost:3000
ENV NEXTAUTH_SECRET=iS2qJpW9eJX7tLZqS4v8bKx1zP0rDf3mX8aQh7N9oU2cV6eF
ENV GITHUB_ID=Ov23liBRsQHnrA9pSBJN
ENV GITHUB_SECRET=4eff7b0ae26acc9d6176ac2e06e7ef102a03d9f2
ENV NEXT_PUBLIC_API_URL=http://localhost:8000

# Expose port
EXPOSE 3000

# Run Next.js in production mode
CMD ["npm", "run", "start"]
