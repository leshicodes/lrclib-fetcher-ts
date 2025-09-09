export class LrcLibError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LrcLibError';
  }
}

export class MetadataExtractionError extends LrcLibError {
  constructor(filePath: string, reason: string) {
    super(`Failed to extract metadata from ${filePath}: ${reason}`);
    this.name = 'MetadataExtractionError';
  }
}

export class LyricsFetchError extends LrcLibError {
  constructor(artist: string, title: string, reason: string) {
    super(`Failed to fetch lyrics for "${artist} - ${title}": ${reason}`);
    this.name = 'LyricsFetchError';
  }
}

export class FileWriteError extends LrcLibError {
  constructor(filePath: string, reason: string) {
    super(`Failed to write lyrics to ${filePath}: ${reason}`);
    this.name = 'FileWriteError';
  }
}