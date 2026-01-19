'use client';

import { Loader2 } from 'lucide-react';

type Status =
  | 'idle'
  | 'fetching-metadata'
  | 'fetching-transcript'
  | 'summarizing'
  | 'complete'
  | 'error';

interface ProcessingStatusProps {
  status: Status;
  errorMessage?: string;
}

const statusMessages: Record<Status, string> = {
  idle: '',
  'fetching-metadata': 'Fetching video information...',
  'fetching-transcript': 'Retrieving transcript...',
  summarizing: 'Generating summary...',
  complete: 'Done!',
  error: 'An error occurred',
};

export function ProcessingStatus({ status, errorMessage }: ProcessingStatusProps) {
  if (status === 'idle') {
    return null;
  }

  const isLoading = status !== 'complete' && status !== 'error';
  const message = status === 'error' && errorMessage
    ? errorMessage
    : statusMessages[status];

  return (
    <div className={`flex items-center gap-2 text-sm ${
      status === 'error' ? 'text-destructive' : 'text-muted-foreground'
    }`}>
      {isLoading && (
        <Loader2 className="h-4 w-4 animate-spin" />
      )}
      <span>{message}</span>
    </div>
  );
}
