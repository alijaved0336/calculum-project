# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first (cached unless package-lock.json changes)
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline

# Copy source and build
COPY . .
ARG BUILD_MODE=staging
ARG VITE_AUTH_API_URL
ARG VITE_NEGOTIATION_API_URL
ARG VITE_NEGOTIATION_BACKEND_URL_WS
ARG VITE_INGESTION_API_URL
# Support agent services are separate deployments from the Calculum ones above.
ARG VITE_SUPPORT_INGESTION_API_URL
ARG VITE_SUPPORT_API_URL
ARG VITE_SUPPORT_API_URL_WS
ENV VITE_AUTH_API_URL=$VITE_AUTH_API_URL
ENV VITE_NEGOTIATION_API_URL=$VITE_NEGOTIATION_API_URL
ENV VITE_NEGOTIATION_BACKEND_URL_WS=$VITE_NEGOTIATION_BACKEND_URL_WS
ENV VITE_INGESTION_API_URL=$VITE_INGESTION_API_URL
ENV VITE_SUPPORT_INGESTION_API_URL=$VITE_SUPPORT_INGESTION_API_URL
ENV VITE_SUPPORT_API_URL=$VITE_SUPPORT_API_URL
ENV VITE_SUPPORT_API_URL_WS=$VITE_SUPPORT_API_URL_WS
RUN npm run build -- --mode ${BUILD_MODE}

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
