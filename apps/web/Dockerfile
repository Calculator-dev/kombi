# Build from the repository root:  docker build -f apps/web/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @kombi/web --include-workspace-root
COPY packages/shared packages/shared
COPY apps/web apps/web
ARG NEXT_PUBLIC_SITE_URL=https://kombi.ba
# Next.js bakes the /api/* rewrite target into the build, so the API address is needed here too.
ARG API_URL=http://localhost:4000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL API_URL=$API_URL NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace @kombi/web

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app /app
USER node
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "@kombi/web"]
