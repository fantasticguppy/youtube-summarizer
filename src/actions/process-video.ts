'use server';

import { extractVideoId, fetchVideoMetadata, fetchTranscript, formatTranscriptIntoParagraphs } from '@/lib/youtube';
import { VideoMetadata, TranscriptSegment, TranscriptSource, SpeakerUtterance, TranscriptResult } from '@/types';

export interface ProcessVideoResult {
  success: true;
  videoId: string;
  metadata: VideoMetadata;
  transcript: string;
  rawSegments: TranscriptSegment[];
  transcriptSource: TranscriptSource;
  utterances?: SpeakerUtterance[];
  hasSpeakers: boolean;
}

export interface ProcessVideoError {
  success: false;
  error: string;
  metadata?: VideoMetadata;
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

  // Step 3: Try YouTube captions first
  let rawSegments: TranscriptSegment[];
  let transcript: string;
  let transcriptSource: TranscriptSource = 'youtube';
  let utterances: SpeakerUtterance[] | undefined;
  let hasSpeakers = false;

  try {
    rawSegments = await fetchTranscript(videoId);
    transcript = formatTranscriptIntoParagraphs(rawSegments);
  } catch (youtubeError) {
    // Step 4: Fall back to AssemblyAI
    // Note: This can take 30-130+ seconds for audio extraction + transcription
    // Dynamic import to avoid bundling Node.js-only dependencies in client references
    try {
      const { transcribeAudio } = await import('@/lib/assemblyai/transcribe');
      const result: TranscriptResult = await transcribeAudio(videoId);
      transcript = result.text;
      rawSegments = result.segments;
      transcriptSource = 'assemblyai';
      utterances = result.utterances;
      hasSpeakers = result.hasSpeakers;
    } catch (assemblyError) {
      // Log the actual AssemblyAI error for debugging
      console.error('AssemblyAI fallback failed:', assemblyError);

      // Both methods failed - return original YouTube error for clarity
      return {
        success: false,
        error: youtubeError instanceof Error
          ? youtubeError.message
          : 'Failed to fetch transcript. This video may not have captions and audio transcription failed.',
        metadata,
      };
    }
  }

  return {
    success: true,
    videoId,
    metadata,
    transcript,
    rawSegments,
    transcriptSource,
    utterances,
    hasSpeakers,
  };
}
