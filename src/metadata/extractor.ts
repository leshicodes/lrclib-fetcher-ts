import ffprobe from 'ffprobe';
import { execFile } from 'child_process';
import { promisify } from 'util';
import ffprobeStatic from 'ffprobe-static';
import path from 'path';
import { logger } from '../utils/logger';
import { TrackMetadata } from '../types';
import { MetadataExtractionError } from '../utils/errorHandling';

// Audio file extensions - add this constant
const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.m4a', '.ogg', '.wav', '.wma'];

// Tag name constants to avoid magic strings
const TAG_NAMES = {
  ARTIST: ['album_artist', 'ALBUMARTIST', 'albumartist', 'ARTIST', 'artist', 'Artist', 'performer', 'PERFORMER'],
  TITLE: ['TITLE', 'title', 'Title'],
  ALBUM: ['ALBUM', 'album', 'Album'],
  DURATION: ['duration', 'DURATION', 'Duration', 'length', 'LENGTH', 'Length'],
};


const execFileAsync = promisify(execFile);

export class MetadataExtractor {
  /**
   * Extract metadata from an audio file
   */
  async extractMetadata(filePath: string): Promise<TrackMetadata | null> {
    try {
      // Add extension check - reject non-audio files
      const ext = path.extname(filePath).toLowerCase();
      if (!AUDIO_EXTENSIONS.includes(ext)) {
        logger.debug('MetadataExtractor', `Skipping non-audio file: ${path.basename(filePath)}`);
        throw new MetadataExtractionError(filePath, 'not an audio file');
      }

      logger.debug('MetadataExtractor', `Extracting metadata from: ${path.basename(filePath)}`);

      // Run ffprobe directly using child_process
      const { stdout } = await execFileAsync(ffprobeStatic.path, [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ]);

      const data = JSON.parse(stdout);

      logger.debug('MetadataExtractor', `Raw ffprobe output: ${JSON.stringify(data, null, 2)}`);

      // Verify this is actually an audio file by checking for audio streams
      const hasAudioStream = data.streams && data.streams.some(stream => stream.codec_type === 'audio');
      if (!hasAudioStream) {
        logger.debug('MetadataExtractor', `No audio stream found in file: ${path.basename(filePath)}`);
        throw new MetadataExtractionError(filePath, 'no audio stream found');
      }

      // Extract the basic information
      const basicInfo = this.extractBasicInfo(data, filePath);

      // Extract additional tags if available
      const tagInfo = this.extractTagInfo(data);

      // Merge and normalize metadata
      const metadata = this.normalizeMetadata(basicInfo, tagInfo, filePath);

      logger.debug('MetadataExtractor', `Extracted metadata: "${metadata.artist} - ${metadata.title}"`);
      return metadata;
    } catch (error) {
      logger.error('MetadataExtractor', `Failed to extract metadata from ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
      // return null; // Return null instead of throwing an error to continue processing other files
      throw new MetadataExtractionError(filePath, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Extract basic information from ffprobe data
   */
  private extractBasicInfo(data: any, filePath: string): Partial<TrackMetadata> {
    const info: Partial<TrackMetadata> = {};

    // Get duration from format section
    if (data.format && data.format.duration) {
      info.duration = parseFloat(data.format.duration);
    }

    // Fallback to filename if no metadata available
    const filename = path.basename(filePath, path.extname(filePath));

    // DON'T look for cover.jpg in the filename regex
    const filenameMatch = filename.match(/^(?:\d+\s+)?(?:(?<artist>.+?)\s+-\s+)?(?<title>.+?)$/);

    if (filenameMatch && filenameMatch.groups) {
      if (filenameMatch.groups.artist) {
        info.artist = filenameMatch.groups.artist.trim();
      }

      if (filenameMatch.groups.title) {
        const title = filenameMatch.groups.title.trim();
        // Make sure we're not picking up "cover.jpg" here
        if (!title.toLowerCase().includes('cover.jpg')) {
          info.title = title;
        } else {
          // Just use the raw filename without trying to parse
          info.title = filename;
        }
      }
    } else {
      // If we can't parse, use the whole filename
      info.title = filename;
    }

    return info;
  }

  /**
   * Extract tag information from ffprobe data
   */
  private extractTagInfo(data: any): Partial<TrackMetadata> {
    const info: Partial<TrackMetadata> = {};
    const formatTags: Record<string, string> = {};
    const streamTags: Record<string, string> = {};

    // First collect format tags - these should have higher priority
    if (data.format && data.format.tags) {
      logger.debug('MetadataExtractor', `Format tags found: ${JSON.stringify(data.format.tags)}`);
      Object.assign(formatTags, data.format.tags);
    }

    // Then collect audio stream tags as fallback
    if (data.streams) {
      for (const stream of data.streams) {
        if (stream.codec_type === 'audio' && stream.tags) {
          logger.debug('MetadataExtractor', `Audio stream tags: ${JSON.stringify(stream.tags)}`);
          Object.assign(streamTags, stream.tags);
        }
      }
    }

    // Debug the collected tags
    logger.debug('MetadataExtractor', `Format tags: ${JSON.stringify(formatTags)}`);
    logger.debug('MetadataExtractor', `Stream tags: ${JSON.stringify(streamTags)}`);

    // Extract title - try format tags first, then stream tags
    for (const key of TAG_NAMES.TITLE) {
      if (formatTags[key]) {
        info.title = formatTags[key];
        logger.debug('MetadataExtractor', `Found title in format tags: ${info.title}`);
        break;
      }
    }

    // Only use stream tags for title if format tags didn't have it
    if (!info.title) {
      for (const key of TAG_NAMES.TITLE) {
        if (streamTags[key] && !streamTags[key].toLowerCase().includes('cover') &&
          !streamTags[key].toLowerCase().includes('.jpg')) {
          info.title = streamTags[key];
          logger.debug('MetadataExtractor', `Found title in stream tags: ${info.title}`);
          break;
        }
      }
    }

    // Extract artist - try format tags first, then stream tags
    for (const key of TAG_NAMES.ARTIST) {
      if (formatTags[key]) {
        info.artist = formatTags[key];
        logger.debug('MetadataExtractor', `Found artist in format tags: ${info.artist}`);
        break;
      }
    }

    // Only use stream tags for artist if format tags didn't have it
    if (!info.artist) {
      for (const key of TAG_NAMES.ARTIST) {
        if (streamTags[key]) {
          info.artist = streamTags[key];
          logger.debug('MetadataExtractor', `Found artist in stream tags: ${info.artist}`);
          break;
        }
      }
    }

    // Extract album - from format tags only, usually not in streams
    for (const key of TAG_NAMES.ALBUM) {
      if (formatTags[key]) {
        info.album = formatTags[key];
        break;
      }
    }

    // Extract duration from format section if available
    if (data.format && data.format.duration) {
      info.duration = parseFloat(data.format.duration);
    }

    return info;
  }


  /**
   * Normalize and merge metadata
   */
  private normalizeMetadata(
    basicInfo: Partial<TrackMetadata>,
    tagInfo: Partial<TrackMetadata>,
    filePath: string
  ): TrackMetadata {
    // Debug what we're getting from each source
    logger.debug('MetadataExtractor', `Basic info: ${JSON.stringify(basicInfo)}`);
    logger.debug('MetadataExtractor', `Tag info: ${JSON.stringify(tagInfo)}`);

    // Special handling for suspicious title values
    if (tagInfo.title &&
      (tagInfo.title.toLowerCase().includes('.jpg') ||
        tagInfo.title.toLowerCase().includes('.png') ||
        tagInfo.title.toLowerCase().includes('cover'))) {
      logger.warn('MetadataExtractor', `Detected suspicious title in metadata: "${tagInfo.title}"`);
    }

    // Create a merged object with tag info taking priority
    const metadata: TrackMetadata = {
      artist: tagInfo.artist || basicInfo.artist || 'Unknown Artist',
      title: tagInfo.title || basicInfo.title || path.basename(filePath, path.extname(filePath)),
      album: tagInfo.album || basicInfo.album || '',
      duration: tagInfo.duration || basicInfo.duration || 0,
      filepath: filePath
    };

    if (metadata.title.toLowerCase().includes('cover.jpg')) {
      logger.warn('MetadataExtractor', `WARNING: Title contains "cover.jpg" for file: ${filePath}`);
      logger.debug('MetadataExtractor', `Raw ffprobe data: ${JSON.stringify(metadata)}`);
    }

    // Make sure we're not accidentally picking up "cover.jpg" anywhere
    if (metadata.title && metadata.title.toLowerCase().includes('cover.jpg')) {
      // This is incorrect - replace with just the filename without extension

      metadata.title = path.basename(filePath, path.extname(filePath));
      logger.debug('MetadataExtractor', `Fixed incorrect title containing "cover.jpg": ${metadata.title}`);
    }

    return metadata;
  }
}

export async function extractMetadata(filePath: string): Promise<TrackMetadata | null> {
  const extractor = new MetadataExtractor();
  return extractor.extractMetadata(filePath);
}