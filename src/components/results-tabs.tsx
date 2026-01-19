'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SummaryView } from './summary-view';
import { TranscriptView } from './transcript-view';

interface ResultsTabsProps {
  summary: string;
  transcript: string;
  isSummarizing?: boolean;
}

export function ResultsTabs({ summary, transcript, isSummarizing }: ResultsTabsProps) {
  return (
    <Tabs defaultValue="summary" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="summary">Summary</TabsTrigger>
        <TabsTrigger value="transcript">Transcript</TabsTrigger>
      </TabsList>
      <TabsContent value="summary" className="mt-4">
        <SummaryView summary={summary} isLoading={isSummarizing && !summary} />
      </TabsContent>
      <TabsContent value="transcript" className="mt-4">
        <TranscriptView transcript={transcript} />
      </TabsContent>
    </Tabs>
  );
}
