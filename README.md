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

### With Custom Options

```typescript
import { createLyricsFetcher } from 'lrclib-fetcher-ts';

const fetcher = createLyricsFetcher({
  logging: {
    level: 'debug',
    logToFile: true,
    logFilePath: 'lyrics-fetcher.log'
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

// Process all music files in a directory and its subdirectories
const results = await fetcher.processDirectory('/path/to/music');
```

### Process Individual Files

```typescript
import { LyricsFetcherOrchestrator } from 'lrclib-fetcher-ts';

const orchestrator = new LyricsFetcherOrchestrator();

// Process a single file
const result = await orchestrator.processAudioFile('/path/to/music/song.mp3', {
  file: {
    overwriteExisting: true
  }
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

The options object has the following structure:

```typescript
{
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    logToFile?: boolean;
    logFilePath?: string;
  },
  search: {
    allowTitleOnlySearch: boolean;
    preferSynced: boolean;
  },
  file: {
    skipExisting: boolean;
    overwriteExisting: boolean;
  },
  batch: {
    enabled: boolean;
    size: number;
    delayMs: number;
  }
}
```

| Option | Type | Description |
|--------|------|-------------|
| `logging.level` | string | Log level: 'debug', 'info', 'warn', or 'error' |
| `logging.logToFile` | boolean | Whether to write logs to a file |
| `logging.logFilePath` | string | Path to the log file if logging to file |
| `search.allowTitleOnlySearch` | boolean | Allow searching by title only if artist search fails |
| `search.preferSynced` | boolean | Prefer synchronized lyrics over plain text |
| `file.skipExisting` | boolean | Skip files that already have lyrics files |
| `file.overwriteExisting` | boolean | Replace existing lyrics files |
| `batch.enabled` | boolean | Enable batch processing |
| `batch.size` | number | Number of files to process in parallel |
| `batch.delayMs` | number | Milliseconds between API requests |

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
// { artist: 'Artist Name', title: 'Song Title', album: 'Album Name', duration: 240, filepath: '/path/to/music/song.mp3' }
```

### Lyrics API Client

The API client can be used directly to search for lyrics:

```typescript
import { LrcLibClient } from 'lrclib-fetcher-ts';

const client = new LrcLibClient();
const lyrics = await client.searchLyrics({
  artist: 'Artist Name',
  title: 'Song Title',
  album: 'Album Name',
  duration: 240,
  filepath: '/path/to/file.mp3'
});

if (lyrics && lyrics.syncedLyrics) {
  console.log('Found synchronized lyrics!');
}
```

### File Writer

```typescript
import { LyricsFileWriter } from 'lrclib-fetcher-ts';

const writer = new LyricsFileWriter();
const lyricsPath = await writer.writeLyrics('/path/to/audio.mp3', {
  artist: 'Artist Name',
  title: 'Song Title',
  syncedLyrics: '[00:01.00]Lyrics line 1\n[00:05.00]Lyrics line 2',
  plainLyrics: 'Lyrics line 1\nLyrics line 2',
  source: 'lrclib.net',
  instrumental: false
});
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
│   ├── utils/           # Utilities (logging, error handling)
│   └── index.ts         # Entry point
├── docs/
│   └── lrclib-api.md    # LrcLib API documentation
└── tests/
    └── music/           # Test music files
```

## Error Handling

The library includes custom error classes for different types of failures:

- `LrcLibError`: Base error class
- `MetadataExtractionError`: Issues extracting metadata
- `LyricsFetchError`: Issues fetching lyrics from the API
- `FileWriteError`: Issues writing lyrics to files

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