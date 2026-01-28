import { Innertube, ClientType } from 'youtubei.js';
import { spawn } from 'child_process';
import { readFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Extract audio buffer from YouTube video.
 * Uses youtubei.js with multiple client fallbacks, then yt-dlp as last resort.
 */

// Max video duration for audio extraction (3 hours)
const MAX_DURATION_SECONDS = 3 * 60 * 60;

// Client types to try in order of reliability
const CLIENTS_TO_TRY: ClientType[] = [
  ClientType.TV,
  ClientType.TV_EMBEDDED,
  ClientType.MWEB,
  ClientType.WEB,
  ClientType.ANDROID,
  ClientType.IOS,
];

export async function extractAudioBuffer(videoId: string): Promise<Buffer> {
  // Try youtubei.js first
  const youtubeijsResult = await tryYoutubeiJs(videoId);
  if (youtubeijsResult) {
    return youtubeijsResult;
  }

  // Fall back to yt-dlp
  console.log('[extract-audio] Falling back to yt-dlp...');
  return await tryYtDlp(videoId);
}

async function tryYoutubeiJs(videoId: string): Promise<Buffer | null> {
  let lastError: Error | null = null;
  let durationLogged = false;

  for (const clientType of CLIENTS_TO_TRY) {
    try {
      console.log(`[extract-audio] Trying ${clientType} client...`);

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

      if (!durationLogged) {
        console.log(`Downloading audio: ~${Math.round(durationSeconds / 60)}min`);
        durationLogged = true;
      }

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
      console.log(`[extract-audio] ${clientType} succeeded: ${Math.round(totalLength / 1024 / 1024)}MB`);

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
      const err = error as Error;
      console.log(`[extract-audio] ${clientType} failed: ${err.message}`);
      lastError = err;
      // Duration errors should not trigger fallback
      if (err.message.includes('too long')) {
        throw error;
      }
      continue;
    }
  }

  console.log('[extract-audio] All youtubei.js clients failed');
  return null;
}

async function tryYtDlp(videoId: string): Promise<Buffer> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const outputPath = join(tmpdir(), `yt-audio-${videoId}-${Date.now()}.m4a`);

  return new Promise((resolve, reject) => {
    const args = [
      '-f', 'bestaudio[ext=m4a]/bestaudio/best',
      '-o', outputPath,
      '--no-playlist',
      '--no-warnings',
      '--cookies-from-browser', 'safari',
      '--extractor-args', 'youtube:player_client=android,web',
      url,
    ];

    console.log(`[extract-audio] Running: yt-dlp ${args.join(' ')}`);

    const proc = spawn('yt-dlp', args);

    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp failed (code ${code}): ${stderr}`));
        return;
      }

      try {
        const buffer = await readFile(outputPath);
        console.log(`[extract-audio] yt-dlp succeeded: ${Math.round(buffer.length / 1024 / 1024)}MB`);

        // Clean up temp file
        await unlink(outputPath).catch(() => {});

        resolve(buffer);
      } catch (err) {
        reject(new Error(`Failed to read downloaded audio: ${(err as Error).message}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to run yt-dlp: ${err.message}`));
    });
  });
}
