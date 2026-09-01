# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /repo
COPY package.json yarn.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN yarn install --frozen-lockfile --production=false

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN yarn workspace @recv/shared build && yarn workspace @recv/api build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /repo/apps/api
COPY --from=build /repo/node_modules /repo/node_modules
COPY --from=build /repo/packages/shared /repo/packages/shared
COPY --from=build /repo/apps/api/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./package.json
# Migrations and seeds run from the compiled tree; env/ is mounted at runtime.
EXPOSE 3001
CMD ["node", "dist/src/app/app"]
