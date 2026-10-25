# The API's production image (Render builds it from this file). Debian slim, not Alpine: Sharp's prebuilt
# binaries need glibc, which Alpine doesn't have.
FROM node:24-bookworm-slim

# Watermark text is drawn with system fonts. The slim image has none, so without these the text renders as boxes.
RUN apt-get update \
  && apt-get install -y --no-install-recommends fontconfig fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# package files first: Docker caches this layer, so npm ci only re-runs when dependencies change, not on every code edit.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

# Don't run as root: if the app is ever exploited, the attacker doesn't own the container.
USER node
EXPOSE 4000
CMD ["node", "src/index.js"]
