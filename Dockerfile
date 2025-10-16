# Multi-stage build for production

# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --omit=dev
COPY client/ ./
ENV REACT_APP_API_URL=/api
RUN npm run build

# Stage 2: Setup Node.js backend
FROM node:18-alpine AS backend-build
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY server/ ./server/

# Stage 3: Production image
FROM node:18-alpine
WORKDIR /app

# Install PostgreSQL client for health checks
RUN apk add --no-cache postgresql-client

# Copy backend
COPY --from=backend-build /app/node_modules ./node_modules
COPY --from=backend-build /app/package.json ./
COPY --from=backend-build /app/server ./server

# Copy frontend build
COPY --from=frontend-build /app/client/build ./client/build

# Serve static files
RUN npm install express-static

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Waiting for database..."' >> /app/start.sh && \
    echo 'while ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER > /dev/null 2>&1; do' >> /app/start.sh && \
    echo '  sleep 1' >> /app/start.sh && \
    echo 'done' >> /app/start.sh && \
    echo 'echo "Database is ready!"' >> /app/start.sh && \
    echo 'echo "Initializing database schema..."' >> /app/start.sh && \
    echo 'PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f /app/server/database/schema.sql || echo "Schema already exists"' >> /app/start.sh && \
    echo 'echo "Starting server..."' >> /app/start.sh && \
    echo 'node server/index.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["/app/start.sh"]
