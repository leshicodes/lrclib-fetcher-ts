export * from './types';
export { LyricsFetcherOrchestrator } from './orchestrator/index';
export * from './scanner/fileScanner';
export * from './metadata/extractor';
export * from './api/lrclib';
export * from './writer/fileWriter';
export { Logger, LogLevel } from './utils/logger';

import { Logger, LogLevel } from './utils/logger';
import { OrchestratorOptions } from './types';
import { LyricsFetcherOrchestrator } from './orchestrator/index';


/**
 * Create a new lyrics fetcher instance
 */
export function createLyricsFetcher(options?: Partial<OrchestratorOptions>): LyricsFetcherOrchestrator {
  // Set default log level if not specified
  if (options && !options.logging) {
    options.logging = { level: 'info' };
  }
  return new LyricsFetcherOrchestrator(options);
}
/**
 * Convenience function to process a directory for lyrics
 */
export async function fetchLyricsForDirectory(directory: string, options?: Partial<OrchestratorOptions>) {
  const orchestrator = new LyricsFetcherOrchestrator();
  return orchestrator.processDirectory(directory, options);
}

// Initialize logger with default config
Logger.configure({
  level: LogLevel.INFO,
  useColors: true,
  includeTimestamps: true
});