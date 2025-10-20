### Builder stage
FROM node:22 AS builder

LABEL org.opencontainers.image.source="https://github.com/Saude-Bucal-MS/datasus-scripts"

ENV DEBIAN_FRONTEND=noninteractive

# Install build dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        python3 \
        make \
        gcc \
        g++ \
        libsqlite3-dev \
        ca-certificates \
        git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy package manifests first for better caching
COPY package.json ./
COPY package-lock.json* ./

# Install all deps (including dev) because we need typescript and build tools
RUN npm set progress=false \
    && npm install --no-audit --prefer-offline

# Copy source
COPY . .

# Build native deps (if present) and the project
RUN if [ -d deps/blast-dbf ]; then cd deps/blast-dbf && make; fi

RUN npm run build

# Keep only production modules to reduce final image size
RUN npm prune --production


### Runtime stage
FROM node:22-slim AS runtime

ENV NODE_ENV=production
ENV PET_WORKDIR=/usr/src/app/data

# Install runtime-only packages
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libsqlite3-0 \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy runtime artifacts from builder
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/deps ./deps

# Make sure native helper (if present) is executable
RUN if [ -f deps/blast-dbf/blast-dbf ]; then chmod +x deps/blast-dbf/blast-dbf; fi

# Create default data directory used by the CLI
RUN mkdir -p ${PET_WORKDIR}

# Create a volume for the data directory
VOLUME ["${PET_WORKDIR}"]

# Entrypoint per user's request; `--` forwards container args to the npm script
ENTRYPOINT ["npm", "run", "cli", "--"]
