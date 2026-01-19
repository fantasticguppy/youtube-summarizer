'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { History, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { HistoryEntry } from '@/types';

interface HistoryPanelProps {
  videos: HistoryEntry[];
  onSelect: (video: HistoryEntry) => void;
  onDelete: (videoId: string) => void;
  isLoading?: boolean;
}

function getRelativeTime(date: Date): string {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const now = Date.now();
  const timestamp = date.getTime();
  const diff = timestamp - now;
  const diffMinutes = Math.round(diff / 60000);
  const diffHours = Math.round(diff / 3600000);
  const diffDays = Math.round(diff / 86400000);

  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute');
  } else if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  } else {
    return rtf.format(diffDays, 'day');
  }
}

export function HistoryPanel({ videos, onSelect, onDelete, isLoading }: HistoryPanelProps) {
  // Controlled state for closing sheet on selection
  const [open, setOpen] = useState(false);

  const handleSelect = (video: HistoryEntry) => {
    onSelect(video);
    setOpen(false); // Close sheet after selection
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <History className="h-4 w-4" />
          {videos.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
              {videos.length > 99 ? '99+' : videos.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>History</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2 overflow-y-auto max-h-[calc(100vh-8rem)]">
          {isLoading ? (
            // Loading skeletons
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : videos.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No videos yet. Process a YouTube video to see it here.
            </p>
          ) : (
            videos.map(video => (
              <div
                key={video.videoId}
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleSelect(video)}
              >
                <img
                  src={video.metadata.thumbnailUrl}
                  alt=""
                  className="w-20 h-12 object-cover rounded shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">{video.metadata.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {video.metadata.authorName} &bull; {getRelativeTime(video.processedAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(video.videoId);
                  }}
                  className="shrink-0 h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
