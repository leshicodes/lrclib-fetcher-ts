declare module 'ffprobe' {
  function ffprobe(path: string, options?: { path: string }): Promise<{
    format?: {
      duration?: string;
      tags?: Record<string, string>;
    };
    streams?: Array<{
      codec_type?: string;
      duration?: string;
      tags?: Record<string, string>;
    }>;
  }>;
  
  export = ffprobe;
}

declare module 'ffprobe-static' {
  const ffprobeStatic: {
    path: string;
  };
  
  export = ffprobeStatic;
}