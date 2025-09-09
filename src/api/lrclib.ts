import axios from 'axios';
import { logger } from '../utils/logger';
import { TrackMetadata, LyricResult } from '../types';

// API base URLs
const SEARCH_API_URL = 'https://lrclib.net/api/search';
const GET_API_URL = 'https://lrclib.net/api/get';

// Rate limiting settings
const DEFAULT_DELAY_MS = 1000;

/**
 * LrcLib API client for fetching lyrics
 */
export class LrcLibClient {
  private lastRequestTime: number = 0;
  private delayBetweenRequests: number;

  constructor(delayBetweenRequests: number = DEFAULT_DELAY_MS) {
    this.delayBetweenRequests = delayBetweenRequests;
  }

  /**
   * Search for lyrics using track metadata
   */
  async searchLyrics(metadata: TrackMetadata): Promise<LyricResult | null> {
    try {
      await this.applyRateLimit();

      logger.info('LrcLibClient', `Searching for: ${metadata.artist} - ${metadata.title}`);

      // First try the exact match endpoint
      if (metadata.duration) {
        try {
          const exactParams = {
            artist_name: metadata.artist,
            track_name: metadata.title,
            album_name: metadata.album || undefined,
            duration: metadata.duration ? Math.round(metadata.duration) : undefined,
          };

          logger.debug('LrcLibClient', "Trying exact match", exactParams);
          const exactResponse = await axios.get(GET_API_URL, { params: exactParams });

          if (exactResponse.data && !exactResponse.data.code) {
            const result = exactResponse.data;
            logger.info('LrcLibClient', "Found exact match!");

            return {
              syncedLyrics: result.syncedLyrics || undefined,
              plainLyrics: result.plainLyrics || undefined,
              instrumental: result.instrumental || false,
              language: result.language,
            };
          }
        } catch (error) {
          logger.debug('LrcLibClient', "No exact match found, trying search...");
        }
      }

      // If exact match fails, try the search endpoint
      const searchParams = {
        artist_name: metadata.artist,
        track_name: metadata.title,
        album_name: metadata.album || undefined,
      };

      logger.debug('LrcLibClient', "Trying search with:", searchParams);
      const response = await axios.get(SEARCH_API_URL, { params: searchParams });

      // No results found
      if (!response.data || response.data.length === 0) {
        // Try one more search with just the title and artist combined in q parameter
        const fallbackParams = {
          q: `${metadata.artist} ${metadata.title}`,
        };

        logger.debug('LrcLibClient', "Trying fallback search with:", fallbackParams);
        const fallbackResponse = await axios.get(SEARCH_API_URL, { params: fallbackParams });

        if (!fallbackResponse.data || fallbackResponse.data.length === 0) {
          return null;
        }

        const results = fallbackResponse.data;
        const syncedResult = results.find((r: any) => r.syncedLyrics);
        const plainResult = results.find((r: any) => r.plainLyrics);

        const bestResult = syncedResult || plainResult;
        if (!bestResult) return null;

        return {
          syncedLyrics: bestResult.syncedLyrics || undefined,
          plainLyrics: bestResult.plainLyrics || undefined,
          instrumental: bestResult.instrumental || false,
          language: bestResult.language,
        };
      }

      // Find best match - prioritize synced lyrics
      const results = response.data;
      const syncedResult = results.find((r: any) => r.syncedLyrics);
      const plainResult = results.find((r: any) => r.plainLyrics);

      const bestResult = syncedResult || plainResult;
      if (!bestResult) return null;

      return {
        syncedLyrics: bestResult.syncedLyrics || undefined,
        plainLyrics: bestResult.plainLyrics || undefined,
        instrumental: bestResult.instrumental || false,
        language: bestResult.language,
      };
    } catch (error) {
      logger.error('LrcLibClient', `Error fetching lyrics for ${metadata.artist} - ${metadata.title}:`, error);
      throw new Error(`Failed to fetch lyrics: ${(error as Error).message}`);
    }
  }

  /**
   * Apply rate limiting to avoid overwhelming the API
   */
  private async applyRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.delayBetweenRequests) {
      const delay = this.delayBetweenRequests - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }
}