# LRCLib Fetcher

A TypeScript library and CLI tool for fetching synchronized lyrics from [LRCLib.net](https://LRCLib.net) for your music files.

## Features

- **Batch Processing**: Process multiple music files in parallel with configurable batch sizes
- **Metadata Extraction**: Extract artist and title information from audio file metadata
- **Synchronized Lyrics**: Prioritizes synchronized .lrc files over plain text lyrics
- **Smart Search**: Multiple fallback strategies to find the best match for your music
- **File Management**: Skip existing lyrics or overwrite as needed
- **Detailed Logging**: Configurable logging levels for debugging

## Installation

### NPM Global Installation

```bash
npm install -g lrclib-fetcher-ts
```

### Local Installation

```bash
npm install lrclib-fetcher-ts
```

## CLI Usage

### Basic Usage

Process a directory of music files:

```bash
lrclib /path/to/your/music
```

### Command Line Options

```
Options:
  -r, --recursive                Scan directories recursively (default: true)
  --no-skip-existing             Don't skip files that already have lyrics
  -o, --overwrite                Overwrite existing lyrics files (default: false)
  -b, --batch-size <number>      Number of files to process in parallel (default: "5")
  -d, --delay <number>           Delay between API requests in milliseconds (default: "1000")
  --allow-title-only             Allow searching by title only if artist search fails (default: false)
  --prefer-synced                Prefer synchronized lyrics over plain text (default: true)
  --log-level <level>            Log level (debug, info, warn, error) (default: "info")
  --log-file <path>              Path to log file
  -h, --help                     Display help
  -V, --version                  Show version
```

### Examples

```bash
# Process a directory with default settings
lrclib ~/Music

# Process with custom options
lrclib ~/Music --overwrite --batch-size 10 --delay 2000

# Only process files without existing lyrics
lrclib ~/Music --skip-existing

# Write logs to a file
lrclib ~/Music --log-level debug --log-file lyrics.log
```

## Using with Docker

### Build the Docker image

```bash
docker build -t lrclib-fetcher .
```

### Run with Docker

```bash
docker run -v "/path/to/your/music:/music" lrclib-fetcher
```

### Using custom options with Docker

```bash
docker run -v "/path/to/your/music:/music" lrclib-fetcher /music --overwrite --batch-size 10
```

## Programmatic Usage

```typescript
import { createLyricsFetcher } from 'lrclib-fetcher-ts';

// Create a fetcher with custom options
const fetcher = createLyricsFetcher({
  logging: { 
    level: 'info',
    logToFile: false
  },
  search: {
    allowTitleOnlySearch: true,
    preferSynced: true
  },
  file: {
    skipExisting: true,
    overwriteExisting: false
  },
  batch: {
    enabled: true,
    size: 5,
    delayMs: 1000
  }
});

// Process a directory
fetcher.processDirectory('/path/to/music')
  .then(results => {
    console.log(`Processed ${results.length} files`);
    console.log(`${results.filter(r => r.success).length} successful`);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

## API Reference

### `createLyricsFetcher(options)`

Creates a new lyrics fetcher instance with the specified options.

### `processDirectory(directory, options)`

Processes all audio files in the specified directory and its subdirectories.

## Requirements

- Node.js 16 or later
- ffmpeg/ffprobe (automatically installed via ffprobe-static)

## License

MIT

## Acknowledgements

This project uses the unofficial LRCLib.net API as described in [the API documentation](./docs/lrclib-api.md). All lyrics are provided by LRCLib.net users.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Similar code found with 2 license types