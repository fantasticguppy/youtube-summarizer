'use client';

import { HistoryPanel } from './history-panel';
import type { HistoryEntry } from '@/types';

interface HeaderProps {
  history: HistoryEntry[];
  historyLoading: boolean;
  onSelectVideo: (video: HistoryEntry) => void;
  onDeleteVideo: (videoId: string) => void;
}

export function Header({ history, historyLoading, onSelectVideo, onDeleteVideo }: HeaderProps) {
  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">YouTube Summarizer</h1>
        <p className="text-muted-foreground">
          Paste a YouTube URL to get a transcript and AI-generated summary
        </p>
      </div>
      <HistoryPanel
        videos={history}
        onSelect={onSelectVideo}
        onDelete={onDeleteVideo}
        isLoading={historyLoading}
      />
    </header>
  );
}
