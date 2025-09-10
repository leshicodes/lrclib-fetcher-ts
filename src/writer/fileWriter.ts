import fs from 'fs';
import path from 'path';
import { LyricResult } from '../types';
import { logger } from '../utils/logger';

/**
 * Writer for saving lyrics to files
 */
export class LyricsFileWriter {
  /**
   * Write lyrics to file(s) based on the available content
   * Returns the path to the created file, or undefined if no file was created
   */
  async writeLyrics(
    audioFilePath: string,
    lyrics: LyricResult
  ): Promise<string | undefined> {
    if (!lyrics) {
      logger.warn('LyricsFileWriter', `No lyrics provided for: ${audioFilePath}`);
      return undefined;
    }

    const baseFilePath = audioFilePath.substring(0, audioFilePath.lastIndexOf('.'));
    
    // If we have synchronized lyrics, save as .lrc
    if (lyrics.syncedLyrics) {
      const lrcFilePath = `${baseFilePath}.lrc`;
      try {
        await fs.promises.writeFile(lrcFilePath, lyrics.syncedLyrics, 'utf8');
        logger.info('LyricsFileWriter', `Written synchronized lyrics to: ${path.basename(lrcFilePath)}`);
        return lrcFilePath;
      } catch (error) {
        logger.error('LyricsFileWriter', `Error writing synchronized lyrics to ${lrcFilePath}: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }
    
    // If we only have plain lyrics, save as .txt
    if (lyrics.plainLyrics) {
      const txtFilePath = `${baseFilePath}.txt`;
      try {
        await fs.promises.writeFile(txtFilePath, lyrics.plainLyrics, 'utf8');
        logger.info('LyricsFileWriter', `Written plain lyrics to: ${path.basename(txtFilePath)}`);
        return txtFilePath;
      } catch (error) {
        logger.error('LyricsFileWriter', `Error writing plain lyrics to ${txtFilePath}: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }
    
    // If marked as instrumental, create an empty .lrc file with a comment
    if (lyrics.instrumental) {
      const lrcFilePath = `${baseFilePath}.lrc`;
      try {
        await fs.promises.writeFile(lrcFilePath, '[00:00.00]Instrumental\n', 'utf8');
        logger.info('LyricsFileWriter', `Written instrumental marker to: ${path.basename(lrcFilePath)}`);
        return lrcFilePath;
      } catch (error) {
        logger.error('LyricsFileWriter', `Error writing instrumental marker to ${lrcFilePath}: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }
    
    logger.warn('LyricsFileWriter', `No lyrics content available for: ${audioFilePath}`);
    return undefined;
  }

  /**
   * Check if lyrics file already exists for audio file
   */
  lyricsFileExists(audioFilePath: string): boolean {
    const baseFilePath = audioFilePath.substring(0, audioFilePath.lastIndexOf('.'));
    const lrcFilePath = `${baseFilePath}.lrc`;
    const txtFilePath = `${baseFilePath}.txt`;
    
    return fs.existsSync(lrcFilePath) || fs.existsSync(txtFilePath);
  }

  /**
   * Delete existing lyrics files if they exist
   */
  async deleteExistingLyrics(audioFilePath: string): Promise<void> {
    const baseFilePath = audioFilePath.substring(0, audioFilePath.lastIndexOf('.'));
    const lrcFilePath = `${baseFilePath}.lrc`;
    const txtFilePath = `${baseFilePath}.txt`;
    
    if (fs.existsSync(lrcFilePath)) {
      await fs.promises.unlink(lrcFilePath);
    }
    
    if (fs.existsSync(txtFilePath)) {
      await fs.promises.unlink(txtFilePath);
    }
  }
}