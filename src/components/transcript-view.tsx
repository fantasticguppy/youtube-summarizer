'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from './copy-button';
import { TranscriptSource } from '@/types';

interface TranscriptViewProps {
  transcript: string;
  source?: TranscriptSource;
  hasSpeakers?: boolean;
}

export function TranscriptView({ transcript, source = 'youtube', hasSpeakers = false }: TranscriptViewProps) {
  const sourceLabel = source === 'youtube'
    ? 'YouTube captions'
    : hasSpeakers
      ? 'Audio transcription (with speakers)'
      : 'Audio transcription';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg font-medium">Full Transcript</CardTitle>
          <p className="text-xs text-muted-foreground">
            Source: {sourceLabel}
          </p>
        </div>
        <CopyButton text={transcript} />
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <div
            className="whitespace-pre-wrap text-sm leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: formatTranscriptHtml(transcript, hasSpeakers)
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Convert markdown speaker labels to HTML for display.
 * Only processes **Speaker X:** patterns when hasSpeakers is true.
 */
function formatTranscriptHtml(text: string, hasSpeakers: boolean): string {
  if (!hasSpeakers) {
    // No speakers - just escape HTML and preserve line breaks
    return escapeHtml(text);
  }

  // Convert **Speaker X:** to styled spans
  return escapeHtml(text).replace(
    /\*\*Speaker ([A-Z]):\*\*/g,
    '<strong class="text-primary">Speaker $1:</strong>'
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
