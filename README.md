# lrclib-fetcher-ts

A TypeScript library for finding and downloading synchronized lyrics for your music files.

## Overview

`lrclib-fetcher-ts` automatically scans your music collection, extracts metadata, and fetches synchronized lyrics from lrclib.net. It creates `.lrc` files (for synchronized lyrics) or `.txt` files (for plain text lyrics) alongside your music files, making them compatible with most music players that support lyrics display.

## Features

- 🔍 Recursively scans directories for music files (MP3, FLAC, M4A, OGG, WAV, WMA)
- 📝 Extracts metadata using FFprobe for accurate artist/title information
- 🎵 Fetches both synchronized and plain text lyrics from lrclib.net
- ⚡ Processes files in batches with configurable rate limiting
- 🚫 Skip files that already have lyrics files
- 🔄 Override mode to replace existing lyrics
- 📊 Detailed progress reporting and results

## Installation

```bash
npm install lrclib-fetcher-ts
```

### Prerequisites

This library requires [FFprobe](https://ffmpeg.org/) for metadata extraction. The package includes a bundled version of FFprobe for most platforms, but you may need to install it separately on some systems.

## Quick Start

```typescript
import { createLyricsFetcher } from 'lrclib-fetcher-ts';

// Create a lyrics fetcher with default options
const fetcher = createLyricsFetcher();

// Process a directory
fetcher.processDirectory('/path/to/music')
  .then(results => {
    console.log(`Successfully processed ${results.filter(r => r.success).length} files`);
  })
  .catch(error => {
    console.error('Error processing files:', error);
  });
```

## Advanced Usage

### With Progress Reporting

```typescript
import { createLyricsFetcher } from 'lrclib-fetcher-ts';

const fetcher = createLyricsFetcher({
  recursive: true,
  skipExisting: true,
  overrideExisting: false,
  batchSize: 5,
  delayBetweenRequests: 1000,
  onProgress: (current, total, result) => {
    if (result) {
      console.log(`[${current}/${total}] ${result.metadata.artist} - ${result.metadata.title}: ${result.success ? 'Success' : 'Failed'}`);
    } else {
      console.log(`Progress: ${current}/${total} files processed`);
    }
  }
});

// Process all music files in a directory and its subdirectories
const results = await fetcher.processDirectory('/path/to/music');
```

### Process Individual Files

```typescript
import { LyricsFetcherOrchestrator } from 'lrclib-fetcher-ts';

const orchestrator = new LyricsFetcherOrchestrator();

// Process a single file
const result = await orchestrator.processAudioFile('/path/to/music/song.mp3', {
  overrideExisting: true
});

if (result.success) {
  console.log(`Lyrics saved to: ${result.lyricPath}`);
} else {
  console.error(`Failed: ${result.error?.message}`);
}
```

## API Reference

### `createLyricsFetcher(options?)`

Creates a new lyrics fetcher instance with the specified options.

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `recursive` | boolean | `true` | Whether to scan subdirectories recursively |
| `skipExisting` | boolean | `true` | Skip files that already have lyrics files |
| `extensions` | string[] | `['mp3', 'flac', 'm4a', 'ogg', 'wav', 'wma']` | File extensions to process |
| `overrideExisting` | boolean | `false` | Replace existing lyrics files |
| `batchSize` | number | `10` | Number of files to process in parallel |
| `delayBetweenRequests` | number | `1000` | Milliseconds between API requests |
| `onProgress` | function | `undefined` | Progress callback function |

### `LyricsFetcherOrchestrator`

The main class that orchestrates the lyrics fetching process.

#### Methods

- `processDirectory(directory, options?)`: Process all music files in a directory
- `processAudioFile(filePath, options?)`: Process a single audio file

### File Scanner

The file scanner module provides functions for finding music files in directories.

```typescript
import { scanDirectory } from 'lrclib-fetcher-ts';

const files = await scanDirectory('/path/to/music', {
  recursive: true,
  skipExisting: true,
  extensions: ['mp3', 'flac']
});
```

### Metadata Extractor

The metadata extractor module provides functions for getting metadata from audio files.

```typescript
import { extractMetadata } from 'lrclib-fetcher-ts';

const metadata = await extractMetadata('/path/to/music/song.mp3');
console.log(metadata);
// { artist: 'Artist Name', title: 'Song Title', album: 'Album Name', duration: 240 }
```

## Project Structure

```
lrclib-fetcher-ts/
├── src/
│   ├── types/           # Type definitions
│   ├── scanner/         # File discovery
│   ├── metadata/        # Metadata extraction
│   ├── api/             # LrcLib API client
│   ├── writer/          # Lyrics file writer
│   ├── orchestrator/    # Main orchestrator
│   └── index.ts         # Entry point
├── docs/
│   └── lrclib-api.md    # LrcLib API documentation
└── tests/
    └── music/           # Test music files
```

## Error Handling

All errors are captured and included in the result objects, allowing the process to continue even when individual files fail. The result objects include:

- `success`: Boolean indicating if the process was successful
- `error`: Error object if the process failed
- `metadata`: Extracted metadata
- `lyricPath`: Path to the created lyrics file (if successful)

## Acknowledgments

- This project uses the [LrcLib API](https://lrclib.net/) for lyrics retrieval.
- Metadata extraction is performed using [FFprobe](https://ffmpeg.org/).

## License

MIT

## Contributing

Contributions are welcome! Please check the contribution guidelines for more details.