# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=20.18.1
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules (only if you have build dependencies)
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Install node modules
COPY package-lock.json package.json ./
RUN npm ci

# Copy application code
COPY . .

# Final stage for app image
FROM base

# If using Puppeteer or other chromium dependencies, uncomment the lines below
# RUN apt-get update -qq && \
#     apt-get install --no-install-recommends -y chromium chromium-sandbox && \
#     rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Copy built application
COPY --from=build /app /app

# No need to expose a port since the bot doesn't use HTTP
# EXPOSE 3000  <-- Remove this if not serving HTTP traffic

# Use a simpler CMD to start your bot directly
CMD [ "node", "index.js" ]
