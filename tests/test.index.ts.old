import path from 'path';
import fs from 'fs';
import { createLyricsFetcher } from '../src';
import { extractMetadata } from '../src/metadata/extractor';
import { LrcLibClient } from '../src/api/lrclib';
import util from 'util';
import { exec as execCallback } from 'child_process';
import ffprobeStatic from 'ffprobe-static';
const exec = util.promisify(execCallback);
import { logger } from '../src/utils/logger';

// Make sure the test music directory exists
const musicDirectory = path.join(__dirname, 'music');

if (!fs.existsSync(musicDirectory)) {
  logger.error("test.index.ts", `Test music directory not found: ${musicDirectory}`);
  process.exit(1);
}

async function debugFirstFile() {
  logger.info("test.index.ts", "=== DEBUGGING FIRST FILE ===");
  
  // Find first music file
  const files = fs.readdirSync(musicDirectory, { recursive: true })
    .filter(file => {
      const ext = path.extname(file.toString()).toLowerCase();
      return ['.mp3', '.flac', '.m4a', '.ogg', '.wav', '.wma'].includes(ext);
    });
    
  if (files.length === 0) {
    logger.info("test.index.ts", "No music files found for debugging");
    return;
  }
  
  const testFile = path.join(musicDirectory, files[0].toString());
  logger.info("test.index.ts", `Testing with file: ${testFile}`);
  
  await debugFFprobeOutput(testFile);


  // 1. Test metadata extraction
  try {
    logger.info("test.index.ts", "\n1. Extracting metadata:");
    const metadata = await extractMetadata(testFile);
    logger.info("test.index.ts", JSON.stringify(metadata, null, 2));
    
    if (!metadata.artist || !metadata.title) {
      logger.info("test.index.ts", "❌ ISSUE: Missing essential metadata (artist or title)");
    } else {
      logger.info("test.index.ts", "✅ Metadata extracted successfully");
    }
  } catch (error) {
    logger.error("test.index.ts", "❌ METADATA EXTRACTION FAILED:", error);
  }
  
  // 2. Test API client directly
  try {
    logger.info("test.index.ts", "\n2. Testing LrcLib API client:");
    const apiClient = new LrcLibClient(1000);
    const metadata = await extractMetadata(testFile);
    
    logger.info("test.index.ts", `Searching for: ${metadata.artist} - ${metadata.title}`);
    const lyrics = await apiClient.searchLyrics(metadata);
    
    if (lyrics) {
      logger.info("test.index.ts", "✅ Lyrics found:", lyrics ? "Found" : "Not found");
      logger.info("test.index.ts", `Has synced lyrics: ${!!lyrics.syncedLyrics}`);
      logger.info("test.index.ts", `Has plain lyrics: ${!!lyrics.plainLyrics}`);
    } else {
      logger.info("test.index.ts", "❌ No lyrics found in database");
    }
  } catch (error) {
    logger.error("test.index.ts", "❌ API CLIENT FAILED:", error);
  }
}

async function debugFFprobeOutput(filePath: string) {
  logger.info("test.index.ts", "\n=== RAW FFPROBE OUTPUT ===");
  try {
    const ffprobePath = ffprobeStatic.path;
    // Run ffprobe with detailed output to see all metadata
    const { stdout } = await exec(
      `"${ffprobePath}" -v quiet -print_format json -show_format "${filePath}"`
    );
    
    const data = JSON.parse(stdout);
    logger.info("test.index.ts", "Complete tag structure:");
    logger.info("test.index.ts", JSON.stringify(data.format.tags, null, 2));
  } catch (error) {
    logger.error("test.index.ts", "Failed to get raw ffprobe output:", error);
  }
}

async function runTest() {
  // First run debug on a single file
  await debugFirstFile();
  
  logger.info("test.index.ts", "\n\n=== RUNNING FULL TEST ===");
  logger.info("test.index.ts", `Starting lyrics fetch for music in: ${musicDirectory}`);
  
  const fetcher = createLyricsFetcher({
    recursive: true,
    skipExisting: false,
    overrideExisting: false,
    batchSize: 3,
    delayBetweenRequests: 1500,
    
    onProgress: (current, total, result) => {
      if (result) {
        const artistTitle = `${result.metadata.artist || 'Unknown'} - ${result.metadata.title || 'Unknown'}`;
        
        if (result.success) {
          logger.info("test.index.ts", `✅ [${current}/${total}] ${artistTitle}`);
          if (result.lyricPath) {
            logger.info("test.index.ts", `   Lyrics saved to: ${path.basename(result.lyricPath)}`);
          } else {
            logger.info("test.index.ts", `   File already had lyrics`);
          }
        } else {
          logger.info("test.index.ts", `❌ [${current}/${total}] ${artistTitle}`);
          logger.info("test.index.ts", `   Error: ${result.error?.message || 'Unknown error'}`);
        }
      } else {
        logger.info("test.index.ts", `Progress: ${current}/${total} files processed`);
      }
    }
  });
  
  const startTime = Date.now();
  const results = await fetcher.processDirectory(musicDirectory);
  const endTime = Date.now();
  
  // Print summary
  const successful = results.filter(r => r.success).length;
  logger.info("test.index.ts", '\n=== Summary ===');
  logger.info("test.index.ts", `Total files: ${results.length}`);
  logger.info("test.index.ts", `Successful: ${successful}`);
  logger.info("test.index.ts", `Failed: ${results.length - successful}`);
  logger.info("test.index.ts", `Time taken: ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
  
  // Show error distribution
  const errorTypes = {};
  results.filter(r => !r.success && r.error).forEach(result => {
    const message = result.error?.message || 'Unknown error';
    errorTypes[message] = (errorTypes[message] || 0) + 1;
  });
  
  logger.info("test.index.ts", '\n=== Error Distribution ===');
  Object.entries(errorTypes).forEach(([message, count]) => {
    logger.info("test.index.ts", `${count} files: ${message}`);
  });
}

// Run the test
runTest().catch(error => {
  logger.error('Test failed with error:', error);
  process.exit(1);
});