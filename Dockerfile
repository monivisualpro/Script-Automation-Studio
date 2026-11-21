# Multi-stage Dockerfile for local / containerized desktop execution (Node.js + React Vite + Express)

FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist /app/dist
COPY server.ts server.ts tsconfig.json ./
COPY server ./server

EXPOSE 8080

CMD ["node", "dist/server.cjs"]
