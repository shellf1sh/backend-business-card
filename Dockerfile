FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --no-fund
COPY . .
RUN npm run build

FROM build AS verify
ENTRYPOINT ["sh", "scripts/start.sh"]
CMD ["npm", "run", "test:integration"]

FROM build AS production-dependencies
RUN npm prune --omit=dev --no-fund --ignore-scripts

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
COPY scripts/start.sh ./scripts/start.sh
USER node
EXPOSE 3000
ENTRYPOINT ["sh", "scripts/start.sh"]
CMD ["node", "dist/src/main.js"]
