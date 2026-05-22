FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/ ./

COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

COPY Imagenes/ /app/Imagenes/

RUN mkdir -p logs src/uploads && chown -R node:node /app

EXPOSE 5000

USER node

CMD ["node", "src/server.js"]
