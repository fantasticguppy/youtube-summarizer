export interface VideoMetadata {
  title: string;
  authorName: string;
  authorUrl: string;
  thumbnailUrl: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
}

export interface TranscriptSegment {
  text: string;
  offset: number;  // Start time in milliseconds
  duration: number; // Duration in milliseconds
}

export type ProcessingStatus =
  | 'idle'
  | 'fetching-metadata'
  | 'fetching-transcript'
  | 'summarizing'
  | 'complete'
  | 'error';

export interface ProcessingResult {
  videoId: string;
  metadata: VideoMetadata;
  transcript: string;
  rawSegments: TranscriptSegment[];
}
