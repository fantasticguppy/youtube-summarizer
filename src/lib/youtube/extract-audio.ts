import ytdl from '@distube/ytdl-core';

/**
 * Extract audio buffer from YouTube video.
 * Uses @distube/ytdl-core (deprecated but functional).
 *
 * NOTE: This library is deprecated as of Aug 2025.
 * Plan migration to youtubei.js if extraction breaks.
 */

// Max video duration for audio extraction (3 hours)
// Longer videos would consume too much memory and AssemblyAI cost
const MAX_DURATION_SECONDS = 3 * 60 * 60; // 10,800 seconds

export async function extractAudioBuffer(videoId: string): Promise<Buffer> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const info = await ytdl.getInfo(url);

    // Check video duration before downloading
    const durationSeconds = parseInt(info.videoDetails.lengthSeconds, 10);
    if (durationSeconds > MAX_DURATION_SECONDS) {
      const hours = Math.floor(durationSeconds / 3600);
      const minutes = Math.floor((durationSeconds % 3600) / 60);
      throw new Error(
        `Video is too long for transcription (${hours}h ${minutes}m). ` +
        `Maximum supported duration is 3 hours. ` +
        `Try a shorter video or one with YouTube captions.`
      );
    }

    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

    if (!format) {
      throw new Error('No audio format available for this video');
    }

    // Log estimated size for monitoring
    const estimatedSizeMB = format.contentLength
      ? Math.round(parseInt(format.contentLength, 10) / (1024 * 1024))
      : 'unknown';
    console.log(`Downloading audio: ~${estimatedSizeMB}MB, duration: ${Math.round(durationSeconds / 60)}min`);

    const chunks: Buffer[] = [];
    const stream = ytdl.downloadFromInfo(info, { format });

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', (err: Error) => {
        // Provide clear error messages for common failures
        if (err.message.includes('private') || err.message.includes('unavailable')) {
          reject(new Error('Video is private or unavailable'));
        } else if (err.message.includes('age') || err.message.includes('sign in')) {
          reject(new Error('Video requires age verification'));
        } else if (err.message.includes('region')) {
          reject(new Error('Video is not available in your region'));
        } else {
          reject(new Error(`Failed to extract audio: ${err.message}`));
        }
      });
    });
  } catch (error) {
    if (error instanceof Error) {
      throw error; // Re-throw our formatted errors
    }
    throw new Error('Failed to extract audio from video');
  }
}
