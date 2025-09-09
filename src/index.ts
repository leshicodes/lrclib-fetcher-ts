export * from './types';
export * from './scanner/fileScanner';
export * from './metadata/extractor';
export * from './api/lrclib';
export * from './writer/fileWriter';
export * from './orchestrator/index';

import { LyricsFetcherOrchestrator, OrchestratorOptions } from './orchestrator/index';

/**
 * Create a new lyrics fetcher instance
 */
export function createLyricsFetcher(options?: Partial<OrchestratorOptions>): LyricsFetcherOrchestrator {
  return new LyricsFetcherOrchestrator(options);
}

/**
 * Convenience function to process a directory for lyrics
 */
export async function fetchLyricsForDirectory(directory: string, options?: Partial<OrchestratorOptions>) {
  const orchestrator = new LyricsFetcherOrchestrator();
  return orchestrator.processDirectory(directory, options);
}