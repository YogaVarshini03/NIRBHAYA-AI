FROM node:20-slim

WORKDIR /app

# Install essential build dependencies for native modules
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package manifests
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy application source code
COPY . .

# Build frontend static assets into dist/
RUN npm run build

# Default environment configuration
ENV PORT=5000
ENV NODE_ENV=production
ENV APP_MODE=production

EXPOSE 5000

# Start Express + WebSocket backend server
CMD ["npm", "start"]
