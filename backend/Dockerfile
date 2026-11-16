FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install exactly what the lockfile pins, without dev dependencies.
COPY package.json package-lock.json ./
# npm is only needed to install; it is removed afterwards so its own bundled
# dependencies are not shipped (the app never calls npm at runtime).
RUN npm ci --omit=dev && npm cache clean --force \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /root/.npm

COPY src/ ./src/
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# The entrypoint fixes ownership of the mounted /data and /backups folders,
# then runs the app as the unprivileged "node" user instead of root.
ENTRYPOINT ["docker-entrypoint.sh"]

EXPOSE 3001

CMD ["node", "src/index.js"]
