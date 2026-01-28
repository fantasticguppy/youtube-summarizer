import { TranscriptSegment } from '@/types';
import { getSubtitles } from 'youtube-caption-extractor';

export async function fetchTranscript(videoId: string): Promise<TranscriptSegment[]> {
  try {
    console.log(`[fetch-transcript] Fetching captions for ${videoId}`);
    // Try English first, then fall back to auto-detect
    let captions = await getSubtitles({ videoID: videoId, lang: 'en' });
    console.log(`[fetch-transcript] English captions: ${captions?.length || 0} segments`);

    if (!captions || captions.length === 0) {
      // Try without language specification
      console.log('[fetch-transcript] No English captions, trying auto-detect...');
      captions = await getSubtitles({ videoID: videoId });
      console.log(`[fetch-transcript] Auto-detect captions: ${captions?.length || 0} segments`);
    }

    if (!captions || captions.length === 0) {
      console.log('[fetch-transcript] No captions found');
      throw new Error('No transcript available for this video');
    }

    console.log(`[fetch-transcript] Success: ${captions.length} segments`);

    return captions.map((caption: { start: string; dur: string; text: string }) => ({
      text: decodeHTMLEntities(caption.text),
      offset: parseFloat(caption.start) * 1000, // Convert to ms
      duration: parseFloat(caption.dur) * 1000,
    }));
  } catch (error) {
    console.log('[fetch-transcript] Error:', (error as Error).message);
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
