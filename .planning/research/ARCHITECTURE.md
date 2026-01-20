# Architecture Research: v1.1 Outline

**Domain:** Streaming outline generation for YouTube transcripts
**Researched:** 2026-01-19
**Confidence:** HIGH (based on existing codebase analysis + verified documentation)

---

## Current Architecture Summary

The existing v1 pipeline processes videos in this sequence:

```
URL Input
    |
    v
[Server Action: processVideo]
    |
    +-- extractVideoId(url)
    +-- fetchVideoMetadata(videoId) --> VideoMetadata
    +-- fetchTranscript(videoId) OR transcribeAudio(videoId) --> TranscriptResult
    |
    v
[Client: page.tsx]
    |
    +-- Parallel API calls:
    |       |
    |       +-- POST /api/summarize --> StreamText (2000 max tokens)
    |       +-- POST /api/key-points --> StreamText (1500 max tokens)
    |
    v
[IndexedDB: saveToHistory]
```

**Key characteristics:**
- Server action handles transcript fetching (synchronous, potentially slow for AssemblyAI)
- Client initiates parallel streaming for summary + key points
- Each streaming endpoint is independent (no shared state)
- Transcript is sent as plain string (timestamps not preserved in current prompts)
- IndexedDB stores full transcript but not raw segments with timestamps

**Data flow:**
1. `TranscriptSegment[]` (with `offset` and `duration` in ms) exists in `process-video.ts`
2. `formatTranscriptIntoParagraphs()` merges segments into plain text, losing timestamp granularity
3. Streaming endpoints receive only the formatted text

---

## Outline Generation Integration

### Recommendation: Add as Third Parallel Stream

Outline generation should run in parallel with summary and key points, not sequentially. The existing architecture already supports this pattern.

**Integration point:** Extend the `Promise.all()` block in `page.tsx`:

```typescript
// Current: 2 parallel streams
await Promise.all([
  (async () => { /* summary stream */ })(),
  (async () => { /* key points stream */ })()
]);

// v1.1: 3 parallel streams
await Promise.all([
  (async () => { /* summary stream */ })(),
  (async () => { /* key points stream */ })(),
  (async () => { /* outline stream */ })()  // NEW
]);
```

**New API route:** `POST /api/outline`

**Why parallel works:**
- All three outputs derive from the same transcript input
- No dependency between summary, key points, and outline
- User sees all three tabs populating simultaneously
- Single source of truth (transcript) means no consistency issues

### State Changes Required

```typescript
// page.tsx additions
const [outline, setOutline] = useState<string>('');

// History entry expansion
export interface HistoryEntry {
  // ... existing fields ...
  outline: string;  // NEW
}
```

### Database Migration

IndexedDB schema change:
```typescript
this.version(2).stores({
  history: '++id, videoId, processedAt'
}).upgrade(tx => {
  // Add outline field to existing entries
  return tx.table('history').toCollection().modify(entry => {
    entry.outline = '';
  });
});
```

---

## Long Transcript Strategy

### Token Budget Analysis

**GPT-4o specifications:**
- Context window: 128,000 tokens
- Max output: 16,384 tokens (configurable, default often 4,096)
- Token ratio: ~1.33 tokens per word (English)

**Transcript size estimates:**
| Video Length | Words | Tokens (est.) | Fits 128k? |
|--------------|-------|---------------|------------|
| 30 min | 5,000-7,500 | 6,500-10,000 | YES |
| 1 hour | 10,000-15,000 | 13,000-20,000 | YES |
| 2 hours | 20,000-30,000 | 26,000-40,000 | YES |
| 3 hours | 30,000-45,000 | 40,000-60,000 | YES, but... |

**Critical insight:** Even 3-hour transcripts fit in GPT-4o's context window. However, the "lost in the middle" problem means single-pass processing degrades quality for videos over ~45-60 minutes. See PITFALLS.md for details.

### Recommendation: Adaptive Strategy

**For transcripts under 15,000 words (~60 min):**
- Single-pass processing
- Full transcript in context
- One streaming call to `/api/outline`

**For transcripts over 15,000 words:**
- Chunked processing with map-reduce
- Each chunk: ~4,000-5,000 words (15-20 minutes of content)
- 500-word overlap between chunks (2-3 minutes)
- Two-stage: Extract per-chunk, then consolidate

### Chunking Implementation

```typescript
interface TimestampedChunk {
  text: string;
  startMs: number;
  endMs: number;
  wordCount: number;
}

function chunkTranscript(
  segments: TranscriptSegment[],
  targetWords: number = 4500,
  overlapWords: number = 500
): TimestampedChunk[] {
  // Split by word count while preserving timestamp boundaries
  // Each chunk knows its time range for accurate timestamp reporting
}
```

**Key architectural decision:** Chunking happens on the server (in the API route), not the client. Client sends full transcript; server decides whether to chunk.

### Why Not Always Chunk?

For short videos, single-pass is:
- Faster (one API call vs many)
- More coherent (no merge artifacts)
- Cheaper (fewer total tokens)

Chunking adds complexity only when reliability requires it.

---

## Timestamp Handling

### Current State

Timestamps exist but are discarded:
- `TranscriptSegment.offset` (ms) is available from YouTube captions
- `formatTranscriptIntoParagraphs()` merges text, drops timestamps
- Streaming endpoints receive plain text with no time information

### Recommendation: Timestamp-Aware Processing

**Option A: Inline timestamps in transcript (RECOMMENDED)**

Send transcript with embedded timestamps:
```
[00:00:15] Welcome to this video about React hooks.
[00:00:22] Today we'll cover useState, useEffect, and custom hooks.
[00:00:45] Let's start with useState.
```

**Advantages:**
- Simple implementation
- LLM can reference timestamps directly
- Works with single-pass and chunked approaches
- Backward compatible (just changes input format)

**Implementation:**

```typescript
function formatTranscriptWithTimestamps(
  segments: TranscriptSegment[],
  intervalMs: number = 30000  // Timestamp every 30 seconds
): string {
  let result = '';
  let lastTimestamp = -intervalMs;

  for (const segment of segments) {
    if (segment.offset - lastTimestamp >= intervalMs) {
      const formatted = formatTimestamp(segment.offset);
      result += `\n[${formatted}] `;
      lastTimestamp = segment.offset;
    }
    result += segment.text + ' ';
  }

  return result.trim();
}

function formatTimestamp(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
```

**Option B: Structured timestamp array (separate parameter)**

Send timestamps as metadata alongside transcript:
```typescript
{
  transcript: "Welcome to this video...",
  timestampMap: [
    { wordIndex: 0, ms: 15000 },
    { wordIndex: 12, ms: 22000 },
    ...
  ]
}
```

**Disadvantages:**
- More complex prompt engineering
- LLM must cross-reference two data structures
- Higher cognitive load on model

**Recommendation: Use Option A (inline timestamps).** It's simpler, more robust, and the LLM naturally incorporates the timestamps into its output.

### Timestamp Validation

All timestamps in generated outlines should be validated:

```typescript
function validateTimestamps(outline: OutlineSection[], videoDurationMs: number): boolean {
  for (const section of outline) {
    if (section.startMs < 0 || section.startMs > videoDurationMs) {
      return false;  // Invalid timestamp
    }
  }
  return true;
}
```

---

## Parallel vs Sequential Processing Decisions

### Always Parallel

| Operation | Reason |
|-----------|--------|
| Summary + Key Points + Outline | No dependencies, user sees all tabs filling |
| Chunk processing (map stage) | Each chunk is independent |

### Always Sequential

| Operation | Reason |
|-----------|--------|
| Fetch metadata -> Fetch transcript | Transcript requires valid video |
| Map chunks -> Reduce/consolidate | Consolidation needs all chunk outputs |

### Conditional

| Operation | Parallel When | Sequential When |
|-----------|---------------|-----------------|
| Outline generation | Short videos (<60 min) | Long videos need chunk-then-consolidate |

---

## Recommended Data Flow: v1.1

### Short Video Path (<60 min, <15k words)

```
URL Input
    |
    v
[Server Action: processVideo]
    |
    +-- fetchTranscript() --> TranscriptSegment[] (with timestamps)
    +-- formatWithTimestamps() --> timestampedTranscript
    |
    v
[Client: page.tsx]
    |
    +-- Parallel streams:
            |
            +-- POST /api/summarize --> summary
            +-- POST /api/key-points --> keyPoints
            +-- POST /api/outline --> outline (single-pass)
    |
    v
[saveToHistory with outline]
```

### Long Video Path (>60 min, >15k words)

```
URL Input
    |
    v
[Server Action: processVideo]
    |
    +-- fetchTranscript() --> TranscriptSegment[]
    +-- formatWithTimestamps() --> timestampedTranscript
    |
    v
[Client: page.tsx]
    |
    +-- Parallel streams:
            |
            +-- POST /api/summarize --> summary
            +-- POST /api/key-points --> keyPoints
            +-- POST /api/outline:
                    |
                    +-- Server chunks transcript
                    +-- Parallel: extract outline per chunk (internal)
                    +-- Sequential: consolidate chunks
                    +-- Stream final outline
    |
    v
[saveToHistory with outline]
```

**Client sees:** Single streaming response from `/api/outline`, unaware of internal chunking.

---

## API Route Design: /api/outline

```typescript
// src/app/api/outline/route.ts

import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const maxDuration = 120;  // Longer timeout for chunked processing

const WORD_THRESHOLD = 15000;  // ~60 minutes
const CHUNK_SIZE = 4500;       // ~18 minutes
const OVERLAP = 500;           // ~2 minutes

export async function POST(req: Request) {
  const { transcript, videoTitle, videoDurationMs } = await req.json();

  const wordCount = transcript.split(/\s+/).length;

  if (wordCount <= WORD_THRESHOLD) {
    // Single-pass for short videos
    return streamSinglePass(transcript, videoTitle);
  } else {
    // Chunked processing for long videos
    return streamChunked(transcript, videoTitle, videoDurationMs);
  }
}
```

### Single-Pass Prompt

```typescript
const result = streamText({
  model: openai('gpt-4o'),
  temperature: 0,
  system: `You are an expert at creating detailed, hierarchical outlines from video transcripts.
Your outlines are comprehensive and organized by topic, not chronologically.
Include timestamps from the transcript in brackets [MM:SS] at the start of each section.
Use consistent hierarchy: ## for major topics, ### for subtopics, - for points.`,
  prompt: `Create a comprehensive outline of this video transcript from "${videoTitle}".

Requirements:
- Organize by TOPIC, not chronologically
- Include timestamp [MM:SS] at start of each major section
- Cover ALL distinct points (aim for near-complete coverage)
- Use ## for major topics, ### for subtopics, - for bullet points
- Each major topic should have multiple supporting points

TRANSCRIPT:
${transcript}`,
  maxOutputTokens: 8000,  // Allow longer outlines
});
```

### Chunked Processing

```typescript
async function streamChunked(transcript: string, title: string, durationMs: number) {
  // 1. Split into chunks
  const chunks = chunkTranscript(transcript, CHUNK_SIZE, OVERLAP);

  // 2. Extract outline from each chunk (parallel)
  const chunkOutlines = await Promise.all(
    chunks.map(chunk => extractChunkOutline(chunk, title))
  );

  // 3. Consolidate into final outline (sequential, streaming)
  return streamConsolidation(chunkOutlines, title, durationMs);
}
```

---

## Suggested Build Order

Based on dependencies and the existing architecture:

### Phase 1: Foundation

1. **Timestamp formatting utility**
   - Create `formatTranscriptWithTimestamps()`
   - Update `processVideo` to return timestamped version
   - No breaking changes (adds field, doesn't modify existing)

2. **Basic outline API route**
   - Single-pass only (short videos)
   - Streaming response like existing endpoints
   - Test with <60 min videos

3. **UI integration**
   - Add Outline tab to ResultsTabs
   - Add outline state to page.tsx
   - Wire up parallel streaming

4. **Database migration**
   - Add `outline` field to HistoryEntry
   - Dexie version upgrade

### Phase 2: Long Video Support

5. **Chunking infrastructure**
   - `chunkTranscript()` utility
   - Word count detection in API route

6. **Per-chunk outline extraction**
   - Parallel processing of chunks
   - Intermediate outline format

7. **Consolidation logic**
   - Merge overlapping content
   - Topic reorganization
   - Streaming of final result

### Phase 3: Quality

8. **Timestamp validation**
   - Verify timestamps within video duration
   - Handle edge cases

9. **Coverage verification** (optional, per PITFALLS.md)
   - Length proportionality check
   - QAG-based coverage detection

---

## Component Boundaries

| Component | Responsibility | Location |
|-----------|---------------|----------|
| Timestamp formatting | Convert segments to timestamped text | `src/lib/youtube/format-transcript.ts` |
| Transcript chunking | Split long transcripts with overlap | `src/lib/chunking/index.ts` (new) |
| Outline API route | Handle single-pass or chunked flow | `src/app/api/outline/route.ts` (new) |
| Outline view component | Display hierarchical outline with timestamps | `src/components/outline-view.tsx` (new) |
| Results tabs | Add 4th tab for outline | `src/components/results-tabs.tsx` |
| History schema | Store outline with video data | `src/lib/db/index.ts` |

---

## Scalability Considerations

| Concern | Current (v1) | v1.1 Short Videos | v1.1 Long Videos |
|---------|--------------|-------------------|------------------|
| API calls per video | 2 | 3 | 3 + (N chunks * 2) |
| Total tokens | ~5k in, ~3.5k out | ~5k in, ~11.5k out | ~40k in, ~20k out |
| Processing time | 5-15s | 8-20s | 30-90s |
| Storage per video | ~20KB | ~30KB | ~50KB |

**Bottleneck for long videos:** Chunk consolidation is sequential and adds latency. However, this is unavoidable for quality reasons (can't stream final outline until all chunks processed).

---

## Integration with Existing Code

### Minimal Changes to Existing Files

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `outline` to `HistoryEntry` |
| `src/app/page.tsx` | Add `outline` state, third parallel stream |
| `src/components/results-tabs.tsx` | Add Outline tab |
| `src/lib/db/index.ts` | Schema v2, add outline to save/load |
| `src/lib/youtube/format-transcript.ts` | Add `formatTranscriptWithTimestamps()` |

### New Files

| File | Purpose |
|------|---------|
| `src/app/api/outline/route.ts` | Outline generation endpoint |
| `src/components/outline-view.tsx` | Outline display component |
| `src/lib/chunking/index.ts` | Transcript chunking utilities |

---

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Parallel streaming pattern | HIGH | Already proven in v1 codebase |
| Inline timestamps | HIGH | Simple text preprocessing, no model changes |
| Single-pass for short videos | HIGH | Within proven context limits |
| Chunking for long videos | MEDIUM | Architecture clear, chunk size needs empirical tuning |
| Consolidation quality | MEDIUM | Map-reduce is documented pattern, but quality varies |

---

## Sources

### OpenAI/GPT-4o
- [GPT-4o Model Documentation](https://platform.openai.com/docs/models/gpt-4o)
- [OpenAI Token Counter](https://pricepertoken.com/token-counter/model/openai-gpt-4o)
- [GPT-4o Max Output Tokens](https://community.openai.com/t/gpt-4o-max-tokens-output-response-length/748822)

### AI SDK
- [AI SDK streamText Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
- [AI SDK Generating Text](https://ai-sdk.dev/docs/ai-sdk-core/generating-text)

### Long Document Processing
- [The Context Window Illusion](https://dev.to/tawe/the-context-window-illusion-why-your-128k-tokens-arent-working-4ica)
- [Google Cloud: Long Document Summarization](https://cloud.google.com/blog/products/ai-machine-learning/long-document-summarization-with-workflows-and-gemini-models)
- [Pinecone: Chunking Strategies](https://www.pinecone.io/learn/chunking-strategies/)

### Hierarchical Outline Generation
- [OpenCredo: Hierarchical Expansion](https://www.opencredo.com/blogs/how-to-use-llms-to-generate-coherent-long-form-content-using-hierarchical-expansion)
- [arXiv: Outline-guided Text Generation](https://arxiv.org/html/2404.13919v1)

---
*Researched: 2026-01-19 for v1.1 Outline milestone*
