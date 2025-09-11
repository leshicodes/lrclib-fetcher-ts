import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { logger } from '../utils/logger';
import { TrackMetadata, LyricResult, LyricSearchOptions } from '../types';
import { LyricsFetchError } from '../utils/errorHandling';
import path from 'path';
import fs from 'fs';

export interface HttpClient {
  get(url: string, config?: any): Promise<any>;
}

/*
* Load package info for User-Agent and repo URL
*/
function getPackageInfo() {
  try {
    // Read package.json from the project root
    const packageJsonPath = path.resolve(__dirname, '../../package.json');
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);

    return {
      name: packageJson.name,
      version: packageJson.version,
      repoUrl: packageJson.repository?.url ||
        packageJson.homepage ||
        'https://github.com/leshicodes/lrclib-fetcher-ts'
    };
  } catch (error) {
    // Fallback to hardcoded values if package.json can't be read
    logger.warn('LrcLibClient', `Failed to read package.json: ${error instanceof Error ? error.message : String(error)}`);
    return {
      name: 'lrclib-fetcher-ts',
      version: '0.0.1',
      repoUrl: 'https://github.com/leshicodes/lrclib-fetcher-ts'
    };
  }
}


/**
 * LrcLib API client for fetching lyrics
 */
export class LrcLibClient {
  private readonly apiUrl = 'https://lrclib.net/api/get';
  private readonly httpClient: HttpClient;

  constructor(httpClient?: HttpClient) {
    const { name, version, repoUrl } = getPackageInfo();
    const userAgent = `${name}/${version} (${repoUrl})`;

    logger.debug('LrcLibClient', `Using User-Agent: ${userAgent}`);

    this.httpClient = httpClient || axios.create({
      headers: {
        'User-Agent': userAgent
      }
    });
  }

  /**
 * Search for lyrics using track metadata
 */
  async searchLyrics(metadata: TrackMetadata, options?: LyricSearchOptions): Promise<LyricResult | null> {
    logger.debug('LrcLibClient', `Starting search for: "${metadata.artist} - ${metadata.title}"`);
    logger.debug('LrcLibClient', `Complete metadata: ${JSON.stringify(metadata)}`);
    logger.debug('LrcLibClient', `Search options: ${JSON.stringify(options || {})}`);

    const preferSynced = options?.preferSynced !== false; // Default to true if not specified

    try {
      // Variables to store results for potential fallback use
      let exactMatch: LyricResult | null = null;
      let artistTitleMatch: LyricResult | null = null;
      let titleMatch: LyricResult | null = null;

      // Try exact match first
      exactMatch = await this.findExactMatch(metadata);
      if (exactMatch) {
        if (preferSynced && !exactMatch.syncedLyrics && !exactMatch.instrumental) {
          logger.debug('LrcLibClient', `Found exact match but no synced lyrics, continuing search...`);
          // Continue searching if we prefer synced lyrics but didn't find any
        } else {
          return exactMatch;
        }
      }

      // Try artist and title match
      artistTitleMatch = await this.findByArtistAndTitle(metadata);
      if (artistTitleMatch) {
        if (preferSynced && !artistTitleMatch.syncedLyrics && !artistTitleMatch.instrumental) {
          logger.debug('LrcLibClient', `Found artist/title match but no synced lyrics, continuing search...`);
          // Continue searching if we prefer synced lyrics but didn't find any
        } else {
          return artistTitleMatch;
        }
      }

      // Try title-only search as last resort
      if (options?.allowTitleOnlySearch) {
        titleMatch = await this.findByTitleOnly(metadata);
        if (titleMatch) {
          if (preferSynced && !titleMatch.syncedLyrics && !titleMatch.instrumental) {
            logger.debug('LrcLibClient', `Found title-only match but no synced lyrics, will use as fallback`);
            // For title-only, if we don't have synced lyrics, keep the result as fallback
          } else {
            return titleMatch;
          }
        }
      }

      // If we got here and have a non-synced match that we skipped earlier, return it as last resort
      if (exactMatch) {
        logger.debug('LrcLibClient', `Using non-synced exact match as fallback`);
        return exactMatch;
      } else if (artistTitleMatch) {
        logger.debug('LrcLibClient', `Using non-synced artist/title match as fallback`);
        return artistTitleMatch;
      } else if (titleMatch) {
        logger.debug('LrcLibClient', `Using non-synced title-only match as fallback`);
        return titleMatch;
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
        logger.debug('LrcLibClient', `Response data type: ${typeof response.data}`);
        logger.debug('LrcLibClient', `Response data: ${JSON.stringify(response.data)}`);

        // Handle both array and single object responses
        if (response.data) {
          if (Array.isArray(response.data)) {
            // Handle array response
            if (response.data.length > 0) {
              logger.debug('LrcLibClient', `Found ${response.data.length} results in array response`);
              const result = this.processApiResponse(response.data[0], metadata);
              if (result) {
                logger.debug('LrcLibClient', `Successfully processed result for: "${metadata.artist} - ${metadata.title}"`);
                return result;
              }
            } else {
              logger.debug('LrcLibClient', `Empty array response for exact match`);
            }
          } else if (typeof response.data === 'object') {
            // Handle single object response
            logger.debug('LrcLibClient', `Found single object response`);
            const result = this.processApiResponse(response.data, metadata);
            if (result) {
              logger.debug('LrcLibClient', `Successfully processed single object result for: "${metadata.artist} - ${metadata.title}"`);
              return result;
            }
          } else if (response.data === null) {
            // Handle null response (might be returned as 200 OK with null data)
            logger.debug('LrcLibClient', `Received null data in response`);
          }
        } else {
          logger.debug('LrcLibClient', `No data in response for exact match`);
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
        logger.debug('LrcLibClient', `Response data type: ${typeof response.data}`);
        logger.debug('LrcLibClient', `Response data: ${JSON.stringify(response.data)}`);

        // Handle both array and single object responses
        if (response.data) {
          if (Array.isArray(response.data)) {
            // Handle array response
            if (response.data.length > 0) {
              logger.debug('LrcLibClient', `Found ${response.data.length} results in array response`);
              const result = this.processApiResponse(response.data[0], metadata);
              if (result) {
                logger.debug('LrcLibClient', `Successfully processed result for: "${metadata.artist} - ${metadata.title}"`);
                return result;
              }
            } else {
              logger.debug('LrcLibClient', `Empty array response for artist/title search`);
            }
          } else if (typeof response.data === 'object') {
            // Handle single object response
            logger.debug('LrcLibClient', `Found single object response`);
            const result = this.processApiResponse(response.data, metadata);
            if (result) {
              logger.debug('LrcLibClient', `Successfully processed single object result for: "${metadata.artist} - ${metadata.title}"`);
              return result;
            }
          } else if (response.data === null) {
            // Handle null response (might be returned as 200 OK with null data)
            logger.debug('LrcLibClient', `Received null data in response`);
          }
        } else {
          logger.debug('LrcLibClient', `No data in response for artist/title search`);
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
        logger.debug('LrcLibClient', `Response data type: ${typeof response.data}`);
        logger.debug('LrcLibClient', `Response data: ${JSON.stringify(response.data)}`);

        // Handle both array and single object responses
        if (response.data) {
          if (Array.isArray(response.data)) {
            // Handle array response
            if (response.data.length > 0) {
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
              logger.debug('LrcLibClient', `Empty array response for title-only search`);
            }
          } else if (typeof response.data === 'object') {
            // Handle single object response
            logger.debug('LrcLibClient', `Found single object response for title-only search`);
            const result = this.processApiResponse(response.data, metadata);
            if (result) {
              logger.debug('LrcLibClient', `Successfully processed single object result for title-only search: "${metadata.title}"`);
              return result;
            }
          } else if (response.data === null) {
            // Handle null response (might be returned as 200 OK with null data)
            logger.debug('LrcLibClient', `Received null data in title-only response`);
          }
        } else {
          logger.debug('LrcLibClient', `No data in response for title-only search`);
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

    // Check if it's an empty object
    if (typeof data === 'object' && Object.keys(data).length === 0) {
      logger.debug('LrcLibClient', `Cannot process API response: data is an empty object`);
      return null;
    }

    // Log raw response data for debugging
    logger.debug('LrcLibClient', `Processing raw API data: ${JSON.stringify(data)}`);

    // Handle different field name possibilities for artist
    const artist =
      data.artistName ||
      data.artist_name ||
      data.artist ||
      metadata.artist;

    // Handle different field name possibilities for title
    const title =
      data.trackName ||
      data.track_name ||
      data.title ||
      metadata.title;

    // Handle different field name possibilities for album
    const album =
      data.albumName ||
      data.album_name ||
      data.album ||
      metadata.album ||
      '';

    // Handle different field name possibilities for lyrics
    const syncedLyrics =
      data.syncedLyrics ||
      data.synced_lyrics ||
      data.lrc ||
      null;

    const plainLyrics =
      data.plainLyrics ||
      data.plain_lyrics ||
      data.text ||
      null;

    // Check if we have any lyrics at all
    if (!syncedLyrics && !plainLyrics && !data.instrumental) {
      logger.debug('LrcLibClient', `No lyrics content in API response`);
      return null;
    }

    const result = {
      artist,
      title,
      album,
      syncedLyrics,
      plainLyrics,
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