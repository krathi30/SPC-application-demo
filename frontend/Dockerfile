# Build stage
FROM node:24-alpine AS build

WORKDIR /app

ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ARG PUBLIC_URL=/
ENV PUBLIC_URL=$PUBLIC_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.mjs ./
COPY src/ ./src/

RUN npm run build

# Production stage: official nginx stable, reconfigured to run as the
# unprivileged "nginx" user (listens on 8080, pid and temp files under /tmp).
FROM nginx:stable-alpine

RUN sed -i -e '/^user /d' -e 's#^pid .*#pid /tmp/nginx.pid;#' /etc/nginx/nginx.conf \
 && sed -i '/^http {/a \    client_body_temp_path /tmp/client_temp;\n    proxy_temp_path /tmp/proxy_temp;\n    fastcgi_temp_path /tmp/fastcgi_temp;\n    uwsgi_temp_path /tmp/uwsgi_temp;\n    scgi_temp_path /tmp/scgi_temp;' /etc/nginx/nginx.conf \
 && rm -f /etc/nginx/conf.d/default.conf \
 && chown -R nginx:nginx /var/cache/nginx /etc/nginx/conf.d

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx-proto.conf /etc/nginx/conf.d/00-proto.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

USER nginx

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
