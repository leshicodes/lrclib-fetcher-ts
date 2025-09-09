import path from 'path';
import fs from 'fs';
import { createLyricsFetcher } from '../src';
import { extractMetadata } from '../src/metadata/extractor';
import { LrcLibClient } from '../src/api/lrclib';
import util from 'util';
import { exec as execCallback } from 'child_process';
import ffprobeStatic from 'ffprobe-static';
const exec = util.promisify(execCallback);

// Make sure the test music directory exists
const musicDirectory = path.join(__dirname, 'music');

if (!fs.existsSync(musicDirectory)) {
  console.error(`Test music directory not found: ${musicDirectory}`);
  process.exit(1);
}

async function debugFirstFile() {
  console.log("=== DEBUGGING FIRST FILE ===");
  
  // Find first music file
  const files = fs.readdirSync(musicDirectory, { recursive: true })
    .filter(file => {
      const ext = path.extname(file.toString()).toLowerCase();
      return ['.mp3', '.flac', '.m4a', '.ogg', '.wav', '.wma'].includes(ext);
    });
    
  if (files.length === 0) {
    console.log("No music files found for debugging");
    return;
  }
  
  const testFile = path.join(musicDirectory, files[0].toString());
  console.log(`Testing with file: ${testFile}`);
  
  await debugFFprobeOutput(testFile);


  // 1. Test metadata extraction
  try {
    console.log("\n1. Extracting metadata:");
    const metadata = await extractMetadata(testFile);
    console.log(JSON.stringify(metadata, null, 2));
    
    if (!metadata.artist || !metadata.title) {
      console.log("❌ ISSUE: Missing essential metadata (artist or title)");
    } else {
      console.log("✅ Metadata extracted successfully");
    }
  } catch (error) {
    console.error("❌ METADATA EXTRACTION FAILED:", error);
  }
  
  // 2. Test API client directly
  try {
    console.log("\n2. Testing LrcLib API client:");
    const apiClient = new LrcLibClient(1000);
    const metadata = await extractMetadata(testFile);
    
    console.log(`Searching for: ${metadata.artist} - ${metadata.title}`);
    const lyrics = await apiClient.searchLyrics(metadata);
    
    if (lyrics) {
      console.log("✅ Lyrics found:", lyrics ? "Found" : "Not found");
      console.log(`Has synced lyrics: ${!!lyrics.syncedLyrics}`);
      console.log(`Has plain lyrics: ${!!lyrics.plainLyrics}`);
    } else {
      console.log("❌ No lyrics found in database");
    }
  } catch (error) {
    console.error("❌ API CLIENT FAILED:", error);
  }
}

async function debugFFprobeOutput(filePath: string) {
  console.log("\n=== RAW FFPROBE OUTPUT ===");
  try {
    const ffprobePath = ffprobeStatic.path;
    // Run ffprobe with detailed output to see all metadata
    const { stdout } = await exec(
      `"${ffprobePath}" -v quiet -print_format json -show_format "${filePath}"`
    );
    
    const data = JSON.parse(stdout);
    console.log("Complete tag structure:");
    console.log(JSON.stringify(data.format.tags, null, 2));
  } catch (error) {
    console.error("Failed to get raw ffprobe output:", error);
  }
}

async function runTest() {
  // First run debug on a single file
  await debugFirstFile();
  
  console.log("\n\n=== RUNNING FULL TEST ===");
  console.log(`Starting lyrics fetch for music in: ${musicDirectory}`);
  
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
          console.log(`✅ [${current}/${total}] ${artistTitle}`);
          if (result.lyricPath) {
            console.log(`   Lyrics saved to: ${path.basename(result.lyricPath)}`);
          } else {
            console.log(`   File already had lyrics`);
          }
        } else {
          console.log(`❌ [${current}/${total}] ${artistTitle}`);
          console.log(`   Error: ${result.error?.message || 'Unknown error'}`);
        }
      } else {
        console.log(`Progress: ${current}/${total} files processed`);
      }
    }
  });
  
  const startTime = Date.now();
  const results = await fetcher.processDirectory(musicDirectory);
  const endTime = Date.now();
  
  // Print summary
  const successful = results.filter(r => r.success).length;
  console.log('\n=== Summary ===');
  console.log(`Total files: ${results.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${results.length - successful}`);
  console.log(`Time taken: ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
  
  // Show error distribution
  const errorTypes = {};
  results.filter(r => !r.success && r.error).forEach(result => {
    const message = result.error?.message || 'Unknown error';
    errorTypes[message] = (errorTypes[message] || 0) + 1;
  });
  
  console.log('\n=== Error Distribution ===');
  Object.entries(errorTypes).forEach(([message, count]) => {
    console.log(`${count} files: ${message}`);
  });
}

// Run the test
runTest().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});