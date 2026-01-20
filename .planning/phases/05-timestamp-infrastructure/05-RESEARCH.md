# Phase 5: Timestamp Infrastructure - Research

**Researched:** 2026-01-19
**Domain:** Transcript timestamp processing and display
**Confidence:** HIGH

## Summary

Timestamp infrastructure involves three concerns: (1) preserving timestamp data from transcript sources, (2) formatting timestamps for display with clickable navigation, and (3) persisting timestamp data for downstream use.

Both youtube-caption-extractor and AssemblyAI return timestamps in their responses - the data already exists, but the current implementation discards it when formatting into plain text paragraphs. The fix is to preserve raw segments through the pipeline and use them when rendering.

YouTube timestamps use a simple URL parameter (`&t=90` for 90 seconds), making clickable timestamps trivial to implement - just generate anchor tags with the correct URL.

**Primary recommendation:** Store raw segments with timestamps alongside formatted text. Render timestamps inline using react-string-replace pattern. Generate YouTube deep links using `&t={seconds}` parameter.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-string-replace | latest | Pattern replacement with React components | <1KB, type-safe, XSS-safe, widely used |
| Native Date/Math | built-in | Milliseconds to MM:SS formatting | No library needed for simple conversion |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | - | - | No additional libraries needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-string-replace | react-linkify-it | Heavier, more features than needed |
| react-string-replace | dangerouslySetInnerHTML | XSS risk, less React-idiomatic |
| Manual formatting | date-fns | Overkill for simple MM:SS conversion |

**Installation:**
```bash
npm install react-string-replace
```

## Timestamp Data Formats

### YouTube Captions (youtube-caption-extractor)

**Source:** getSubtitles() from youtube-caption-extractor 1.9.1

```typescript
// Each caption segment has:
interface Subtitle {
  start: string;  // Start time in SECONDS as string (e.g., "0.24", "125.5")
  dur: string;    // Duration in SECONDS as string (e.g., "5.96")
  text: string;   // Caption text content
}
```

**Current code already converts to:**
```typescript
interface TranscriptSegment {
  text: string;
  offset: number;  // Start time in MILLISECONDS
  duration: number; // Duration in MILLISECONDS
}
```

**Key insight:** The data is already normalized to milliseconds in the existing codebase.

### AssemblyAI Transcription

**Source:** AssemblyAI TypeScript SDK v4.22.1

```typescript
// Word-level timestamps
interface TranscriptWord {
  text: string;
  start: number;      // Start time in MILLISECONDS
  end: number;        // End time in MILLISECONDS
  confidence: number; // 0-1 confidence score
  speaker?: string;   // "A", "B", etc. if diarization enabled
  channel?: string;   // For multi-channel audio
}

// Utterance-level (speaker turns)
interface TranscriptUtterance {
  speaker: string;
  text: string;
  start: number;      // MILLISECONDS
  end: number;        // MILLISECONDS
  confidence: number;
  words: TranscriptWord[];
}
```

**Current code creates:**
```typescript
// From words array
segments: TranscriptSegment[] = transcript.words.map(w => ({
  text: w.text,
  offset: w.start,     // Already in ms
  duration: w.end - w.start,
}));

// From utterances array (when speakers detected)
utterances: SpeakerUtterance[] = transcript.utterances.map(u => ({
  speaker: u.speaker,
  text: u.text,
  startMs: u.start,
  endMs: u.end,
}));
```

### Normalized Internal Format

Both sources converge to `TranscriptSegment[]`:

```typescript
interface TranscriptSegment {
  text: string;
  offset: number;   // Start time in milliseconds
  duration: number; // Duration in milliseconds
}
```

**Confidence:** HIGH - Verified from existing codebase and official SDK types.

## Architecture Patterns

### Recommended Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Current (v1) Flow                          │
├─────────────────────────────────────────────────────────────────┤
│ Source → TranscriptSegment[] → formatIntoParagraphs() → string │
│                                                                 │
│ Problem: Timestamps LOST in formatting step                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Proposed (v1.1) Flow                       │
├─────────────────────────────────────────────────────────────────┤
│ Source → TranscriptSegment[] ──┬── formatIntoParagraphs() ───┐ │
│                                │                              │ │
│                                └── PRESERVED ─────────────────┤ │
│                                                               │ │
│ History stores: { transcript: string, segments: Segment[] }  │ │
│                                                               │ │
│ Display uses segments to inject inline timestamps             │ │
└─────────────────────────────────────────────────────────────────┘
```

### Pattern 1: Timestamp Injection During Render

**What:** Instead of modifying stored text, inject timestamps at render time from preserved segments.

**When to use:** When displaying transcript in UI with clickable timestamps.

**Example:**
```typescript
// Generate timestamp markers from segments at regular intervals
function generateTimestampMarkers(
  segments: TranscriptSegment[],
  intervalMs: number = 30000 // 30 seconds
): Map<number, number> {
  // Map: character position → timestamp in ms
  const markers = new Map<number, number>();
  let charPosition = 0;
  let lastMarkerTime = -intervalMs;

  for (const segment of segments) {
    if (segment.offset - lastMarkerTime >= intervalMs) {
      markers.set(charPosition, segment.offset);
      lastMarkerTime = segment.offset;
    }
    charPosition += segment.text.length + 1; // +1 for space
  }

  return markers;
}
```

### Pattern 2: Clickable Timestamp Component

**What:** React component that renders as a timestamp link opening YouTube at that moment.

**When to use:** For every inline timestamp in the transcript.

**Example:**
```typescript
interface TimestampLinkProps {
  videoId: string;
  timeMs: number;
  className?: string;
}

function TimestampLink({ videoId, timeMs, className }: TimestampLinkProps) {
  const seconds = Math.floor(timeMs / 1000);
  const formatted = formatTimestamp(timeMs); // "1:23" or "1:23:45"
  const url = `https://www.youtube.com/watch?v=${videoId}&t=${seconds}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      [{formatted}]
    </a>
  );
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
```

### Pattern 3: Text with Inline Timestamps

**What:** Use react-string-replace to inject timestamp components into formatted text.

**When to use:** For rendering transcript with inline clickable timestamps.

**Example:**
```typescript
import reactStringReplace from 'react-string-replace';

function TranscriptWithTimestamps({
  transcript: string,
  segments: TranscriptSegment[],
  videoId: string,
  intervalMs: number = 30000
}) {
  // Insert timestamp markers into text
  const textWithMarkers = insertTimestampMarkers(transcript, segments, intervalMs);

  // Replace markers with clickable components
  // Marker format: [TS:123456] where 123456 is milliseconds
  const content = reactStringReplace(
    textWithMarkers,
    /\[TS:(\d+)\]/g,
    (match, i) => (
      <TimestampLink
        key={`ts-${match}`}
        videoId={videoId}
        timeMs={parseInt(match, 10)}
      />
    )
  );

  return <div>{content}</div>;
}
```

### Anti-Patterns to Avoid

- **Storing formatted text with timestamp strings:** Hard to change format later, makes copy-to-clipboard messy
- **Parsing timestamps from formatted text:** Fragile, error-prone, unnecessary when raw data available
- **Modifying original transcript text:** Store raw segments separately, format at render time
- **Using dangerouslySetInnerHTML for timestamps:** XSS risk, breaks React component model

## YouTube URL Timestamp Format

### URL Parameter Syntax

| Format | Example | Notes |
|--------|---------|-------|
| Seconds only | `&t=90` | 1 minute 30 seconds |
| Seconds with 's' | `&t=90s` | Explicit, recommended |
| Minutes + seconds | `&t=1m30s` | Human-readable |
| Full format | `&t=1h30m25s` | For long videos |

### URL Construction

```typescript
function createYouTubeTimestampUrl(videoId: string, timeMs: number): string {
  const seconds = Math.floor(timeMs / 1000);
  return `https://www.youtube.com/watch?v=${videoId}&t=${seconds}`;
}
```

**Key points:**
- Use `&t=` (not `?t=`) since URL already has `?v=`
- YouTube does NOT support decimal seconds (no `t=1.5`)
- YouTube Shorts do NOT support timestamp parameters
- Works on all YouTube platforms (web, mobile, app)

**Confidence:** HIGH - Verified from official YouTube documentation and multiple sources.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pattern replacement with React components | Custom regex + dangerouslySetInnerHTML | react-string-replace | XSS safety, type safety, edge cases handled |
| Timestamp formatting | Complex date library | Simple Math.floor + padStart | Under 10 lines, no dependencies needed |
| URL encoding | Manual string concatenation | Template literal with URL-safe videoId | YouTube videoIds are already URL-safe |

**Key insight:** The timestamp problem is simpler than it appears. No special libraries needed beyond react-string-replace for safe component injection.

## Common Pitfalls

### Pitfall 1: Losing Timestamp Data in Formatting

**What goes wrong:** Converting segments to plain text destroys timestamp information.

**Why it happens:** Current `formatTranscriptIntoParagraphs()` joins text and discards offsets.

**How to avoid:**
- Store raw segments alongside formatted text
- Never rely on formatted text as the only source
- Treat formatted text as a view, segments as the source of truth

**Warning signs:** Can't implement clickable timestamps without re-fetching.

### Pitfall 2: Inconsistent Timestamp Intervals

**What goes wrong:** Timestamps appear mid-word or break sentence flow.

**Why it happens:** Inserting markers at exact time intervals without considering text boundaries.

**How to avoid:**
- Insert timestamps AFTER the segment that crosses the interval threshold
- Never split words or sentences
- Accept that intervals will be approximate (30-45 seconds, not exactly 30)

**Warning signs:** "[1:30]word" instead of "[1:30] word" or natural breaks.

### Pitfall 3: Breaking Copy-to-Clipboard

**What goes wrong:** Copied text includes "[1:30]" markers that don't work in other contexts.

**Why it happens:** Timestamps rendered as visible text in the DOM.

**How to avoid:**
- Keep timestamps as React components, not inserted text
- Implement separate copy logic that uses original formatted text
- Consider a toggle to show/hide timestamps

**Warning signs:** User complaints about messy pasted content.

### Pitfall 4: Schema Migration Issues

**What goes wrong:** Existing history entries don't have segments field.

**Why it happens:** Adding new required field without migration.

**How to avoid:**
- Use Dexie version upgrade with migration function
- Make segments field optional in TypeScript
- Handle gracefully when segments are undefined (show text without timestamps)

**Warning signs:** App crashes when viewing old history entries.

## Code Examples

### Milliseconds to Display Format

```typescript
// Source: Standard JavaScript, no library needed
function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

// Examples:
// formatTimestamp(90000)    → "1:30"
// formatTimestamp(3665000)  → "1:01:05"
// formatTimestamp(45000)    → "0:45"
```

### Dexie Schema Migration

```typescript
// Source: Dexie.js documentation
class AppDatabase extends Dexie {
  history!: EntityTable<HistoryEntry, 'id'>;

  constructor() {
    super('YouTubeSummarizerDB');

    // v1: Original schema
    this.version(1).stores({
      history: '++id, videoId, processedAt'
    });

    // v2: Add segments field for timestamp support
    this.version(2).stores({
      history: '++id, videoId, processedAt'
      // Note: segments not indexed, just stored
    }).upgrade(tx => {
      // Existing entries won't have segments
      // No data migration needed - segments will be undefined
      // UI handles gracefully by not showing timestamps
      return tx.table('history').toCollection().modify(entry => {
        // Optionally set empty array as default
        if (!entry.segments) {
          entry.segments = [];
        }
      });
    });
  }
}
```

### Insert Timestamp Markers

```typescript
// Insert [TS:ms] markers at ~30 second intervals
function insertTimestampMarkers(
  segments: TranscriptSegment[],
  intervalMs: number = 30000
): string {
  if (!segments.length) return '';

  const result: string[] = [];
  let lastMarkerTime = -intervalMs;

  for (const segment of segments) {
    // Check if we should insert a marker before this segment
    if (segment.offset - lastMarkerTime >= intervalMs) {
      result.push(`[TS:${segment.offset}]`);
      lastMarkerTime = segment.offset;
    }
    result.push(segment.text);
  }

  return result.join(' ').replace(/\s+/g, ' ').trim();
}
```

## Data Model Changes

### HistoryEntry Update

```typescript
// Current (v1)
export interface HistoryEntry {
  id?: number;
  videoId: string;
  url: string;
  metadata: VideoMetadata;
  transcript: string;              // Formatted text only
  transcriptSource: TranscriptSource;
  hasSpeakers: boolean;
  summary: string;
  keyPoints: string;
  processedAt: Date;
}

// Proposed (v1.1)
export interface HistoryEntry {
  id?: number;
  videoId: string;
  url: string;
  metadata: VideoMetadata;
  transcript: string;              // Formatted text (for copy, LLM use)
  segments?: TranscriptSegment[];  // Raw segments with timestamps (optional for migration)
  transcriptSource: TranscriptSource;
  hasSpeakers: boolean;
  utterances?: SpeakerUtterance[]; // Already optional
  summary: string;
  keyPoints: string;
  processedAt: Date;
}
```

### Storage Considerations

**Segment size estimate:**
- Average word: 6 chars text + 8 bytes offset + 8 bytes duration = ~22 bytes
- 10,000 words (90-minute video) = ~220KB per video
- With compression (typical): ~50-100KB per video
- IndexedDB quota: 50MB+ in most browsers

**Conclusion:** Storing segments is feasible without storage concerns.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Store formatted text only | Store segments + formatted text | This phase | Enables timestamps |
| External timestamp parsing | Preserve from source | This phase | More reliable |
| dangerouslySetInnerHTML | react-string-replace | Already standard | XSS-safe rendering |

**Deprecated/outdated:**
- None - this is a new feature addition

## Open Questions

1. **Timestamp display format**
   - What we know: Can show HH:MM:SS or MM:SS
   - What's unclear: Should very short videos show just seconds? (0:45 vs :45)
   - Recommendation: Always use MM:SS minimum, add hours when > 60 min

2. **Timestamp interval customization**
   - What we know: 30-60 seconds is standard
   - What's unclear: Should users be able to customize this?
   - Recommendation: Start with 30 seconds fixed, defer customization to v2

3. **Timestamp visibility during copy**
   - What we know: Timestamps shouldn't appear in pasted content
   - What's unclear: Best UX for toggle or automatic handling
   - Recommendation: Copy uses original formatted text without markers

## Sources

### Primary (HIGH confidence)
- youtube-caption-extractor npm documentation - subtitle format (start/dur/text)
- [AssemblyAI JS SDK Reference](https://assemblyai.github.io/assemblyai-node-sdk/types/TranscriptWord.html) - TranscriptWord type
- [AssemblyAI JS SDK Reference](https://assemblyai.github.io/assemblyai-node-sdk/types/TranscriptUtterance.html) - TranscriptUtterance type
- Existing codebase: `/src/lib/youtube/fetch-transcript.ts` - current segment handling
- Existing codebase: `/src/lib/assemblyai/transcribe.ts` - current word/utterance handling
- Existing codebase: `/src/types/index.ts` - current type definitions
- [YouTube Timestamp Link Format](https://www.sendible.com/insights/youtube-timestamp-link) - URL parameter syntax

### Secondary (MEDIUM confidence)
- [Dexie.js Version.upgrade()](https://dexie.org/docs/Version/Version.upgrade()) - schema migration patterns
- [react-string-replace GitHub](https://github.com/iansinnott/react-string-replace) - API usage

### Tertiary (LOW confidence)
- General timestamp formatting best practices from web search

## Metadata

**Confidence breakdown:**
- Timestamp data formats: HIGH - verified from existing code and official SDK docs
- YouTube URL parameters: HIGH - widely documented standard
- Dexie migration: MEDIUM - official docs, but specific upgrade pattern not tested
- React rendering pattern: MEDIUM - standard approach but implementation-specific

**Research date:** 2026-01-19
**Valid until:** 60 days (stable domain, no fast-moving dependencies)
