/**
 * Transcript chunking for long videos.
 *
 * GPT-4o has 128K context, but for quality we chunk large transcripts
 * and merge summaries. This avoids "lost in the middle" issues.
 */

// Rough estimate: 1 token ≈ 4 characters for English
const CHARS_PER_TOKEN = 4;

// Target ~20K tokens per chunk (safe margin under 128K)
const TARGET_CHUNK_TOKENS = 20000;
const TARGET_CHUNK_CHARS = TARGET_CHUNK_TOKENS * CHARS_PER_TOKEN;

// Overlap between chunks for context continuity
const OVERLAP_TOKENS = 500;
const OVERLAP_CHARS = OVERLAP_TOKENS * CHARS_PER_TOKEN;

// Threshold for chunking (transcripts under this are processed as-is)
const CHUNK_THRESHOLD_TOKENS = 25000;
const CHUNK_THRESHOLD_CHARS = CHUNK_THRESHOLD_TOKENS * CHARS_PER_TOKEN;

export interface TranscriptChunk {
  text: string;
  index: number;
  total: number;
  startOffset: number; // Character offset in original
}

/**
 * Estimate token count for text.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Check if transcript needs chunking.
 */
export function needsChunking(transcript: string): boolean {
  return transcript.length > CHUNK_THRESHOLD_CHARS;
}

/**
 * Split transcript into chunks with overlap.
 * Chunks at sentence boundaries to preserve coherence.
 */
export function chunkTranscript(transcript: string): TranscriptChunk[] {
  if (!needsChunking(transcript)) {
    return [{
      text: transcript,
      index: 0,
      total: 1,
      startOffset: 0
    }];
  }

  const chunks: TranscriptChunk[] = [];
  let currentPos = 0;

  while (currentPos < transcript.length) {
    // Calculate end position for this chunk
    let endPos = Math.min(currentPos + TARGET_CHUNK_CHARS, transcript.length);

    // If not at end, find sentence boundary to break at
    if (endPos < transcript.length) {
      // Look for sentence-ending punctuation followed by space
      const searchStart = Math.max(currentPos + TARGET_CHUNK_CHARS - 2000, currentPos);
      const searchRegion = transcript.slice(searchStart, endPos + 500);

      // Find last sentence boundary in the search region
      const sentenceEnders = /[.!?]\s+/g;
      let lastMatch = null;
      let match;

      while ((match = sentenceEnders.exec(searchRegion)) !== null) {
        lastMatch = match;
      }

      if (lastMatch) {
        endPos = searchStart + lastMatch.index + lastMatch[0].length;
      }
    }

    const chunkText = transcript.slice(currentPos, endPos).trim();

    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        index: chunks.length,
        total: 0, // Will be set after all chunks created
        startOffset: currentPos
      });
    }

    // Move position, accounting for overlap
    currentPos = endPos - OVERLAP_CHARS;

    // Prevent infinite loop on edge cases
    if (currentPos <= chunks[chunks.length - 1]?.startOffset) {
      currentPos = endPos;
    }
  }

  // Set total count
  chunks.forEach(chunk => {
    chunk.total = chunks.length;
  });

  return chunks;
}

/**
 * Create a prompt prefix indicating chunk position.
 */
export function chunkContextPrefix(chunk: TranscriptChunk): string {
  if (chunk.total === 1) {
    return '';
  }
  return `[This is part ${chunk.index + 1} of ${chunk.total} of the transcript]\n\n`;
}

/**
 * Merge multiple chunk summaries into a final summary.
 * Used when transcript was chunked for processing.
 */
export function createMergePrompt(
  chunkOutputs: string[],
  videoTitle: string,
  outputType: 'summary' | 'keypoints' | 'outline'
): string {
  const sections = chunkOutputs
    .map((output, i) => `## Part ${i + 1}\n\n${output}`)
    .join('\n\n---\n\n');

  const instructions = {
    summary: `Merge these partial summaries into a single cohesive summary. Eliminate redundancy, preserve all unique information, and maintain the structure (Overview, Main Points, Key Takeaways).`,
    keypoints: `Merge these partial key point extractions into a single cohesive list. Remove duplicates, preserve all unique facts and claims, and maintain the structure (Main Takeaways, Key Facts & Data, Core Arguments, Action Items).`,
    outline: `Merge these partial outlines into a single comprehensive outline. Combine numbered sections logically, remove redundancy from overlapping parts, and preserve all unique content. Re-number sections sequentially.`
  };

  return `You have received ${chunkOutputs.length} partial ${outputType}s from a long video titled "${videoTitle}".

${instructions[outputType]}

---

${sections}`;
}
