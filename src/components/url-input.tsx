'use client';

import { useState, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface UrlInputProps {
  onSubmit: (videoId: string, url: string) => void;
  isLoading?: boolean;
}

// Regex to extract video ID from various YouTube URL formats
// Handles: youtube.com/watch, youtu.be, youtube.com/shorts, youtube.com/embed
const YOUTUBE_REGEX = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|&v(?:i)?=))([^#&?]*).*/;

function extractVideoId(url: string): string | null {
  const match = url.match(YOUTUBE_REGEX);

  if (match && match[1].length === 11) {
    return match[1];
  }

  // Fallback: Try URL API for standard watch URLs
  try {
    const urlObj = new URL(url);
    const videoId = urlObj.searchParams.get('v');
    if (videoId && videoId.length === 11) {
      return videoId;
    }
  } catch {
    // Invalid URL
  }

  return null;
}

export function UrlInput({ onSubmit, isLoading = false }: UrlInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const videoId = extractVideoId(url.trim());

    if (!videoId) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    onSubmit(videoId, url.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Paste YouTube URL..."
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          disabled={isLoading}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading || !url.trim()}>
          {isLoading ? 'Loading...' : 'Summarize'}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </form>
  );
}
