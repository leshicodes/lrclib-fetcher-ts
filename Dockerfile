# Base image with Node.js
FROM node:22-slim

# Set working directory
WORKDIR /app

# Install ffmpeg which includes ffprobe (needed for metadata extraction)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY dist/ ./dist/

# Create volume mount point for music
VOLUME /music

# Set environment variables with defaults
ENV LRCLIB_RECURSIVE=true \
    LRCLIB_SKIP_EXISTING=true \
    LRCLIB_OVERWRITE=false \
    LRCLIB_BATCH_SIZE=5 \
    LRCLIB_DELAY=1000 \
    LRCLIB_TITLE_ONLY=false \
    LRCLIB_PREFER_SYNCED=true \
    LRCLIB_LOG_LEVEL=info \
    LRCLIB_LOG_FILE=/var/log/lrclib.log

# Copy entrypoint script
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

# Run the application
ENTRYPOINT ["/docker-entrypoint.sh"]