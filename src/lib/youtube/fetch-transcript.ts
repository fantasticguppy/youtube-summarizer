import { TranscriptSegment } from '@/types';
import { getSubtitles } from 'youtube-caption-extractor';

export async function fetchTranscript(videoId: string): Promise<TranscriptSegment[]> {
  try {
    // Try English first, then fall back to auto-detect
    let captions = await getSubtitles({ videoID: videoId, lang: 'en' });

    if (!captions || captions.length === 0) {
      // Try without language specification
      captions = await getSubtitles({ videoID: videoId });
    }

    if (!captions || captions.length === 0) {
      throw new Error('No transcript available for this video');
    }

    return captions.map((caption: { start: string; dur: string; text: string }) => ({
      text: decodeHTMLEntities(caption.text),
      offset: parseFloat(caption.start) * 1000, // Convert to ms
      duration: parseFloat(caption.dur) * 1000,
    }));
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('No transcript') || error.message.includes('Could not')) {
        throw new Error('No transcript available for this video');
      }
      if (error.message.includes('unavailable') || error.message.includes('not found')) {
        throw new Error('Video is unavailable');
      }
    }
    throw new Error('Failed to fetch transcript');
  }
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .trim();
}
