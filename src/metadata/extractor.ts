import ffprobe from 'ffprobe';
import ffprobeStatic from 'ffprobe-static';
import path from 'path';
import { logger } from '../utils/logger';
import { TrackMetadata } from '../types';
import { MetadataExtractionError } from '../utils/errorHandling';


// Tag name constants to avoid magic strings
const TAG_NAMES = {
  ARTIST: ['album_artist', 'ALBUMARTIST', 'albumartist', 'ARTIST', 'artist', 'Artist', 'performer', 'PERFORMER'],
  TITLE: ['TITLE', 'title', 'Title'],
  ALBUM: ['ALBUM', 'album', 'Album'],
  DURATION: ['duration', 'DURATION', 'Duration', 'length', 'LENGTH', 'Length'],
};

export class MetadataExtractor {
  /**
   * Extract metadata from an audio file
   */
  async extractMetadata(filePath: string): Promise<TrackMetadata | null> {
    try {
      logger.debug('MetadataExtractor', `Extracting metadata from: ${path.basename(filePath)}`);

      const data = await ffprobe(filePath, { path: ffprobeStatic.path });

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
      info.duration = Math.round(parseFloat(data.format.duration));
    }

    // Fallback to filename if no metadata available
    const filename = path.basename(filePath, path.extname(filePath));
    const filenameMatch = filename.match(/^(?:\d+\s+)?(?:(?<artist>.+?)\s+-\s+)?(?<title>.+?)$/);

    if (filenameMatch && filenameMatch.groups) {
      info.artist = filenameMatch.groups.artist || 'Unknown Artist';
      info.title = filenameMatch.groups.title || filename;
    } else {
      info.title = filename;
      info.artist = 'Unknown Artist';
    }

    return info;
  }

  /**
   * Extract tag information from ffprobe data
   */
  private extractTagInfo(data: any): Partial<TrackMetadata> {
    const info: Partial<TrackMetadata> = {};
    const tags: Record<string, string> = {};

    // Collect tags from format and streams
    if (data.format && data.format.tags) {
      Object.assign(tags, data.format.tags);
    }

    if (data.streams) {
      for (const stream of data.streams) {
        if (stream.tags) {
          Object.assign(tags, stream.tags);
        }
      }
    }

    // Extract artist
    for (const key of TAG_NAMES.ARTIST) {
      if (tags[key]) {
        info.artist = tags[key];
        break;
      }
    }

    // Extract title
    for (const key of TAG_NAMES.TITLE) {
      if (tags[key]) {
        info.title = tags[key];
        break;
      }
    }

    // Extract album
    for (const key of TAG_NAMES.ALBUM) {
      if (tags[key]) {
        info.album = tags[key];
        break;
      }
    }

    // Extract duration from tags if not already set
    if (!info.duration) {
      for (const key of TAG_NAMES.DURATION) {
        if (tags[key]) {
          const duration = parseFloat(tags[key]);
          if (!isNaN(duration)) {
            info.duration = Math.round(duration);
            break;
          }
        }
      }
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
    // Prefer tag info over basic info
    const metadata: TrackMetadata = {
      artist: tagInfo.artist || basicInfo.artist || 'Unknown Artist',
      title: tagInfo.title || basicInfo.title || path.basename(filePath, path.extname(filePath)),
      album: tagInfo.album || basicInfo.album || '',
      duration: tagInfo.duration || basicInfo.duration || 0,
      filepath: filePath
    };

    // Clean up metadata
    metadata.artist = metadata.artist.trim();
    metadata.title = metadata.title.trim();
    if (metadata.album) metadata.album = metadata.album.trim();

    return metadata;
  }
}

export async function extractMetadata(filePath: string): Promise<TrackMetadata | null> {
  const extractor = new MetadataExtractor();
  return extractor.extractMetadata(filePath);
}