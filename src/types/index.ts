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

export type TranscriptSource = 'youtube' | 'assemblyai';

export interface SpeakerUtterance {
  speaker: string;      // "A", "B", "C", etc.
  text: string;
  startMs: number;
  endMs: number;
}

export interface TranscriptResult {
  text: string;                          // Full transcript text (formatted)
  segments: TranscriptSegment[];         // Raw segments for compatibility
  source: TranscriptSource;              // Where transcript came from
  utterances?: SpeakerUtterance[];       // Speaker-labeled utterances (AssemblyAI only)
  hasSpeakers: boolean;                  // True if multiple speakers detected
}
