FROM node:18-alpine

# Healthcheck in docker-compose uses curl, so install it in the image.
RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
