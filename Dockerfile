# Stage 1: build the frontend bundle
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

# Stage 2: install backend production deps using workspaces
FROM node:20-alpine AS backend-deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force

# Final runtime image
FROM node:20-alpine
WORKDIR /app/backend
ENV NODE_ENV=production \
    PORT=8086 \
    SERVE_STATIC=true

RUN apk add --no-cache iproute2

# Copy backend runtime
COPY --from=backend-deps /app/backend/node_modules ./node_modules
COPY backend/package.json ./package.json
COPY backend/src ./src
COPY backend/.env.example ./
COPY backend/data ./data

# Copy built frontend assets
COPY --from=frontend-build /app/frontend/dist ../frontend/dist

VOLUME ["/app/backend/data"]
EXPOSE 8086

CMD ["node", "src/server.js"]
