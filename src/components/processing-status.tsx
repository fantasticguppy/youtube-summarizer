'use client';

import { Loader2 } from 'lucide-react';
import { ProcessingStatus as Status } from '@/types';

interface ProcessingStatusProps {
  status: Status;
}

const statusMessages: Record<Status, string> = {
  idle: '',
  'fetching-metadata': 'Fetching video information...',
  'fetching-transcript': 'Retrieving transcript...',
  summarizing: 'Generating summary...',
  complete: 'Done!',
  error: '',
};

export function ProcessingStatus({ status }: ProcessingStatusProps) {
  if (status === 'idle' || status === 'error') {
    return null;
  }

  const isLoading = status !== 'complete';
  const message = statusMessages[status];

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {isLoading && (
        <Loader2 className="h-4 w-4 animate-spin" />
      )}
      <span>{message}</span>
    </div>
  );
}
