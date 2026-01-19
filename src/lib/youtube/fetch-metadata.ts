import { VideoMetadata } from '@/types';

export async function fetchVideoMetadata(videoId: string): Promise<VideoMetadata> {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Video not found');
    }
    throw new Error('Failed to fetch video metadata');
  }

  const data = await response.json();

  return {
    title: data.title,
    authorName: data.author_name,
    authorUrl: data.author_url,
    thumbnailUrl: data.thumbnail_url,
    thumbnailWidth: data.thumbnail_width,
    thumbnailHeight: data.thumbnail_height,
  };
}
