FROM node:25-alpine AS base
WORKDIR /usr/src/app
COPY package.json package-lock.json ./

FROM base AS development
ENV NODE_ENV=development
RUN npm ci
COPY . .
USER node
CMD ["npm", "run", "start:dev"]

FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

FROM node:25-alpine AS production
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build --chown=node:node /usr/src/app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
