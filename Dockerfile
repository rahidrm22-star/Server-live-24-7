FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Install build-tools and python for multi-language runtimes
RUN apk add --no-cache bash curl git python3 py3-pip openjdk17-jre gcc g++ make

COPY package*.json ./
RUN npm install --production=true

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/storage ./storage

EXPOSE 3000 8000 25565

CMD ["node", "dist/server.cjs"]
