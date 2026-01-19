import Dexie, { type EntityTable } from 'dexie';
import type { HistoryEntry, VideoMetadata, TranscriptSource } from '@/types';

class AppDatabase extends Dexie {
  history!: EntityTable<HistoryEntry, 'id'>;

  constructor() {
    super('YouTubeSummarizerDB');
    this.version(1).stores({
      // ++id = auto-increment primary key
      // videoId = indexed for duplicate lookup
      // processedAt = indexed for sorting by recency
      history: '++id, videoId, processedAt'
    });
  }
}

export const db = new AppDatabase();

/**
 * Save a processed video to history.
 * Updates existing entry if videoId already exists, otherwise creates new entry.
 */
export async function saveToHistory(
  videoId: string,
  url: string,
  metadata: VideoMetadata,
  transcript: string,
  transcriptSource: TranscriptSource,
  hasSpeakers: boolean,
  summary: string,
  keyPoints: string
): Promise<void> {
  try {
    // Check for existing entry to avoid duplicates
    const existing = await db.history.where('videoId').equals(videoId).first();

    if (existing) {
      // Update existing entry
      await db.history.update(existing.id!, {
        url,
        metadata,
        transcript,
        transcriptSource,
        hasSpeakers,
        summary,
        keyPoints,
        processedAt: new Date(),
      });
    } else {
      // Add new entry
      await db.history.add({
        videoId,
        url,
        metadata,
        transcript,
        transcriptSource,
        hasSpeakers,
        summary,
        keyPoints,
        processedAt: new Date(),
      });
    }
  } catch (error) {
    // Handle QuotaExceededError gracefully - don't crash the app
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.warn('IndexedDB storage quota exceeded. History entry not saved.');
    } else {
      // Log other errors but don't crash
      console.error('Failed to save to history:', error);
    }
  }
}
