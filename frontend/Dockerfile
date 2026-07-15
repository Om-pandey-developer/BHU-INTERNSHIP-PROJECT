FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .

# Pass NEXT_PUBLIC_API_URL during build (important for static optimization)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=${NEXT_PUBLIC_TURNSTILE_SITE_KEY}

RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Add non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app
RUN chown -R nodejs:nodejs /app
# Copy public folder for static assets
COPY --from=builder --chown=nodejs:nodejs /app/public ./public

# Create .next directory and ensure proper permissions
RUN mkdir .next
RUN chown nodejs:nodejs .next

# Copy standalone output
COPY --from=builder --chown=nodejs:nodejs /app/.next/standalone ./
# Copy static assets
COPY --from=builder --chown=nodejs:nodejs /app/.next/static ./.next/static

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

USER nodejs

EXPOSE 3000

CMD ["node", "server.js"]
