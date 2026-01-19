'use client';

import { useState } from 'react';
import { UrlInput } from '@/components/url-input';
import { VideoPreview } from '@/components/video-preview';
import { ProcessingStatus } from '@/components/processing-status';

type Status =
  | 'idle'
  | 'fetching-metadata'
  | 'fetching-transcript'
  | 'summarizing'
  | 'complete'
  | 'error';

interface VideoMetadata {
  title: string;
  authorName: string;
  thumbnailUrl: string;
}

export default function Home() {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (id: string) => {
    // Reset state
    setVideoId(id);
    setMetadata(null);
    setError(null);
    setStatus('fetching-metadata');

    try {
      // Fetch metadata from YouTube oEmbed API
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`;
      const response = await fetch(oembedUrl);

      if (!response.ok) {
        throw new Error('Video not found or unavailable');
      }

      const data = await response.json();

      setMetadata({
        title: data.title,
        authorName: data.author_name,
        thumbnailUrl: data.thumbnail_url,
      });

      setStatus('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch video information');
      setStatus('error');
    }
  };

  const isLoading = status === 'fetching-metadata' ||
                    status === 'fetching-transcript' ||
                    status === 'summarizing';

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">YouTube Summarizer</h1>
        <p className="mt-2 text-muted-foreground">
          Paste a YouTube URL to get a transcript and AI-generated summary
        </p>
      </div>

      <UrlInput onSubmit={handleSubmit} loading={isLoading} />

      <ProcessingStatus status={status} errorMessage={error || undefined} />

      {(metadata || isLoading) && (
        <VideoPreview
          title={metadata?.title}
          authorName={metadata?.authorName}
          thumbnailUrl={metadata?.thumbnailUrl}
          loading={isLoading && !metadata}
        />
      )}
    </div>
  );
}
