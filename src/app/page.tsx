'use client';

import { useState, useCallback } from 'react';
import { UrlInput } from '@/components/url-input';
import { VideoPreview } from '@/components/video-preview';
import { ProcessingStatus } from '@/components/processing-status';
import { ResultsTabs } from '@/components/results-tabs';
import { Header } from '@/components/header';
import { processVideo } from '@/actions/process-video';
import { saveToHistory } from '@/lib/db';
import { useVideoHistory } from '@/hooks/use-video-history';
import { VideoMetadata, ProcessingStatus as Status, TranscriptSource, HistoryEntry } from '@/types';

export default function Home() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [keyPoints, setKeyPoints] = useState<string>('');
  const [transcriptSource, setTranscriptSource] = useState<TranscriptSource>('youtube');
  const [hasSpeakers, setHasSpeakers] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);

  const { history, isLoading: historyLoading, removeVideo } = useVideoHistory();

  const handleSubmit = useCallback(async (videoId: string, url: string) => {
    // Reset state
    setError(null);
    setMetadata(null);
    setTranscript('');
    setSummary('');
    setKeyPoints('');
    setTranscriptSource('youtube');
    setHasSpeakers(false);

    // Step 1: Process video (metadata + transcript)
    // Note: This shows 'fetching-transcript' which may take 30-130s if AssemblyAI fallback is used
    setStatus('fetching-metadata');

    const result = await processVideo(url);

    if (!result.success) {
      setError(result.error);
      if (result.metadata) {
        setMetadata(result.metadata);
      }
      setStatus('error');
      return;
    }

    setMetadata(result.metadata);
    setTranscript(result.transcript);
    setTranscriptSource(result.transcriptSource);
    setHasSpeakers(result.hasSpeakers);
    setStatus('summarizing');

    // Step 2: Stream summarization and key points in parallel
    try {
      // Start both fetch requests without awaiting
      const summaryFetch = fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: result.transcript,
          videoTitle: result.metadata.title,
        }),
      });

      const keyPointsFetch = fetch('/api/key-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: result.transcript,
          videoTitle: result.metadata.title,
        }),
      });

      // Track final values for saving to history
      let finalSummary = '';
      let finalKeyPoints = '';

      // Process both streams in parallel using IIFEs
      await Promise.all([
        (async () => {
          const response = await summaryFetch;
          if (!response.ok) throw new Error('Failed to generate summary');
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          if (!reader) throw new Error('No response body for summary');

          let accumulated = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            accumulated += chunk;
            setSummary(accumulated);
          }
          finalSummary = accumulated;
        })(),
        (async () => {
          const response = await keyPointsFetch;
          if (!response.ok) throw new Error('Failed to generate key points');
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          if (!reader) throw new Error('No response body for key points');

          let accumulated = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            accumulated += chunk;
            setKeyPoints(accumulated);
          }
          finalKeyPoints = accumulated;
        })()
      ]);

      setStatus('complete');
      setCurrentVideoId(result.videoId);

      // Save to history after successful processing (fire-and-forget)
      saveToHistory(
        result.videoId,
        url,
        result.metadata,
        result.transcript,
        result.transcriptSource,
        result.hasSpeakers,
        finalSummary,
        finalKeyPoints
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
      setStatus('error');
    }
  }, []);

  const handleSelectHistory = useCallback((video: HistoryEntry) => {
    // Restore video state without re-processing
    setMetadata(video.metadata);
    setTranscript(video.transcript);
    setSummary(video.summary);
    setKeyPoints(video.keyPoints);
    setTranscriptSource(video.transcriptSource);
    setHasSpeakers(video.hasSpeakers);
    setCurrentVideoId(video.videoId);
    setStatus('complete');
    setError(null);
  }, []);

  const handleDeleteHistory = useCallback(async (videoId: string) => {
    await removeVideo(videoId);
    // If currently viewing this video, clear the display
    if (currentVideoId === videoId) {
      setMetadata(null);
      setTranscript('');
      setSummary('');
      setKeyPoints('');
      setStatus('idle');
      setCurrentVideoId(null);
    }
  }, [removeVideo, currentVideoId]);

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6">
        <Header
          history={history}
          historyLoading={historyLoading}
          onSelectVideo={handleSelectHistory}
          onDeleteVideo={handleDeleteHistory}
        />

        <UrlInput
          onSubmit={handleSubmit}
          isLoading={status !== 'idle' && status !== 'complete' && status !== 'error'}
        />

        <ProcessingStatus status={status} />

        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {metadata && (
          <VideoPreview
            title={metadata.title}
            authorName={metadata.authorName}
            thumbnailUrl={metadata.thumbnailUrl}
            loading={status === 'fetching-metadata'}
          />
        )}

        {(transcript || summary || keyPoints) && (
          <ResultsTabs
            summary={summary}
            keyPoints={keyPoints}
            transcript={transcript}
            transcriptSource={transcriptSource}
            hasSpeakers={hasSpeakers}
            isSummarizing={status === 'summarizing'}
          />
        )}
      </div>
    </main>
  );
}
