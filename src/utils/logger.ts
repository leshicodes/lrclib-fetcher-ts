export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

export interface LoggerOptions {
  level: LogLevel;
  useColors: boolean;
  includeTimestamps: boolean;
  outputToFile?: string;
}

export class Logger {
  private static instance: Logger;
  private options: LoggerOptions;
  private fileStream?: NodeJS.WritableStream;
  
  private constructor(options: Partial<LoggerOptions> = {}) {
    this.options = {
      level: options.level ?? LogLevel.INFO,
      useColors: options.useColors ?? true,
      includeTimestamps: options.includeTimestamps ?? true,
      outputToFile: options.outputToFile
    };
    
    if (this.options.outputToFile) {
      const fs = require('fs');
      this.fileStream = fs.createWriteStream(this.options.outputToFile, { flags: 'a' });
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public static configure(options: Partial<LoggerOptions>): void {
    if (Logger.instance) {
      Logger.instance.setOptions(options);
    } else {
      Logger.instance = new Logger(options);
    }
  }

  private setOptions(options: Partial<LoggerOptions>): void {
    this.options = { ...this.options, ...options };
    
    // Handle file stream updates if necessary
    if (options.outputToFile !== undefined && options.outputToFile !== this.options.outputToFile) {
      if (this.fileStream) {
        this.fileStream.end();
        this.fileStream = undefined;
      }
      
      if (options.outputToFile) {
        const fs = require('fs');
        this.fileStream = fs.createWriteStream(options.outputToFile, { flags: 'a' });
      }
    }
  }

  private formatMessage(level: string, component: string, message: string): string {
    const timestamp = this.options.includeTimestamps ? `[${new Date().toISOString()}] ` : '';
    return `${timestamp}${level} [${component}]: ${message}`;
  }

  private log(level: LogLevel, levelName: string, component: string, message: string, data?: any): void {
    if (level > this.options.level) return;

    const formattedMsg = this.formatMessage(levelName, component, message);
    let consoleMethod: 'log' | 'info' | 'warn' | 'error' = 'log';
    let color = '';
    
    switch (level) {
      case LogLevel.ERROR:
        consoleMethod = 'error';
        color = '\x1b[31m'; // Red
        break;
      case LogLevel.WARN:
        consoleMethod = 'warn';
        color = '\x1b[33m'; // Yellow
        break;
      case LogLevel.INFO:
        consoleMethod = 'info';
        color = '\x1b[36m'; // Cyan
        break;
      case LogLevel.DEBUG:
        color = '\x1b[90m'; // Gray
        break;
      case LogLevel.TRACE:
        color = '\x1b[90m'; // Gray
        break;
    }
    
    const resetColor = '\x1b[0m';
    const coloredMsg = this.options.useColors ? `${color}${formattedMsg}${resetColor}` : formattedMsg;
    
    console[consoleMethod](coloredMsg);
    if (data !== undefined) {
      console[consoleMethod](data);
    }
    
    if (this.fileStream) {
      const dataStr = data !== undefined ? '\n' + JSON.stringify(data, null, 2) : '';
      this.fileStream.write(formattedMsg + dataStr + '\n');
    }
  }

  public error(component: string, message: string, data?: any): void {
    this.log(LogLevel.ERROR, 'ERROR', component, message, data);
  }

  public warn(component: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, 'WARN', component, message, data);
  }

  public info(component: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, 'INFO', component, message, data);
  }

  public debug(component: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, 'DEBUG', component, message, data);
  }

  public trace(component: string, message: string, data?: any): void {
    this.log(LogLevel.TRACE, 'TRACE', component, message, data);
  }
}

export const logger = Logger.getInstance();