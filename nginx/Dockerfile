FROM node:22-alpine AS fe-build
WORKDIR /app
COPY fe/package.json fe/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY fe/ ./
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=fe-build /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
