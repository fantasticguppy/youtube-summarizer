'use server';

import { extractVideoId, fetchVideoMetadata, fetchTranscript, formatTranscriptIntoParagraphs } from '@/lib/youtube';
import { VideoMetadata, TranscriptSegment } from '@/types';

export interface ProcessVideoResult {
  success: true;
  videoId: string;
  metadata: VideoMetadata;
  transcript: string;
  rawSegments: TranscriptSegment[];
}

export interface ProcessVideoError {
  success: false;
  error: string;
  metadata?: VideoMetadata; // May have metadata even if transcript fails
}

export async function processVideo(url: string): Promise<ProcessVideoResult | ProcessVideoError> {
  // Step 1: Extract and validate video ID
  const videoId = extractVideoId(url);
  if (!videoId) {
    return { success: false, error: 'Invalid YouTube URL. Please check the URL and try again.' };
  }

  // Step 2: Fetch metadata
  let metadata: VideoMetadata;
  try {
    metadata = await fetchVideoMetadata(videoId);
  } catch (error) {
    return {
      success: false,
      error: 'Could not find video. Please check the URL and try again.',
    };
  }

  // Step 3: Fetch transcript
  let rawSegments: TranscriptSegment[];
  try {
    rawSegments = await fetchTranscript(videoId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch transcript',
      metadata, // Return metadata even if transcript fails
    };
  }

  // Step 4: Format transcript
  const transcript = formatTranscriptIntoParagraphs(rawSegments);

  return {
    success: true,
    videoId,
    metadata,
    transcript,
    rawSegments,
  };
}
