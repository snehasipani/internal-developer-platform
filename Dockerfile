FROM node:22-alpine

WORKDIR /app

COPY app/package*.json ./

RUN npm ci --omit=dev

COPY app/src ./src

EXPOSE 3000

CMD ["node", "src/server.js"]