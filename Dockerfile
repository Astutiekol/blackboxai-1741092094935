# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (caching)
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm run install-all

# Copy source code
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Expose backend port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:5000/health || exit 1

# Labels
LABEL maintainer="Solana Lottery Team" \
      version="1.0.0" \
      description="Solana-based lottery application"

# Environment variables
ENV NODE_ENV=production \
    PORT=5000

# Best practices
RUN adduser -D appuser && \
    chown -R appuser /app
USER appuser

# Multi-stage build for production
FROM node:18-alpine as production

WORKDIR /app

# Copy built artifacts from previous stage
COPY --from=0 /app/frontend/build ./frontend/build
COPY --from=0 /app/backend ./backend
COPY --from=0 /app/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Set production environment
ENV NODE_ENV=production

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
