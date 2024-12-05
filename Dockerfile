FROM node:22-alpine3.19
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
ENTRYPOINT ["node", "dist/cli.js", "--token"]
