FROM node:20-slim

WORKDIR /app

# Install native compilation dependencies
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy repository source code
COPY . .

# Install dependencies and build frontend
RUN npm install
RUN npm run build

# Default environment configuration
ENV PORT=5000
ENV NODE_ENV=production
ENV APP_MODE=production

EXPOSE 5000

# Start Express + WebSocket backend server
CMD ["npm", "start"]
