'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from './copy-button';

interface TranscriptViewProps {
  transcript: string;
}

export function TranscriptView({ transcript }: TranscriptViewProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Full Transcript</CardTitle>
        <CopyButton text={transcript} />
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {transcript}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
