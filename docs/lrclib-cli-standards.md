# LrcLib Fetcher TypeScript Standards and Conventions

This document outlines the coding standards, design patterns, and architectural decisions established for the lrclib-fetcher-ts project.

## Project Structure

The project follows a modular structure with clear separation of concerns:

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
│   ├── cli.ts           # Command line interface
│   └── index.ts         # Entry point
├── docs/                # Documentation
└── tests/               # Test files
```

## Coding Standards

### TypeScript Usage

- Use strict typing whenever possible
- Define interfaces for all data structures in `types/index.ts`
- Use explicit return types for functions
- Avoid `any` type where possible

### Naming Conventions

- **Interfaces**: Use PascalCase for interface names (e.g., `TrackMetadata`, `LyricResult`)
- **Files**: Use camelCase for filenames (e.g., `fileScanner.ts`, `errorHandling.ts`)
- **Classes**: Use PascalCase for class names (e.g., `LyricsFetcherOrchestrator`, `LyricsFileWriter`)
- **Methods**: Use camelCase for method names (e.g., `processDirectory`, `extractMetadata`)
- **Constants**: Use UPPER_SNAKE_CASE for constants (e.g., `TAG_NAMES`)
- **Variables**: Use camelCase for variables (e.g., `audioFiles`, `batchResults`)

### Code Organization

- Keep files focused on a single responsibility
- Group related functionality into modules
- Use barrel exports in index.ts files
- Place interfaces and types in dedicated files

## Architecture

### Core Components

1. **File Scanner**: Discovers audio files in directories
2. **Metadata Extractor**: Extracts track metadata from audio files
3. **API Client**: Communicates with lrclib.net to fetch lyrics
4. **File Writer**: Writes lyrics to disk as .lrc or .txt files
5. **Orchestrator**: Coordinates the entire process flow

### Design Patterns

#### Options Pattern

All configurable components accept options objects with sensible defaults:

```typescript
interface OrchestratorOptions {
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    logToFile?: boolean;
    logFilePath?: string;
  };
  search: {
    allowTitleOnlySearch: boolean;
    preferSynced: boolean;
  };
  file: {
    skipExisting: boolean;
    overwriteExisting: boolean;
  };
  batch: {
    enabled: boolean;
    size: number;
    delayMs: number;
  };
  onProgress?: (current: number, total: number, result?: ProcessResult) => void;
}
```

#### Factory Pattern

Factory functions are used to create preconfigured instances:

```typescript
export function createLyricsFetcher(options?: Partial<OrchestratorOptions>): LyricsFetcherOrchestrator {
  // Set default log level if not specified
  if (options && !options.logging) {
    options.logging = { level: 'info' };
  }
  return new LyricsFetcherOrchestrator(options);
}
```

#### Batch Processing

Process files in controllable batches to manage API rate limits:

```typescript
for (let i = 0; i < audioFiles.length; i += options.batch.size) {
  const batch = audioFiles.slice(i, i + options.batch.size);
  const batchPromises = batch.map(filePath => this.processAudioFile(filePath, options));
  const batchResults = await Promise.all(batchPromises);
  // ...
}
```

## Error Handling

### Custom Error Classes

Define custom error classes for specific error types:

```typescript
export class LrcLibError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LrcLibError';
  }
}

export class MetadataExtractionError extends LrcLibError {
  constructor(filePath: string, reason: string) {
    super(`Failed to extract metadata from ${filePath}: ${reason}`);
    this.name = 'MetadataExtractionError';
  }
}
```

### Result Objects

Use result objects to convey success/failure status:

```typescript
export interface ProcessResult {
  filePath: string;
  metadata: TrackMetadata;
  success: boolean;
  lyricPath?: string;
  error?: Error;
}
```

### Try-Catch Patterns

Wrap operations in try-catch blocks to prevent failures from stopping the entire process:

```typescript
try {
  // Operation that might fail
} catch (error) {
  logger.error('Component', `Error message: ${error instanceof Error ? error.message : String(error)}`);
  // Return a result with the error
  return {
    success: false,
    error: error as Error
    // ...other fields
  };
}
```

## Logging

### Logger Configuration

Configure the logger with appropriate levels and outputs:

```typescript
Logger.configure({
  level: LogLevel.INFO,
  useColors: true,
  includeTimestamps: true,
  outputToFile: logFilePath
});
```

### Log Format

Use consistent log formatting with component name and message:

```typescript
logger.info('ComponentName', 'Message about what is happening');
logger.error('ComponentName', 'Error occurred', errorObject);
```

### Log Levels

Use appropriate log levels:
- **ERROR**: For errors that affect functionality
- **WARN**: For issues that don't stop execution but are concerning
- **INFO**: For general process information
- **DEBUG**: For detailed information useful during development
- **TRACE**: For very detailed step-by-step logging

## Testing

### Integration Testing

Focus on testing the full pipeline:

```typescript
// integration.ts
const TEST_CONFIG = {
  musicDirectory: path.join(__dirname, 'music'),
  sampleSize: 5,
  logLevel: LogLevel.DEBUG,
  batchProcessing: true,
  batchSize: 2,
  batchDelay: 1000,
};
```

### Artist-Specific Testing

Test with known artists/albums for targeted verification:

```typescript
// artist.test.ts
const ARTIST_TO_TEST = 'Childish Gambino';
const ALBUM_TO_TEST = 'Because the Internet [2013]';
```

## CLI Interface

### Command Structure

Use structured commands with options:

```typescript
program
  .argument('<directory>', 'Directory containing music files')
  .option('-r, --recursive', 'Scan directories recursively', true)
  .option('--no-skip-existing', 'Don\'t skip files that already have lyrics')
  .option('--overwrite', 'Overwrite existing lyrics files')
  .option('--log-level <level>', 'Log level (error, warn, info, debug, trace)')
  .option('--batch-size <size>', 'Number of files to process in parallel', '10')
```

### Progress Reporting

Use spinners and colored output for user feedback:

```typescript
const spinner = ora('Scanning directory...').start();
// ...
spinner.text = `Processing: ${processedCount}/${totalCount}`;
// ...
spinner.succeed(`Processed ${results.length} files`);
```

## API Design

### Public API

Keep the public API simple and focused:

```typescript
// Main exports
export function createLyricsFetcher(options?): LyricsFetcherOrchestrator;
export function fetchLyricsForDirectory(directory, options?): Promise<ProcessResult[]>;
```

### Method Chaining

Where appropriate, enable method chaining for fluent APIs:

```typescript
return new LyricsFetcherOrchestrator(options)
  .setLogLevel('debug')
  .processDirectory(musicPath);
```

## Dependency Management

### Core Dependencies

- Minimize external dependencies to reduce security risks and bundle size
- Document the purpose of each dependency in package.json
- Lock dependency versions for reproducible builds

### Dev Dependencies

- Keep development tools (TypeScript, ESLint, etc.) updated
- Use separate dev dependencies for testing, building, and linting

## Code Quality Tools

### Linting and Formatting

- Use ESLint for static code analysis
- Use Prettier for consistent code formatting
- Configure rules in .eslintrc and .prettierrc

### Pre-commit Hooks

- Use husky for pre-commit hooks
- Run linting and tests before allowing commits

## Configuration Management

### Environment Variables

- Use dotenv for environment-specific configuration
- Never commit sensitive values to version control

### Feature Flags

- Use configuration objects for feature flags
- Enable/disable features through options objects

## Performance Considerations

### Memory Efficiency

- Stream large files rather than loading them entirely into memory
- Release resources as soon as they're no longer needed

### Concurrency

- Use batch processing with configurable concurrency limits
- Implement rate limiting for API requests
- Use worker threads for CPU-intensive operations

## Security Considerations

### Input Validation

- Validate all user inputs, especially file paths
- Sanitize filenames and paths to prevent directory traversal attacks

### Dependency Auditing

- Regularly run `npm audit` to check for vulnerable dependencies
- Update dependencies to fix security issues

## Documentation

### Code Comments

Use JSDoc style comments for classes, methods, and interfaces:

```typescript
/**
 * Main orchestrator for the lyrics fetching process
 */
export class LyricsFetcherOrchestrator {
  /**
   * Process a directory of audio files to fetch lyrics
   */
  async processDirectory(...) { }
}
```

### Markdown Documentation

Maintain comprehensive markdown documentation:
- README.md - Overview and usage examples
- API documentation in docs/
- Standards in this document