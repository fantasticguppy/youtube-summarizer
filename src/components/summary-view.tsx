'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from './copy-button';
import { Skeleton } from '@/components/ui/skeleton';

interface SummaryViewProps {
  summary: string;
  isLoading?: boolean;
}

export function SummaryView({ summary, isLoading }: SummaryViewProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Summary</CardTitle>
        <CopyButton text={summary} />
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {/* Render markdown as formatted HTML */}
          <div
            className="text-sm leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: formatMarkdown(summary),
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Simple markdown to HTML converter for summary display
function formatMarkdown(text: string): string {
  return text
    // Headers
    .replace(/^## (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^### (.+)$/gm, '<h4 class="text-sm font-medium mt-3 mb-1">$1</h4>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Bullet points (including nested)
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/^  - (.+)$/gm, '<li class="ml-8">$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul class="list-disc space-y-1 my-2">$&</ul>')
    // Paragraphs (lines not starting with < or whitespace)
    .replace(/^([^<\s].+)$/gm, '<p class="my-2">$1</p>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="my-4" />');
}
