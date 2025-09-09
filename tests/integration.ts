import path from 'path';
import { LyricsFetcherOrchestrator } from '../src/orchestrator/index';
import { Logger, LogLevel } from '../src/utils/logger';
import { FileProcessResult } from '../src/types';

// Configure the test
const TEST_CONFIG = {
  musicDirectory: path.join(__dirname, 'music'),  // Points to tests/music directory
  sampleSize: 5, 
  logLevel: LogLevel.DEBUG,
  batchProcessing: true,
  batchSize: 2,
  batchDelay: 1000,
};

// ...rest of integration test implementation...