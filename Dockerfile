# Multi-stage build for Slash / MCP full-stack
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:20-alpine AS backend
WORKDIR /app
COPY --from=builder /app /app
EXPOSE 8080 80
CMD ["sh","-c","npm run backend & npx serve -s dist -l 80"] 