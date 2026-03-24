FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npx nest build
RUN ls -la dist/

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
