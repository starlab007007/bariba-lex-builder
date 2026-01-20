# Utilisation d'une image Node.js pour le build
FROM node:18 as build

# Build args for version tracking
ARG VITE_BUILD_SHA=dev
ARG VITE_BUILD_TIME

ENV VITE_BUILD_SHA=$VITE_BUILD_SHA
ENV VITE_BUILD_TIME=$VITE_BUILD_TIME

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# Utilisation d'une image Nginx pour servir l'application
FROM nginx:alpine

# Copy nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]