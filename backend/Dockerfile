FROM node:18-alpine

# curl needed for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

# Create uploads directory for persistent file storage
RUN mkdir -p /app/uploads

# Railway injects PORT automatically — expose it
EXPOSE ${PORT:-5000}

CMD ["node", "server.js"]
