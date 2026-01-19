import { assemblyai } from './index';
import { TranscriptResult, TranscriptSegment, SpeakerUtterance } from '@/types';
import { extractAudioBuffer } from '@/lib/youtube/extract-audio';

export async function transcribeAudio(videoId: string): Promise<TranscriptResult> {
  // Step 1: Extract audio from YouTube
  const audioBuffer = await extractAudioBuffer(videoId);

  // Step 2: Transcribe with speaker diarization
  const transcript = await assemblyai.transcripts.transcribe({
    audio: audioBuffer,
    speaker_labels: true,
  });

  if (transcript.status === 'error') {
    throw new Error(transcript.error || 'Transcription failed');
  }

  if (!transcript.text) {
    throw new Error('No transcript text returned');
  }

  // Step 3: Process utterances for speaker labels
  const utterances: SpeakerUtterance[] = (transcript.utterances || []).map(u => ({
    speaker: u.speaker,
    text: u.text,
    startMs: u.start,
    endMs: u.end,
  }));

  // Detect if multiple speakers (only show labels if > 1 unique speaker)
  const uniqueSpeakers = new Set(utterances.map(u => u.speaker));
  const hasSpeakers = uniqueSpeakers.size > 1;

  // Step 4: Build segments from words for compatibility
  const segments: TranscriptSegment[] = (transcript.words || []).map(w => ({
    text: w.text,
    offset: w.start,
    duration: w.end - w.start,
  }));

  // Step 5: Format text with speaker labels if multiple speakers
  const formattedText = hasSpeakers
    ? utterances.map(u => `**Speaker ${u.speaker}:** ${u.text}`).join('\n\n')
    : transcript.text;

  return {
    text: formattedText,
    segments,
    source: 'assemblyai',
    utterances: hasSpeakers ? utterances : undefined,
    hasSpeakers,
  };
}
