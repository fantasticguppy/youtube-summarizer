import { TranscriptSegment } from '@/types';

export function formatTranscriptIntoParagraphs(
  segments: TranscriptSegment[],
  targetParagraphLength: number = 400
): string {
  if (segments.length === 0) return '';

  const paragraphs: string[] = [];
  let currentParagraph = '';

  for (const segment of segments) {
    // Clean the text: decode HTML entities, remove extra whitespace
    let text = segment.text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) continue;

    // Add space between segments
    if (currentParagraph) {
      currentParagraph += ' ';
    }
    currentParagraph += text;

    // Check for natural break points
    const endsWithPunctuation = /[.!?]$/.test(text);
    const isLongEnough = currentParagraph.length >= targetParagraphLength;

    if (endsWithPunctuation && isLongEnough) {
      paragraphs.push(currentParagraph.trim());
      currentParagraph = '';
    }
  }

  // Don't forget the last paragraph
  if (currentParagraph.trim()) {
    paragraphs.push(currentParagraph.trim());
  }

  return paragraphs.join('\n\n');
}
