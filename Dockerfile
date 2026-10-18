# Development & Multi-Stage Base Dockerfile
FROM node:20-alpine AS base

WORKDIR /app

# Stage 1: Install dependencies with caching
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Stage 2: Development runner
FROM base AS development
ENV NODE_ENV=development

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
