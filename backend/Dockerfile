# syntax=docker/dockerfile:1

# ---- install every dependency (the build and the migrations need the dev ones too) -------------------------------
FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: the postinstall only syncs agent skills. The Prisma client is generated explicitly below.
RUN npm ci --ignore-scripts

# ---- generate the Prisma client and compile ----------------------------------------------------------------------
FROM deps AS build
COPY . .
# prisma.config.ts reads DATABASE_URL; generating the client does not connect, so any value will do here.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate \
 && npm run build

# ---- what runs ---------------------------------------------------------------------------------------------------
# node_modules is kept whole (not pruned): `prisma migrate deploy` and the seed run from this same image.
FROM node:26-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=5000
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/prisma.config.ts /app/package.json ./
# The help documents of the chatbot, read when the API starts (backend/knowledge).
COPY --from=build --chown=node:node /app/knowledge ./knowledge
USER node
EXPOSE 5000
# Only says the process answers. Taking an instance out of rotation uses /api/health (database and Redis too).
HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main"]
