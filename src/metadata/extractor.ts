import { exec } from 'child_process';
import path from 'path';
import util from 'util';
import ffprobe from 'ffprobe';
import ffprobeStatic from 'ffprobe-static';
import { TrackMetadata } from '../types/index';
import { logger } from '../utils/logger';

const execPromise = util.promisify(exec);

/**
 * Extract metadata from audio file using FFprobe
 */
export async function extractMetadata(filePath: string): Promise<TrackMetadata> {
  try {
    // Use direct ffprobe command execution for more reliable results
    const { stdout } = await execPromise(
      `"${ffprobeStatic.path}" -v quiet -print_format json -show_format "${filePath}"`
    );
    
    const data = JSON.parse(stdout);
    const tags = data.format.tags || {};

    logger.debug('MetadataExtractor', "Available tags:", JSON.stringify(tags, null, 2));

    // Extract metadata prioritizing proper tag names
    const metadata: TrackMetadata = {
      // Artist priority: album_artist > artist > performer
      artist: tags.album_artist || tags.ALBUMARTIST || tags.albumartist ||
              tags.ARTIST || tags.artist || tags.Artist ||
              tags.performer || tags.PERFORMER || '',
              
      // Title priority: title tags
      title: tags.TITLE || tags.title || tags.Title || '',
      
      // Album priority: album tags
      album: tags.ALBUM || tags.album || tags.Album,
      
      duration: data.format.duration ? parseFloat(data.format.duration) : undefined,
      year: tags.DATE || tags.date || tags.YEAR || tags.year,
      track: tags.track || tags.TRACK || tags.tracknumber || tags.TRACKNUMBER,
    };
    
    // If metadata is incomplete, try parsing from filename
    if (!metadata.artist || !metadata.title) {
      const filenameMetadata = parseFilename(filePath);
      metadata.artist = metadata.artist || filenameMetadata.artist;
      metadata.title = metadata.title || filenameMetadata.title;
    }
    
    return normalizeMetadata(metadata);
  } catch (error) {
    console.error(`Error extracting metadata from ${filePath}:`, error);
    // Fall back to filename parsing on FFprobe failure
    return normalizeMetadata(parseFilename(filePath));
  }
}

/**
 * Parse metadata from filename
 * Assumes common patterns like "Artist - Title" or "Artist - Album - Title"
 */
function parseFilename(filePath: string): TrackMetadata {
  const filename = path.basename(filePath, path.extname(filePath));
  
  // Remove leading track numbers like "01 " or "01. " or "01 - " from filename
  const withoutTrackNum = filename.replace(/^\d+[\s.-]+/, '');
  
  // Try to parse "Artist - Title" pattern
  const dashMatch = withoutTrackNum.match(/^(.+?)\s*-\s*(.+?)$/);
  if (dashMatch) {
    return {
      artist: dashMatch[1].trim(),
      title: dashMatch[2].trim(),
    };
  }
  
  // Try to parse "Artist - Album - Title" pattern
  const doubleDashMatch = withoutTrackNum.match(/^(.+?)\s*-\s*(.+?)\s*-\s*(.+?)$/);
  if (doubleDashMatch) {
    return {
      artist: doubleDashMatch[1].trim(),
      album: doubleDashMatch[2].trim(),
      title: doubleDashMatch[3].trim(),
    };
  }
  
  // If no pattern matches, use the whole filename as title
  return {
    artist: '',
    title: withoutTrackNum,
  };
}

/**
 * Normalize metadata to ensure consistent output
 */
function normalizeMetadata(metadata: TrackMetadata): TrackMetadata {
  return {
    artist: (metadata.artist || '').trim(),
    title: (metadata.title || '').trim(),
    album: metadata.album ? metadata.album.trim() : undefined,
    duration: metadata.duration,
    year: metadata.year,
    track: metadata.track,
  };
}