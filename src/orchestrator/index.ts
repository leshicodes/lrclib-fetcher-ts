import { Logger, LogLevel, logger } from '../utils/logger';
import { scanDirectory } from '../scanner/fileScanner';
import { extractMetadata } from '../metadata/extractor';
import { LrcLibClient } from '../api/lrclib';
import { LyricsFileWriter } from '../writer/fileWriter';
import {
  ProcessResult,
  TrackMetadata,
  OrchestratorOptions,
  ScanOptions
} from '../types';
import {MetadataExtractionError} from "../utils/errorHandling";
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
        useColors: true, // Default values if not provided
        includeTimestamps: true, // Default values if not provided
        outputToFile: options.logging.logFilePath
      });
    }

    this.lrcLibClient = new LrcLibClient();
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
    // Set default options with proper structure
    const defaultOptions: OrchestratorOptions = {
      logging: {
        level: 'info'
      },
      search: {
        allowTitleOnlySearch: false,
        preferSynced: true
      },
      file: {
        skipExisting: true,
        overwriteExisting: false
      },
      batch: {
        enabled: true,
        size: 10,
        delayMs: 1000
      }
    };

    // Merge options with defaults
    const mergedOptions: OrchestratorOptions = {
      logging: { ...defaultOptions.logging, ...options.logging },
      search: { ...defaultOptions.search, ...options.search },
      file: { ...defaultOptions.file, ...options.file },
      batch: { ...defaultOptions.batch, ...options.batch },
      onProgress: options.onProgress
    };

    // Convert to scan options format
    const scanOptions: ScanOptions = {
      recursive: true, // Default to true if not specified
      skipExisting: mergedOptions.file.skipExisting,
      extensions: ['mp3', 'flac', 'm4a', 'ogg', 'wav', 'wma']
    };

    // 1. Scan directory for audio files
    const audioFiles = await scanDirectory(directory, scanOptions);

    // 2. Process files in batches
    const results: ProcessResult[] = [];
    let processed = 0;

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < audioFiles.length; i += mergedOptions.batch.size) {
      const batch = audioFiles.slice(i, i + mergedOptions.batch.size);
      const batchPromises = batch.map(filePath => this.processAudioFile(filePath, mergedOptions));
      const batchResults = await Promise.all(batchPromises);

      results.push(...batchResults);

      processed += batch.length;

      // Report progress if callback is provided
      if (mergedOptions.onProgress) {
        mergedOptions.onProgress(processed, audioFiles.length);
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
      if (options.file.skipExisting && !options.file.overwriteExisting && this.fileWriter.lyricsFileExists(filePath)) {
        return {
          filePath,
          metadata: { artist: '', title: '', filepath: filePath }, // We don't extract metadata for skipped files
          success: true,
          lyricPath: undefined // No new file was created
        };
      }

      // Extract metadata
      const metadata = await extractMetadata(filePath);
      if (!metadata) {
        logger.debug('Orchestrator', `Skipping file with no metadata: ${filePath}`);
        throw new MetadataExtractionError(filePath, "skipped file with no metadata");
      }

      // Check if we have metadata at all
      if (!metadata) {
        throw new Error('Failed to extract metadata');
      }

      // Check if we have enough metadata
      if (!metadata.artist || !metadata.title) {
        throw new Error('Insufficient metadata to search for lyrics');
      }

      // Search for lyrics
      logger.info('Orchestrator', `Searching lyrics for: ${metadata.artist} - ${metadata.title}`);
      const lyrics = await this.lrcLibClient.searchLyrics(metadata, {
        allowTitleOnlySearch: options.search.allowTitleOnlySearch,
        preferSynced: options.search.preferSynced
      });

      if (!lyrics) {
        logger.info('Orchestrator', `No lyrics found for: ${metadata.artist} - ${metadata.title}`);
        return {
          filePath,
          metadata,
          success: false,
          error: new Error(`No lyrics found for: ${metadata.artist} - ${metadata.title}`)
        };
      }
      
      // Log successful lyric fetching
      logger.info('Orchestrator', `Found lyrics for: ${metadata.artist} - ${metadata.title} (${lyrics.syncedLyrics ? 'synchronized' : lyrics.plainLyrics ? 'plain' : 'instrumental'})`);
      

      // Delete existing lyrics if overwrite mode is enabled
      if (options.file.overwriteExisting) {
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
        metadata: { artist: '', title: '', filepath: filePath } as TrackMetadata,
        success: false,
        error: error as Error
      };

      // Try to get metadata even if processing failed
      try {
        const metadata = await extractMetadata(filePath);
        if (metadata) {
          result.metadata = metadata;
        }
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