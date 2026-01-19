'use client';

import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, loadFromHistory, deleteFromHistory } from '@/lib/db';
import type { HistoryEntry } from '@/types';

/**
 * React hook for managing video history with reactive updates.
 * Uses useLiveQuery for real-time sync with IndexedDB.
 */
export function useVideoHistory() {
  // useLiveQuery provides reactive updates when DB changes
  // Returns undefined while loading, then the array
  const history = useLiveQuery(
    () => db.history.orderBy('processedAt').reverse().toArray(),
    [],
    [] // Default to empty array while loading
  );

  // Check if still loading (useLiveQuery returns undefined initially)
  const isLoading = history === undefined;

  const loadVideo = useCallback(async (videoId: string): Promise<HistoryEntry | undefined> => {
    return loadFromHistory(videoId);
  }, []);

  const removeVideo = useCallback(async (videoId: string): Promise<void> => {
    await deleteFromHistory(videoId);
    // useLiveQuery will automatically update the history list
  }, []);

  return {
    history: history ?? [],
    isLoading,
    loadVideo,
    removeVideo,
  };
}
