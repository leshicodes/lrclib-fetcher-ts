#!/usr/bin/env node

import { program } from 'commander';
import { createLyricsFetcher } from './index';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs';

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

program
  .name('lrclib')
  .description('Fetch synchronized lyrics for your music files')
  .version(packageJson.version);

program
  .argument('<directory>', 'Directory containing music files')
  .option('-r, --recursive', 'Scan directories recursively', true)
  .option('--no-skip-existing', 'Don\'t skip files that already have lyrics')
  .option('-o, --overwrite', 'Overwrite existing lyrics files', false)
  .option('-b, --batch-size <number>', 'Number of files to process in parallel', '5')
  .option('-d, --delay <number>', 'Delay between API requests in milliseconds', '1000')
  .option('--allow-title-only', 'Allow searching by title only if artist search fails', false)
  .option('--prefer-synced', 'Prefer synchronized lyrics over plain text', true)
  .option('--log-level <level>', 'Log level (debug, info, warn, error)', 'info')
  .option('--log-file <path>', 'Path to log file')
  .action(async (directory, options) => {
    try {
      // Validate directory
      if (!fs.existsSync(directory)) {
        console.error(chalk.red(`Directory not found: ${directory}`));
        process.exit(1);
      }
      
      // Setup fetcher
      const fetcher = createLyricsFetcher({
        logging: {
          level: options.logLevel,
          logToFile: !!options.logFile,
          logFilePath: options.logFile
        },
        search: {
          allowTitleOnlySearch: options.allowTitleOnly,
          preferSynced: options.preferSynced
        },
        file: {
          skipExisting: options.skipExisting,
          overwriteExisting: options.overwrite
        },
        batch: {
          enabled: true,
          size: parseInt(options.batchSize),
          delayMs: parseInt(options.delay)
        }
      });
      
      // Setup spinner
      const spinner = ora('Scanning directory...').start();
      let processedCount = 0;
      let totalCount = 0;
      let successCount = 0;
      
      // Process directory
      const results = await fetcher.processDirectory(directory, {
        onProgress: (current, total, result) => {
          processedCount = current;
          totalCount = total;
          
          if (result && result.success) {
            successCount++;
          }
          
          spinner.text = `Processing: ${processedCount}/${totalCount} (${successCount} successful)`;
        }
      });
      
      // Final results
      spinner.succeed(`Processed ${results.length} files (${results.filter(r => r.success).length} successful)`);
      
      // Show error summary if any
      const errors = results.filter(r => !r.success);
      if (errors.length > 0) {
        console.log(chalk.yellow(`\n${errors.length} files failed:`));
        
        // Group errors by type
        const errorTypes = {};
        errors.forEach(error => {
          const message = error.error?.message || 'Unknown error';
          errorTypes[message] = (errorTypes[message] || 0) + 1;
        });
        
        Object.entries(errorTypes).forEach(([message, count]) => {
          console.log(chalk.yellow(`  - ${count} files: ${message}`));
        });
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

program.parse(process.argv);