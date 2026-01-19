# Phase 4: Persistence - Research

**Researched:** 2026-01-19
**Domain:** Client-side storage, browser persistence, IndexedDB
**Confidence:** HIGH

## Summary

This phase adds local persistence so users can save and revisit previously processed videos without re-processing. The app currently stores all state in React component state, which is lost on page refresh or navigation.

For this use case (storing structured video data including transcripts and summaries), **IndexedDB with idb-keyval wrapper** is the recommended approach. Transcripts can be several KB to 100+ KB, making localStorage's 5MB limit risky for power users. IndexedDB has virtually unlimited storage (50% of available disk), stores structured data natively without JSON serialization, and idb-keyval provides a minimal async API.

The key architectural concern is **hydration mismatch** - since Next.js pre-renders on the server where IndexedDB doesn't exist, the component must render a consistent initial state, then hydrate from storage in useEffect.

**Primary recommendation:** Use idb-keyval for persistence, implement a custom `useVideoHistory` hook with proper SSR handling, store complete video records indexed by videoId.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| idb-keyval | ^6.2.2 | IndexedDB wrapper | 295-573 bytes, promise-based, structured-clonable data, tree-shakeable |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| idb | ^8.0.2 | Full IndexedDB wrapper | Only if need indexes, complex queries, or transactions (not needed here) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| idb-keyval | localStorage | Simpler API but 5MB limit, must stringify/parse JSON, synchronous (blocks UI) |
| idb-keyval | Zustand persist | Heavier, adds state management when React state already works |
| idb-keyval | react-indexed-db | More features but more complexity, less maintained |

**Installation:**
```bash
npm install idb-keyval
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   └── storage/
│       ├── index.ts           # Export public API
│       ├── video-store.ts     # idb-keyval operations for videos
│       └── types.ts           # Storage-specific types (or use src/types/index.ts)
├── hooks/
│   └── use-video-history.ts   # React hook for history state
├── components/
│   └── history-list.tsx       # UI for displaying video history
└── types/
    └── index.ts               # Add SavedVideo type here
```

### Pattern 1: Saved Video Data Structure
**What:** Complete record of processed video including all generated content
**When to use:** Every time a video processing completes successfully

```typescript
// Add to src/types/index.ts
export interface SavedVideo {
  videoId: string;                    // Primary key for lookup
  url: string;                        // Original URL (for display/copy)
  metadata: VideoMetadata;            // Title, author, thumbnail
  transcript: string;                 // Full transcript text
  summary: string;                    // Generated summary
  keyPoints: string;                  // Generated key points
  transcriptSource: TranscriptSource; // 'youtube' | 'assemblyai'
  hasSpeakers: boolean;               // For transcript display
  savedAt: number;                    // Unix timestamp for sorting
}
```

### Pattern 2: Storage Operations Module
**What:** Thin wrapper around idb-keyval for video-specific operations
**When to use:** All persistence operations

```typescript
// src/lib/storage/video-store.ts
import { get, set, del, keys, getMany, delMany } from 'idb-keyval';
import { SavedVideo } from '@/types';

const VIDEO_PREFIX = 'video:';

export async function saveVideo(video: SavedVideo): Promise<void> {
  await set(`${VIDEO_PREFIX}${video.videoId}`, video);
}

export async function getVideo(videoId: string): Promise<SavedVideo | undefined> {
  return get(`${VIDEO_PREFIX}${videoId}`);
}

export async function getAllVideos(): Promise<SavedVideo[]> {
  const allKeys = await keys();
  const videoKeys = allKeys.filter(k =>
    typeof k === 'string' && k.startsWith(VIDEO_PREFIX)
  );
  const videos = await getMany(videoKeys);
  // Sort by savedAt descending (most recent first)
  return videos.filter(Boolean).sort((a, b) => b.savedAt - a.savedAt);
}

export async function deleteVideo(videoId: string): Promise<void> {
  await del(`${VIDEO_PREFIX}${videoId}`);
}

export async function deleteAllVideos(): Promise<void> {
  const allKeys = await keys();
  const videoKeys = allKeys.filter(k =>
    typeof k === 'string' && k.startsWith(VIDEO_PREFIX)
  );
  await delMany(videoKeys);
}
```

### Pattern 3: Custom Hook with SSR-Safe Hydration
**What:** React hook that manages history state with proper hydration
**When to use:** In page.tsx to manage video history

```typescript
// src/hooks/use-video-history.ts
import { useState, useEffect, useCallback } from 'react';
import { SavedVideo } from '@/types';
import { getAllVideos, saveVideo, deleteVideo, getVideo } from '@/lib/storage/video-store';

export function useVideoHistory() {
  const [history, setHistory] = useState<SavedVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load history on mount (client-side only)
  useEffect(() => {
    getAllVideos()
      .then(setHistory)
      .finally(() => setIsLoading(false));
  }, []);

  const addVideo = useCallback(async (video: SavedVideo) => {
    await saveVideo(video);
    setHistory(prev => {
      // Remove existing if present (update case)
      const filtered = prev.filter(v => v.videoId !== video.videoId);
      return [video, ...filtered];
    });
  }, []);

  const removeVideo = useCallback(async (videoId: string) => {
    await deleteVideo(videoId);
    setHistory(prev => prev.filter(v => v.videoId !== videoId));
  }, []);

  const loadVideo = useCallback(async (videoId: string) => {
    return getVideo(videoId);
  }, []);

  return {
    history,
    isLoading,
    addVideo,
    removeVideo,
    loadVideo,
  };
}
```

### Pattern 4: History List Component
**What:** Displays saved videos as clickable list items
**When to use:** On the main page, shows past videos

```typescript
// Basic structure for history-list.tsx
interface HistoryListProps {
  videos: SavedVideo[];
  onSelect: (video: SavedVideo) => void;
  onDelete: (videoId: string) => void;
  isLoading?: boolean;
}

// Each list item shows:
// - Thumbnail (small)
// - Title (truncated)
// - Author
// - Saved date (relative: "2 hours ago")
// - Delete button (icon)
```

### Anti-Patterns to Avoid
- **Storing in localStorage:** Transcripts can be large (10-100KB+). With 5MB limit and JSON overhead, you could hit limits with 20-50 videos.
- **Synchronous reads during render:** Causes hydration mismatch. Always use useEffect for storage reads.
- **Storing in React state only:** State is lost on refresh - defeats the purpose.
- **Storing raw segments array:** The `rawSegments` array can be huge. Store only the formatted `transcript` string.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IndexedDB wrapper | Custom IDB code | idb-keyval | IDB API is complex, async, needs version/upgrade handling |
| Relative time formatting | Custom date math | Native Intl.RelativeTimeFormat | Built into browsers, handles i18n |
| Async state sync | Manual Promise handling | The hook pattern above | Race conditions, error handling |

**Key insight:** IndexedDB's raw API requires handling database versioning, transactions, and upgrade events. idb-keyval abstracts all of this into a simple key-value interface that covers 95% of use cases.

## Common Pitfalls

### Pitfall 1: Hydration Mismatch
**What goes wrong:** Server renders empty list, client has data = React error
**Why it happens:** IndexedDB only exists on client, SSR has no access
**How to avoid:** Render loading state initially, hydrate in useEffect
**Warning signs:** Console error "Hydration failed because the initial UI does not match"

### Pitfall 2: Storing Too Much Data
**What goes wrong:** Each video stores redundant data, storage fills up
**Why it happens:** Temptation to store everything "just in case"
**How to avoid:** Only store what's needed for display and restoration:
- videoId, url, metadata, transcript, summary, keyPoints, transcriptSource, hasSpeakers, savedAt
- Do NOT store: rawSegments (can be huge), utterances (redundant with transcript)
**Warning signs:** Storage quota warnings, slow load times

### Pitfall 3: No Deduplication
**What goes wrong:** Same video saved multiple times, list has duplicates
**Why it happens:** User processes same video twice
**How to avoid:** Use videoId as key, update existing record instead of creating new
**Warning signs:** History shows same video multiple times

### Pitfall 4: Async State Race Conditions
**What goes wrong:** Stale state when rapidly adding/removing videos
**Why it happens:** Multiple async operations interleave incorrectly
**How to avoid:** Use functional state updates `setHistory(prev => ...)`, not `setHistory(newValue)`
**Warning signs:** UI doesn't reflect recent changes, data appears/disappears randomly

### Pitfall 5: Not Handling Storage Errors
**What goes wrong:** Silent failures when storage is full or unavailable
**Why it happens:** Private browsing mode, storage quota exceeded, IDB unavailable
**How to avoid:** Wrap storage operations in try/catch, show user feedback
**Warning signs:** Videos not appearing in history after processing

## Code Examples

Verified patterns from official sources:

### Basic idb-keyval Usage
```typescript
// Source: https://github.com/jakearchibald/idb-keyval
import { get, set, del, keys } from 'idb-keyval';

// Store any structured-clonable value
await set('myKey', { name: 'value', date: new Date() });

// Retrieve (returns undefined if not found)
const value = await get('myKey');

// Delete
await del('myKey');

// Get all keys
const allKeys = await keys();
```

### Batch Operations (More Efficient)
```typescript
// Source: https://github.com/jakearchibald/idb-keyval
import { getMany, setMany, delMany } from 'idb-keyval';

// Set multiple values atomically
await setMany([
  ['video:abc123', videoData1],
  ['video:def456', videoData2],
]);

// Get multiple values
const videos = await getMany(['video:abc123', 'video:def456']);

// Delete multiple keys
await delMany(['video:abc123', 'video:def456']);
```

### Atomic Updates (Avoid Race Conditions)
```typescript
// Source: https://github.com/jakearchibald/idb-keyval
import { update } from 'idb-keyval';

// Wrong: get then set (race condition)
const val = await get('counter');
await set('counter', val + 1);

// Right: atomic update
await update('counter', (val) => (val || 0) + 1);
```

### SSR-Safe Component Pattern
```typescript
// Source: Next.js documentation
'use client';

import { useState, useEffect } from 'react';

export function HistoryList() {
  const [mounted, setMounted] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setMounted(true);
    // Load from storage here
  }, []);

  // Render loading state until mounted
  if (!mounted) {
    return <div>Loading history...</div>;
  }

  return (
    <ul>
      {history.map(video => (
        <li key={video.videoId}>{video.metadata.title}</li>
      ))}
    </ul>
  );
}
```

### Relative Time Formatting
```typescript
// Native browser API - no library needed
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;
  const diffMinutes = Math.round(diff / 60000);
  const diffHours = Math.round(diff / 3600000);
  const diffDays = Math.round(diff / 86400000);

  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute');
  } else if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  } else {
    return rtf.format(diffDays, 'day');
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localStorage for everything | IndexedDB for structured data | ~2020 | Can store large objects, no JSON serialization |
| Heavy ORMs (localForage) | Minimal wrappers (idb-keyval) | ~2022 | Smaller bundles, simpler API |
| Custom IDB boilerplate | idb-keyval/idb libraries | ~2018 | No version management needed for simple use |

**Deprecated/outdated:**
- Web SQL: Deprecated, removed from browsers
- localForage: Still works but heavier than idb-keyval (7KB vs 573 bytes)

## Open Questions

Things that couldn't be fully resolved:

1. **Storage Quota Management**
   - What we know: IndexedDB can use up to 50% of disk, browsers may prompt or auto-evict
   - What's unclear: Exact behavior varies by browser/device
   - Recommendation: Implement optional "clear all history" button, don't worry about quota for MVP

2. **Export/Import History**
   - What we know: Users might want to backup/transfer history
   - What's unclear: Whether this is needed for MVP
   - Recommendation: Defer to future phase, structure data to be JSON-exportable

## Sources

### Primary (HIGH confidence)
- [idb-keyval GitHub](https://github.com/jakearchibald/idb-keyval) - Full API documentation, usage patterns
- [idb-keyval npm](https://www.npmjs.com/package/idb-keyval) - Version 6.2.2 verified
- [Next.js Hydration Error Docs](https://nextjs.org/docs/messages/react-hydration-error) - SSR/client mismatch handling

### Secondary (MEDIUM confidence)
- [MDN Client-side Storage](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Client-side_APIs/Client-side_storage) - IndexedDB vs localStorage comparison
- [LogRocket Hydration Errors](https://blog.logrocket.com/resolving-hydration-mismatch-errors-next-js/) - Next.js patterns

### Tertiary (LOW confidence)
- [DEV.to LocalStorage vs IndexedDB](https://dev.to/tene/localstorage-vs-indexeddb-javascript-guide-storage-limits-best-practices-fl5) - Storage limits comparison
- [Medium IndexedDB Guide](https://medium.com/@artyom.danielyan/a-simple-guide-to-indexeddb-in-react-8ff73bbf17b4) - React integration patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - idb-keyval is widely used, well-documented, minimal (verified via npm registry)
- Architecture: HIGH - Patterns are standard React/Next.js practices
- Pitfalls: HIGH - Well-documented issues with storage and SSR
- Data structure: HIGH - Based on existing types in codebase

**Research date:** 2026-01-19
**Verified:** 2026-01-19 (idb-keyval v6.2.2 confirmed, API validated)
**Valid until:** 2026-02-19 (stable domain, 30 days)
