'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SummaryView } from './summary-view';
import { KeyPointsView } from './key-points-view';
import { TranscriptView } from './transcript-view';
import { TranscriptSource } from '@/types';

interface ResultsTabsProps {
  summary: string;
  keyPoints: string;
  transcript: string;
  transcriptSource?: TranscriptSource;
  hasSpeakers?: boolean;
  isSummarizing?: boolean;
}

export function ResultsTabs({
  summary,
  keyPoints,
  transcript,
  transcriptSource = 'youtube',
  hasSpeakers = false,
  isSummarizing
}: ResultsTabsProps) {
  return (
    <Tabs defaultValue="summary" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="summary">Summary</TabsTrigger>
        <TabsTrigger value="keypoints">Key Points</TabsTrigger>
        <TabsTrigger value="transcript">Transcript</TabsTrigger>
      </TabsList>
      <TabsContent value="summary" className="mt-4">
        <SummaryView summary={summary} isLoading={isSummarizing && !summary} />
      </TabsContent>
      <TabsContent value="keypoints" className="mt-4">
        <KeyPointsView keyPoints={keyPoints} isLoading={isSummarizing && !keyPoints} />
      </TabsContent>
      <TabsContent value="transcript" className="mt-4">
        <TranscriptView
          transcript={transcript}
          source={transcriptSource}
          hasSpeakers={hasSpeakers}
        />
      </TabsContent>
    </Tabs>
  );
}
