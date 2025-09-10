import fs from 'fs';
import path from 'path';
import { ScanOptions } from '../types';
import { logger } from '../utils/logger';
// Make sure this is defined and matches the one in metadata extractor
const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.m4a', '.ogg', '.wav', '.wma'];

export async function scanDirectory(dirPath: string, options: ScanOptions): Promise<string[]> {
  const { recursive = true } = options;
  const results: string[] = [];
  
  try {
    const files = await fs.promises.readdir(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = await fs.promises.stat(filePath);
      
      if (stat.isDirectory()) {
        if (recursive) {
          const nestedFiles = await scanDirectory(filePath, options);
          results.push(...nestedFiles);
        }
      } else {
        // Only include audio files in the results
        const ext = path.extname(file).toLowerCase();
        if (AUDIO_EXTENSIONS.includes(ext)) {
          results.push(filePath);
        } else {
          logger.debug('FileScanner', `Skipping non-audio file: ${file}`);
        }
      }
    }
  } catch (error) {
    logger.error('FileScanner', `Error scanning directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return results;
}