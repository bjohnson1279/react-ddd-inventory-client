# Stage 1: Build the React application
FROM node:20-alpine AS build
WORKDIR /app

# Install app dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files and build production bundle
COPY . .
RUN npm run build

# Stage 2: Serve compiled static files with Nginx
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
