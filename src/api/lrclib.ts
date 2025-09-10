import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
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
        'User-Agent': 'lrclib-fetcher-ts/0.0.1 (https://github.com/yourusername/lrclib-fetcher-ts)'
      }
    });
  }

  /**
 * Search for lyrics using track metadata
 */
  async searchLyrics(metadata: TrackMetadata, options?: LyricSearchOptions): Promise<LyricResult | null> {
    logger.debug('LrcLibClient', `Starting search for: "${metadata.artist} - ${metadata.title}"`);
    logger.debug('LrcLibClient', `Complete metadata: ${JSON.stringify(metadata)}`);

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

      logger.debug('LrcLibClient', `No lyrics found for: "${metadata.artist} - ${metadata.title}" after all search attempts`);
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
        artist_name: metadata.artist,           // FIXED: was "artist"
        track_name: metadata.title,             // FIXED: was "track" 
        album_name: metadata.album || '',       // FIXED: was "album"
        duration: metadata.duration?.toString() || ''
      });

      const requestUrl = `${this.apiUrl}?${params.toString()}`;
      logger.debug('LrcLibClient', `Making exact match request: ${requestUrl}`);
      logger.debug('LrcLibClient', `Request parameters: ${JSON.stringify({
        artist_name: metadata.artist,
        track_name: metadata.title,
        album_name: metadata.album || '',
        duration: metadata.duration?.toString() || ''
      })}`);

      try {
        const response = await this.httpClient.get(requestUrl);

        // Log response data
        logger.debug('LrcLibClient', `Response status: ${response.status}`);
        logger.debug('LrcLibClient', `Response data: ${JSON.stringify(response.data)}`);

        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          const result = this.processApiResponse(response.data[0], metadata);
          if (result) {
            logger.debug('LrcLibClient', `Found exact match for: "${metadata.artist} - ${metadata.title}"`);
            return result;
          }
        } else {
          logger.debug('LrcLibClient', `No results found in exact match`);
        }

        return null;
      } catch (error) {
        // Detailed error logging
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          logger.debug('LrcLibClient', `Axios error in exact match: ${axiosError.message}`);
          logger.debug('LrcLibClient', `Request URL: ${requestUrl}`);

          if (axiosError.response) {
            logger.debug('LrcLibClient', `Response status: ${axiosError.response.status}`);
            logger.debug('LrcLibClient', `Response headers: ${JSON.stringify(axiosError.response.headers)}`);
            logger.debug('LrcLibClient', `Response data: ${JSON.stringify(axiosError.response.data)}`);
          } else if (axiosError.request) {
            logger.debug('LrcLibClient', `No response received: ${JSON.stringify(axiosError.request)}`);
          }
        } else {
          logger.debug('LrcLibClient', `Non-Axios error in exact match: ${error instanceof Error ? error.message : String(error)}`);
        }
        throw error;
      }
    } catch (error) {
      logger.debug('LrcLibClient', `Error in exact match: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
  * Search by artist and title only
  */
  private async findByArtistAndTitle(metadata: TrackMetadata): Promise<LyricResult | null> {
    try {
      const params = new URLSearchParams({
        artist_name: metadata.artist,
        track_name: metadata.title
      });

      const requestUrl = `${this.apiUrl}?${params.toString()}`;
      logger.debug('LrcLibClient', `Making artist/title request: ${requestUrl}`);
      logger.debug('LrcLibClient', `Request parameters: ${JSON.stringify({
        artist_name: metadata.artist,
        track_name: metadata.title
      })}`);

      try {
        const response = await this.httpClient.get(requestUrl);

        // Log response data
        logger.debug('LrcLibClient', `Response status: ${response.status}`);
        logger.debug('LrcLibClient', `Response data: ${JSON.stringify(response.data)}`);

        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          const result = this.processApiResponse(response.data[0], metadata);
          if (result) {
            logger.debug('LrcLibClient', `Found artist/title match for: "${metadata.artist} - ${metadata.title}"`);
            return result;
          }
        } else {
          logger.debug('LrcLibClient', `No results found in artist/title search`);
        }

        return null;
      } catch (error) {
        // Detailed error logging
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          logger.debug('LrcLibClient', `Axios error in artist/title search: ${axiosError.message}`);
          logger.debug('LrcLibClient', `Request URL: ${requestUrl}`);

          if (axiosError.response) {
            logger.debug('LrcLibClient', `Response status: ${axiosError.response.status}`);
            logger.debug('LrcLibClient', `Response headers: ${JSON.stringify(axiosError.response.headers)}`);
            logger.debug('LrcLibClient', `Response data: ${JSON.stringify(axiosError.response.data)}`);
          } else if (axiosError.request) {
            logger.debug('LrcLibClient', `No response received: ${JSON.stringify(axiosError.request)}`);
          }
        } else {
          logger.debug('LrcLibClient', `Non-Axios error in artist/title search: ${error instanceof Error ? error.message : String(error)}`);
        }
        throw error;
      }
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
        track_name: metadata.title
      });

      const requestUrl = `${this.apiUrl}?${params.toString()}`;
      logger.debug('LrcLibClient', `Making title-only request: ${requestUrl}`);
      logger.debug('LrcLibClient', `Request parameters: ${JSON.stringify({
        track_name: metadata.title
      })}`);

      try {
        const response = await this.httpClient.get(requestUrl);

        // Log response data
        logger.debug('LrcLibClient', `Response status: ${response.status}`);
        logger.debug('LrcLibClient', `Response data: ${JSON.stringify(response.data)}`);

        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          // For title-only searches, we should be more careful with the results
          logger.debug('LrcLibClient', `Found ${response.data.length} results for title-only search: "${metadata.title}"`);
          const bestMatch = this.findBestMatch(response.data, metadata);
          if (bestMatch) {
            logger.debug('LrcLibClient', `Selected best match: ${JSON.stringify({
              artist: bestMatch.artistName,
              title: bestMatch.trackName,
              album: bestMatch.albumName
            })}`);
            const result = this.processApiResponse(bestMatch, metadata);
            if (result) {
              logger.debug('LrcLibClient', `Found title-only match for: "${metadata.title}"`);
              return result;
            }
          } else {
            logger.debug('LrcLibClient', `No best match found among ${response.data.length} results`);
          }
        } else {
          logger.debug('LrcLibClient', `No results found in title-only search`);
        }

        return null;
      } catch (error) {
        // Detailed error logging
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          logger.debug('LrcLibClient', `Axios error in title-only search: ${axiosError.message}`);
          logger.debug('LrcLibClient', `Request URL: ${requestUrl}`);

          if (axiosError.response) {
            logger.debug('LrcLibClient', `Response status: ${axiosError.response.status}`);
            logger.debug('LrcLibClient', `Response headers: ${JSON.stringify(axiosError.response.headers)}`);
            logger.debug('LrcLibClient', `Response data: ${JSON.stringify(axiosError.response.data)}`);
          } else if (axiosError.request) {
            logger.debug('LrcLibClient', `No response received: ${JSON.stringify(axiosError.request)}`);
          }
        } else {
          logger.debug('LrcLibClient', `Non-Axios error in title-only search: ${error instanceof Error ? error.message : String(error)}`);
        }
        throw error;
      }
    } catch (error) {
      logger.debug('LrcLibClient', `Error in title-only search: ${error instanceof Error ? error.message : String(error)}`);
      throw new LyricsFetchError(metadata.artist, metadata.title, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Find the best match from multiple results
   */
  private findBestMatch(results: any[], metadata: TrackMetadata): any {
    logger.debug('LrcLibClient', `Finding best match among ${results.length} results for "${metadata.artist} - ${metadata.title}"`);

    // First look for artist name similarity
    const artistMatches = results.filter(result => {
      const resultArtist = result.artistName?.toLowerCase() || '';
      const searchArtist = metadata.artist.toLowerCase();
      const isMatch = resultArtist.includes(searchArtist) || searchArtist.includes(resultArtist);
      logger.debug('LrcLibClient', `Artist match check: "${resultArtist}" vs "${searchArtist}" = ${isMatch}`);
      return isMatch;
    });

    if (artistMatches.length > 0) {
      logger.debug('LrcLibClient', `Found ${artistMatches.length} artist matches, selecting first match`);
      return artistMatches[0];
    }

    // If no artist matches, just take the first result
    logger.debug('LrcLibClient', `No artist matches found, falling back to first result`);
    return results[0];
  }


  /**
   * Process API response into standardized LyricResult
   */
  private processApiResponse(data: any, metadata: TrackMetadata): LyricResult | null {
    if (!data) {
      logger.debug('LrcLibClient', `Cannot process API response: data is null or undefined`);
      return null;
    }

    const result = {
      artist: data.artistName || metadata.artist,
      title: data.trackName || metadata.title,
      album: data.albumName || metadata.album || '',
      syncedLyrics: data.syncedLyrics || null,
      plainLyrics: data.plainLyrics || null,
      source: 'lrclib.net',
      instrumental: !!data.instrumental
    };

    logger.debug('LrcLibClient', `Processed API response: ${JSON.stringify({
      artist: result.artist,
      title: result.title,
      album: result.album,
      hasSyncedLyrics: !!result.syncedLyrics,
      hasPlainLyrics: !!result.plainLyrics,
      instrumental: result.instrumental
    })}`);

    return result;
  }
}