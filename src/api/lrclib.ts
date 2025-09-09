import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { logger } from '../utils/logger';
import { TrackMetadata, LyricResult, LyricSearchOptions } from '../types';
import { LyricsFetchError } from '../utils/errorHandling';

export interface HttpClient {
  get(url: string, config?: any): Promise<any>;
}


// // API base URLs
// const SEARCH_API_URL = 'https://lrclib.net/api/search';
// const GET_API_URL = 'https://lrclib.net/api/get';

// // Rate limiting settings
// const DEFAULT_DELAY_MS = 1000;

/**
 * LrcLib API client for fetching lyrics
 */
export class LrcLibClient {
  private readonly apiUrl = 'https://lrclib.net/api/get';
  private readonly httpClient: HttpClient;
  
  constructor(httpClient?: HttpClient) {
    this.httpClient = httpClient || axios.create({
      headers: {
        'User-Agent': 'lrclib-fetcher-ts/0.1.0 (https://github.com/yourusername/lrclib-fetcher-ts)'
      }
    });
  }

  /**
 * Search for lyrics using track metadata
 */
  async searchLyrics(metadata: TrackMetadata, options?: LyricSearchOptions): Promise<LyricResult | null> {
    logger.debug('LrcLibClient', `Searching lyrics for: "${metadata.artist} - ${metadata.title}"`);

    try {
      // Try exact match first
      const exactMatch = await this.findExactMatch(metadata);
      if (exactMatch) return exactMatch;

      // Try artist and title match
      const artistTitleMatch = await this.findByArtistAndTitle(metadata);
      if (artistTitleMatch) return artistTitleMatch;

      // Try title-only search as last resort
      if (options?.allowTitleOnlySearch) {
        const titleMatch = await this.findByTitleOnly(metadata);
        if (titleMatch) return titleMatch;
      }

      logger.debug('LrcLibClient', `No lyrics found for: "${metadata.artist} - ${metadata.title}"`);
      return null;
    } catch (error) {
      logger.error('LrcLibClient', `Error searching lyrics: ${error instanceof Error ? error.message : String(error)}`);
      throw new LyricsFetchError(metadata.artist, metadata.title, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Try to find an exact match for the track
   */
  private async findExactMatch(metadata: TrackMetadata): Promise<LyricResult | null> {
    try {
      const params = new URLSearchParams({
        artist: metadata.artist,
        track: metadata.title,
        album: metadata.album || '',
        duration: metadata.duration?.toString() || ''
      });

      const response = await this.httpClient.get(`${this.apiUrl}?${params.toString()}`);

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const result = this.processApiResponse(response.data[0], metadata);
        if (result) {
          logger.debug('LrcLibClient', `Found exact match for: "${metadata.artist} - ${metadata.title}"`);
          return result;
        }
      }

      return null;
    } catch (error) {
      logger.debug('LrcLibClient', `Error in exact match: ${error instanceof Error ? error.message : String(error)}`);
      throw new LyricsFetchError(metadata.artist, metadata.title, error instanceof Error ? error.message : String(error));
    }
  }

  /**
  * Search by artist and title only
  */
  private async findByArtistAndTitle(metadata: TrackMetadata): Promise<LyricResult | null> {
    try {
      const params = new URLSearchParams({
        artist: metadata.artist,
        track: metadata.title
      });

      const response = await this.httpClient.get(`${this.apiUrl}?${params.toString()}`);

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const result = this.processApiResponse(response.data[0], metadata);
        if (result) {
          logger.debug('LrcLibClient', `Found artist/title match for: "${metadata.artist} - ${metadata.title}"`);
          return result;
        }
      }

      return null;
    } catch (error) {
      logger.debug('LrcLibClient', `Error in artist/title search: ${error instanceof Error ? error.message : String(error)}`);
      throw new LyricsFetchError(metadata.artist, metadata.title, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Search by title only as a last resort
   */
  private async findByTitleOnly(metadata: TrackMetadata): Promise<LyricResult | null> {
    try {
      const params = new URLSearchParams({
        track: metadata.title
      });

      const response = await this.httpClient.get(`${this.apiUrl}?${params.toString()}`);

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        // For title-only searches, we should be more careful with the results
        const bestMatch = this.findBestMatch(response.data, metadata);
        if (bestMatch) {
          const result = this.processApiResponse(bestMatch, metadata);
          if (result) {
            logger.debug('LrcLibClient', `Found title-only match for: "${metadata.title}"`);
            return result;
          }
        }
      }

      return null;
    } catch (error) {
      logger.debug('LrcLibClient', `Error in title-only search: ${error instanceof Error ? error.message : String(error)}`);
      throw new LyricsFetchError(metadata.artist, metadata.title, error instanceof Error ? error.message : String(error));

    }
  }

  /**
   * Find the best match from multiple results
   */
  private findBestMatch(results: any[], metadata: TrackMetadata): any {
    // First look for artist name similarity
    const artistMatches = results.filter(result => {
      const resultArtist = result.artistName?.toLowerCase() || '';
      const searchArtist = metadata.artist.toLowerCase();
      return resultArtist.includes(searchArtist) || searchArtist.includes(resultArtist);
    });

    if (artistMatches.length > 0) {
      return artistMatches[0];
    }

    // If no artist matches, just take the first result
    return results[0];
  }

  /**
   * Process API response into standardized LyricResult
   */
  private processApiResponse(data: any, metadata: TrackMetadata): LyricResult | null {
    if (!data) return null;

    return {
      artist: data.artistName || metadata.artist,
      title: data.trackName || metadata.title,
      album: data.albumName || metadata.album || '',
      syncedLyrics: data.syncedLyrics || null,
      plainLyrics: data.plainLyrics || null,
      source: 'lrclib.net',
      instrumental: !!data.instrumental
    };
  }
}