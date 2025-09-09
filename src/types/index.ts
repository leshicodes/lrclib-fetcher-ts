export interface TrackMetadata {
  artist: string;
  title: string;
  album?: string;
  duration?: number;
  year?: string;
  track?: string | number;
}

export interface LyricResult {
  syncedLyrics?: string;  // LRC format with timestamps
  plainLyrics?: string;   // Text without timestamps
  instrumental: boolean;
  language?: string;
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