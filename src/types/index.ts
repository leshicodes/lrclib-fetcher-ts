export interface LoggingOptions {
  level?: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  useColors?: boolean;
  includeTimestamps?: boolean;
  outputToFile?: string;
}

// export interface OrchestratorOptions extends ScanOptions, FetchOptions {
//   onProgress?: (current: number, total: number, result?: ProcessResult) => void;
//   logging?: LoggingOptions;
// }

/**
 * Options for the lyrics fetcher orchestrator
 */
export interface OrchestratorOptions {
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
}

/**
 * Track metadata extracted from audio files
 */
export interface TrackMetadata {
  artist: string;
  title: string;
  album?: string;
  duration?: number;
  filepath: string;
}

/**
 * Result from a lyrics search
 */
export interface LyricResult {
  artist: string;
  title: string;
  album?: string;
  syncedLyrics: string | null;
  plainLyrics: string | null;
  source: string;
  instrumental: boolean;
}

export interface ProcessResult {
  filePath: string;
  metadata: TrackMetadata;
  success: boolean;
  lyricPath?: string;
  error?: Error;
}

export interface ScanOptions {
  recursive: boolean;
  skipExisting: boolean;
  extensions: string[];
}

export interface FetchOptions {
  overrideExisting: boolean;
  batchSize: number;
  delayBetweenRequests: number;
}

/**
 * Options for lyrics search
 */
export interface LyricSearchOptions {
  allowTitleOnlySearch?: boolean;
  preferSynced?: boolean;
}


/**
 * Processing result for a single file
 */
export interface FileProcessResult {
  filepath: string;
  success: boolean;
  metadata?: TrackMetadata;
  lyrics?: LyricResult;
  lyricsPath?: string;
  error?: string;
}