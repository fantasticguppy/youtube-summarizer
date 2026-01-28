import { Innertube, ClientType } from 'youtubei.js';

/**
 * Extract audio buffer from YouTube video.
 * Uses youtubei.js with multiple client fallbacks.
 */

// Max video duration for audio extraction (3 hours)
const MAX_DURATION_SECONDS = 3 * 60 * 60;

// Client types to try in order of reliability
const CLIENTS_TO_TRY: ClientType[] = [
  ClientType.TV_EMBEDDED,
  ClientType.WEB,
  ClientType.ANDROID,
  ClientType.IOS,
];

export async function extractAudioBuffer(videoId: string): Promise<Buffer> {
  let lastError: Error | null = null;

  for (const clientType of CLIENTS_TO_TRY) {
    try {
      const innertube = await Innertube.create({
        generate_session_locally: true,
        client_type: clientType,
      });

      const info = await innertube.getBasicInfo(videoId);

      // Check video duration
      const durationSeconds = info.basic_info.duration || 0;
      if (durationSeconds > MAX_DURATION_SECONDS) {
        const hours = Math.floor(durationSeconds / 3600);
        const minutes = Math.floor((durationSeconds % 3600) / 60);
        throw new Error(
          `Video is too long for transcription (${hours}h ${minutes}m). ` +
            `Maximum supported duration is 3 hours. ` +
            `Try a shorter video or one with YouTube captions.`
        );
      }

      console.log(
        `Downloading audio: ~${Math.round(durationSeconds / 60)}min`
      );

      // Download audio stream
      const stream = await innertube.download(videoId, {
        type: 'audio',
        quality: 'best',
      });

      // Collect chunks
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);

      if (totalLength === 0) {
        throw new Error('Downloaded empty audio');
      }

      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return Buffer.from(result);
    } catch (error) {
      lastError = error as Error;
      // Duration errors should not trigger fallback
      if ((error as Error).message.includes('too long')) {
        throw error;
      }
      continue;
    }
  }

  throw lastError || new Error('Failed to extract audio from video');
}
