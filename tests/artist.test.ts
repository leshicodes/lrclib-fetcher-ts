import path from 'path';
import { LyricsFetcherOrchestrator } from '../src/orchestrator/index';
import { Logger, LogLevel } from '../src/utils/logger';
// import { FileScanner } from '../src/scanner/fileScanner';
import { extractMetadata } from '../src/metadata/extractor';
import { LrcLibClient } from '../src/api/lrclib';
// import { writeLyricsToFile } from '../src/writer/fileWriter';

// Points to a specific artist folder inside tests/music
const ARTIST_TO_TEST = 'Childish Gambino';
const ALBUM_TO_TEST = 'Because the Internet [2013]'; 

// ...rest of artist test implementation...