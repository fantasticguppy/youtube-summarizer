import { YoutubeTranscript } from 'youtube-transcript';
import { TranscriptSegment } from '@/types';

export async function fetchTranscript(videoId: string): Promise<TranscriptSegment[]> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return transcript.map((segment) => ({
      text: segment.text,
      offset: segment.offset,
      duration: segment.duration,
    }));
  } catch (error) {
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('disabled')) {
        throw new Error('Transcripts are disabled for this video');
      }
      if (error.message.includes('unavailable')) {
        throw new Error('Video is unavailable');
      }
      if (error.message.includes('not available') || error.message.includes('Could not')) {
        throw new Error('No transcript available for this video');
      }
    }
    throw new Error('Failed to fetch transcript');
  }
}
