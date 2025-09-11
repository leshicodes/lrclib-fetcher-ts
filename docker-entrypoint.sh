#!/bin/bash
set -e

# Build command line from environment variables
CMD_ARGS=""

# Handle boolean flags
[[ "$LRCLIB_RECURSIVE" == "true" ]] && CMD_ARGS="$CMD_ARGS --recursive"
[[ "$LRCLIB_RECURSIVE" == "false" ]] && CMD_ARGS="$CMD_ARGS --no-recursive"
[[ "$LRCLIB_SKIP_EXISTING" == "false" ]] && CMD_ARGS="$CMD_ARGS --no-skip-existing"
[[ "$LRCLIB_OVERWRITE" == "true" ]] && CMD_ARGS="$CMD_ARGS --overwrite"
[[ "$LRCLIB_TITLE_ONLY" == "true" ]] && CMD_ARGS="$CMD_ARGS --allow-title-only"
[[ "$LRCLIB_PREFER_SYNCED" == "false" ]] && CMD_ARGS="$CMD_ARGS --no-prefer-synced"

# Handle numeric options
[[ -n "$LRCLIB_BATCH_SIZE" ]] && CMD_ARGS="$CMD_ARGS --batch-size $LRCLIB_BATCH_SIZE"
[[ -n "$LRCLIB_DELAY" ]] && CMD_ARGS="$CMD_ARGS --delay $LRCLIB_DELAY"

# Handle logging
[[ -n "$LRCLIB_LOG_LEVEL" ]] && CMD_ARGS="$CMD_ARGS --log-level $LRCLIB_LOG_LEVEL"
[[ -n "$LRCLIB_LOG_FILE" ]] && CMD_ARGS="$CMD_ARGS --log-file $LRCLIB_LOG_FILE"

# Create log directory if needed
if [[ -n "$LRCLIB_LOG_FILE" ]]; then
    LOG_DIR=$(dirname "$LRCLIB_LOG_FILE")
    mkdir -p "$LOG_DIR"
fi

# Check if a custom command is provided
if [ $# -gt 0 ]; then
    exec "$@"
else
    # Default command: process the /music directory
    echo "Starting LRCLib Fetcher with options: $CMD_ARGS"
    exec node dist/cli.js /music $CMD_ARGS
fi