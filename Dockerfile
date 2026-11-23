# Multi-stage Dockerfile for containerized execution (Node.js + React Vite + Express)

FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
# Inside a container the server must listen on all interfaces so the published port is reachable.
ENV HOST=0.0.0.0

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# dist/server.cjs is a self-contained bundle (npm deps stay external and are installed above).
COPY --from=builder /app/dist /app/dist

EXPOSE 8080

CMD ["node", "dist/server.cjs"]
