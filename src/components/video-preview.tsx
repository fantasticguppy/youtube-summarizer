'use client';

import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface VideoPreviewProps {
  title?: string;
  authorName?: string;
  thumbnailUrl?: string;
  loading?: boolean;
}

export function VideoPreview({
  title,
  authorName,
  thumbnailUrl,
  loading = false,
}: VideoPreviewProps) {
  if (loading) {
    return (
      <Card>
        <div className="relative aspect-video w-full overflow-hidden rounded-t-lg">
          <Skeleton className="h-full w-full" />
        </div>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
      </Card>
    );
  }

  if (!title || !thumbnailUrl) {
    return null;
  }

  return (
    <Card>
      <div className="relative aspect-video w-full overflow-hidden rounded-t-lg">
        <Image
          src={thumbnailUrl}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 672px"
          priority
        />
      </div>
      <CardHeader>
        <CardTitle className="line-clamp-2">{title}</CardTitle>
        {authorName && (
          <CardDescription>{authorName}</CardDescription>
        )}
      </CardHeader>
    </Card>
  );
}
