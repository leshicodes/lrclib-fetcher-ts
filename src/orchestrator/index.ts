import { Logger, LogLevel, logger } from '../utils/logger';
import { scanDirectory } from '../scanner/fileScanner';
import { extractMetadata } from '../metadata/extractor';
import { LrcLibClient } from '../api/lrclib';
import { LyricsFileWriter } from '../writer/fileWriter';
import { 
  ScanOptions, 
  FetchOptions, 
  ProcessResult, 
  TrackMetadata,
  LoggingOptions,
  OrchestratorOptions
} from '../types';

/**
 * Main orchestrator for the lyrics fetching process
 */
export class LyricsFetcherOrchestrator {
  private lrcLibClient: LrcLibClient;
  private fileWriter: LyricsFileWriter;

  private mapLogLevel(level?: string): LogLevel {
    switch (level) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      case 'trace': return LogLevel.TRACE;
      default: return LogLevel.INFO;
    }
  }

  constructor(options: Partial<OrchestratorOptions> = {}) {
    // Configure logger if options provided
    if (options.logging) {
      Logger.configure({
        level: this.mapLogLevel(options.logging.level),
        useColors: options.logging.useColors,
        includeTimestamps: options.logging.includeTimestamps,
        outputToFile: options.logging.outputToFile
      });
    }

    this.lrcLibClient = new LrcLibClient(options.delayBetweenRequests);
    this.fileWriter = new LyricsFileWriter();

    logger.info('Orchestrator', 'Initialized LyricsFetcherOrchestrator');
  }

  /**
   * Process a directory of audio files to fetch lyrics
   */
  async processDirectory(
    directory: string,
    options: Partial<OrchestratorOptions> = {}
  ): Promise<ProcessResult[]> {
    // Default options
    const fullOptions: OrchestratorOptions = {
      recursive: true,
      skipExisting: true,
      extensions: ['mp3', 'flac', 'm4a', 'ogg', 'wav', 'wma'],
      overrideExisting: false,
      batchSize: 10,
      delayBetweenRequests: 1000,
      onProgress: undefined,
      ...options
    };

    // 1. Scan directory for audio files
    const audioFiles = await scanDirectory(directory, fullOptions);

    // 2. Process files in batches
    const results: ProcessResult[] = [];
    let processed = 0;

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < audioFiles.length; i += fullOptions.batchSize) {
      const batch = audioFiles.slice(i, i + fullOptions.batchSize);
      const batchPromises = batch.map(filePath => this.processAudioFile(filePath, fullOptions));
      const batchResults = await Promise.all(batchPromises);

      results.push(...batchResults);

      processed += batch.length;

      // Report progress if callback is provided
      if (fullOptions.onProgress) {
        fullOptions.onProgress(processed, audioFiles.length);
      }
    }

    return results;
  }

  /**
   * Process a single audio file
   */
  async processAudioFile(
    filePath: string,
    options: OrchestratorOptions
  ): Promise<ProcessResult> {
    try {
      // Check if we should skip this file
      if (options.skipExisting && !options.overrideExisting && this.fileWriter.lyricsFileExists(filePath)) {
        return {
          filePath,
          metadata: { artist: '', title: '' }, // We don't extract metadata for skipped files
          success: true,
          lyricPath: undefined // No new file was created
        };
      }

      // Extract metadata
      const metadata = await extractMetadata(filePath);

      // Check if we have enough metadata
      if (!metadata.artist || !metadata.title) {
        throw new Error('Insufficient metadata to search for lyrics');
      }

      // Search for lyrics
      const lyrics = await this.lrcLibClient.searchLyrics(metadata);

      if (!lyrics) {
        return {
          filePath,
          metadata,
          success: false,
          error: new Error('No lyrics found')
        };
      }

      // Delete existing lyrics if override mode is enabled
      if (options.overrideExisting) {
        await this.fileWriter.deleteExistingLyrics(filePath);
      }

      // Write lyrics to file
      const lyricPath = await this.fileWriter.writeLyrics(filePath, lyrics);

      // Call progress callback if provided
      if (options.onProgress) {
        options.onProgress(0, 0, {
          filePath,
          metadata,
          success: !!lyricPath,
          lyricPath
        });
      }

      return {
        filePath,
        metadata,
        success: !!lyricPath,
        lyricPath
      };
    } catch (error) {
      const result: ProcessResult = {
        filePath,
        metadata: { artist: '', title: '' } as TrackMetadata,
        success: false,
        error: error as Error
      };

      // Try to get metadata even if processing failed
      try {
        result.metadata = await extractMetadata(filePath);
      } catch {
        // Keep default metadata if extraction fails
      }

      // Call progress callback if provided
      if (options.onProgress) {
        options.onProgress(0, 0, result);
      }

      return result;
    }
  }
}