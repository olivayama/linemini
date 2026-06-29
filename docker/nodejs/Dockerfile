FROM node:20.17.0-slim
ARG PNPM_VERSION=9.8.0

COPY --from=busybox:1.36.0-musl /bin/wget /usr/bin/wget

WORKDIR /app

ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm i -g pnpm@${PNPM_VERSION}

# Install dependencies
COPY ./package.json ./
COPY ./pnpm-workspace.yaml ./
COPY ./pnpm-lock.yaml ./
# COPY ./patches/ ./patches/
COPY ./apps/api/package.json ./apps/api/
COPY ./apps/web/package.json ./apps/web/
# node-canvasのビルドに必要
RUN apt-get update && apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
RUN pnpm i

# Copy project files
COPY --link . .
