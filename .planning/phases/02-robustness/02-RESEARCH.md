# Phase 2: Robustness - Research

**Researched:** 2026-01-19
**Domain:** Audio transcription fallback with AssemblyAI speaker diarization
**Confidence:** HIGH

## Summary

This phase adds robustness to the YouTube summarizer by implementing AssemblyAI as a fallback transcription service when YouTube captions are unavailable. The research covers the AssemblyAI Node.js SDK, audio extraction from YouTube videos, and speaker diarization display.

The primary challenge is that the existing `@distube/ytdl-core` library in the project was **archived on August 16, 2025**. The recommended replacement is `youtubei.js` (v16.0.1), which provides audio stream URL extraction. AssemblyAI's SDK can accept URLs directly or buffers, simplifying the audio extraction flow.

AssemblyAI's async transcription API typically completes in under 45 seconds even for hour-long audio (1 hour 3 minutes in ~35 seconds). The SDK handles file uploads, polling, and returns strongly-typed TypeScript responses including speaker-labeled utterances.

**Primary recommendation:** Use AssemblyAI SDK with audio URL from youtubei.js (or buffer if URL approach fails), enable `speaker_labels: true`, and format utterances as "Speaker A:", "Speaker B:" turn-by-turn display.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| assemblyai | latest | Speech-to-text transcription with diarization | Official SDK, TypeScript native, handles upload/polling |
| youtubei.js | v16.0.1 | YouTube audio URL extraction | Actively maintained, replaces archived ytdl-core |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @distube/ytdl-core | 4.16.12 | YouTube audio extraction (ARCHIVED) | Already installed, may work short-term but RISKY |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| youtubei.js | Keep @distube/ytdl-core | Already installed but archived Aug 2025, will break unpredictably |
| AssemblyAI | Deepgram, Google STT | AssemblyAI has best diarization accuracy (2.9% error rate) |
| URL to AssemblyAI | Buffer upload | URLs are simpler but may have auth/expiry issues |

**Installation:**
```bash
npm install assemblyai youtubei.js
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── youtube/
│   │   ├── fetch-transcript.ts    # Existing - YouTube captions
│   │   ├── extract-audio.ts       # NEW - Audio URL extraction
│   │   └── index.ts               # Updated exports
│   └── assemblyai/
│       ├── index.ts               # Client initialization
│       ├── transcribe.ts          # Transcription with diarization
│       └── format-utterances.ts   # Speaker-labeled formatting
├── types/
│   └── index.ts                   # Extended with TranscriptSource, SpeakerUtterance
└── actions/
    └── process-video.ts           # Updated with fallback logic
```

### Pattern 1: Fallback Transcription Flow
**What:** Try YouTube captions first, fall back to AssemblyAI on failure
**When to use:** Every video processing request
**Example:**
```typescript
// Source: Derived from existing process-video.ts pattern
async function getTranscript(videoId: string): Promise<TranscriptResult> {
  // Try YouTube captions first (fast, free)
  try {
    const segments = await fetchTranscript(videoId);
    return {
      segments,
      source: 'youtube',
      hasSpeakers: false
    };
  } catch (error) {
    // Fall back to AssemblyAI (slower, costs money, has speakers)
    const result = await transcribeWithAssemblyAI(videoId);
    return {
      segments: result.segments,
      source: 'assemblyai',
      hasSpeakers: result.hasSpeakers
    };
  }
}
```

### Pattern 2: AssemblyAI Transcription with Diarization
**What:** Transcribe audio with speaker identification
**When to use:** When YouTube captions unavailable
**Example:**
```typescript
// Source: https://github.com/AssemblyAI/assemblyai-node-sdk
import { AssemblyAI } from 'assemblyai';

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!,
});

async function transcribeFromUrl(audioUrl: string): Promise<Transcript> {
  const transcript = await client.transcripts.transcribe({
    audio: audioUrl,
    speaker_labels: true,         // Enable diarization
    // speakers_expected: 2,      // Optional: set if known
  });

  if (transcript.status === 'error') {
    throw new Error(transcript.error || 'Transcription failed');
  }

  return transcript;
}
```

### Pattern 3: Audio URL Extraction with youtubei.js
**What:** Get playable audio URL from YouTube video
**When to use:** To provide audio source for AssemblyAI
**Example:**
```typescript
// Source: https://github.com/LuanRT/YouTube.js
import { Innertube } from 'youtubei.js';

async function getAudioUrl(videoId: string): Promise<string> {
  const youtube = await Innertube.create();
  const info = await youtube.getBasicInfo(videoId);

  // Choose best audio format
  const format = info.chooseFormat({ type: 'audio', quality: 'best' });
  if (!format) throw new Error('No audio format available');

  // Decipher the URL (required for playback)
  const url = format.decipher(youtube.session.player);
  return url;
}
```

### Pattern 4: Speaker Utterance Formatting
**What:** Format AssemblyAI utterances for display
**When to use:** When displaying transcripts with speaker labels
**Example:**
```typescript
// Source: https://www.assemblyai.com/docs/pre-recorded-audio/speaker-diarization
interface TranscriptUtterance {
  speaker: string;    // "A", "B", "C", etc. (capital letters)
  text: string;
  start: number;      // milliseconds
  end: number;        // milliseconds
  confidence: number;
  words: TranscriptWord[];
}

function formatUtterancesForDisplay(utterances: TranscriptUtterance[]): string {
  return utterances
    .map(u => `**Speaker ${u.speaker}:** ${u.text}`)
    .join('\n\n');
}

// Check if multiple speakers to conditionally show labels
function hasMultipleSpeakers(utterances: TranscriptUtterance[]): boolean {
  const speakers = new Set(utterances.map(u => u.speaker));
  return speakers.size > 1;
}
```

### Anti-Patterns to Avoid
- **Passing YouTube URLs directly to AssemblyAI:** YouTube page URLs don't work. Must extract actual audio stream URL first.
- **Using deprecated @distube/ytdl-core long-term:** Archived Aug 2025, will break without warning when YouTube changes APIs.
- **Blocking UI on long transcriptions:** AssemblyAI can take 30-130+ seconds. Show clear progress indication.
- **Showing speaker labels for single speaker:** Check utterance speaker variation before adding "Speaker A:" prefixes.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Speech-to-text | Custom Whisper integration | AssemblyAI SDK | Handles audio formats, encoding, error retry |
| Speaker detection | Custom diarization | AssemblyAI `speaker_labels` | Industry-leading 2.9% error rate |
| Audio URL extraction | Custom YouTube scraping | youtubei.js | Handles YouTube's changing APIs and deciphering |
| Transcript polling | Manual setInterval loop | AssemblyAI SDK `transcribe()` | Built-in polling with configurable intervals |
| Retry logic | Manual retry loops | AssemblyAI SDK built-in | Handles transient errors gracefully |

**Key insight:** AssemblyAI's SDK abstracts away file upload, format handling, polling, and error retry. Don't implement these manually.

## Common Pitfalls

### Pitfall 1: Server Action Timeout on Vercel
**What goes wrong:** AssemblyAI transcription takes 30-130+ seconds but function times out
**Why it happens:** Default timeout may be insufficient for long transcriptions
**How to avoid:**
- Vercel with Fluid Compute (default): 300s (5 min) default on all plans
- Add `export const maxDuration = 300;` to page or route handler for explicit control
- For longer videos, consider using `submit()` + client polling instead of blocking `transcribe()`
**Warning signs:** 504 Gateway Timeout errors in production

### Pitfall 2: Archived ytdl-core Breaking
**What goes wrong:** Audio extraction stops working unexpectedly
**Why it happens:** `@distube/ytdl-core` was archived August 16, 2025, YouTube changes APIs frequently
**How to avoid:** Migrate to `youtubei.js` now rather than later
**Warning signs:** "Could not parse decipher function" errors, 403 errors on stream URLs

### Pitfall 3: AssemblyAI Costs Accumulating
**What goes wrong:** Unexpected bills from heavy usage
**Why it happens:** Base rate $0.15/hour + speaker diarization adds $0.02/hour = $0.17/hour total
**How to avoid:**
- Only use AssemblyAI as fallback (YouTube captions are free)
- Free tier includes $50 credits (~290 hours with diarization)
- Track usage with AssemblyAI dashboard
**Warning signs:** Many videos hitting AssemblyAI fallback (check transcript source tracking)

### Pitfall 4: Speaker Labels with Single Speaker
**What goes wrong:** All utterances show "Speaker A" which looks odd
**Why it happens:** AssemblyAI still returns speaker labels even with one speaker detected
**How to avoid:** Check if multiple speakers exist before showing labels
```typescript
const showSpeakerLabels = hasMultipleSpeakers(utterances);
```
**Warning signs:** UI shows "Speaker A:" repeatedly with no "Speaker B:"

### Pitfall 5: YouTube URL Expiration
**What goes wrong:** AssemblyAI fails to download audio from URL
**Why it happens:** YouTube audio URLs expire (typically 6 hours) and may have region restrictions
**How to avoid:**
- Download to buffer first if URL approach fails
- Implement retry with fresh URL extraction
- Consider downloading audio locally as fallback
**Warning signs:** AssemblyAI returns "could not download audio" errors

### Pitfall 6: Long Video Memory Issues
**What goes wrong:** Out of memory when downloading long videos to buffer
**Why it happens:** 3+ hour videos can be 500MB+ as buffers
**How to avoid:**
- Prefer URL approach (let AssemblyAI download directly)
- If buffer needed, implement streaming to temp file
**Warning signs:** Process crashes or slows dramatically on long videos

## Code Examples

Verified patterns from official sources:

### AssemblyAI Client Initialization
```typescript
// Source: https://github.com/AssemblyAI/assemblyai-node-sdk
import { AssemblyAI } from 'assemblyai';

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!,
});
```

### Transcription with Speaker Diarization
```typescript
// Source: https://www.assemblyai.com/docs/pre-recorded-audio/speaker-diarization
const transcript = await client.transcripts.transcribe({
  audio: audioUrl,  // or audioBuffer, or file path
  speaker_labels: true,
});

// Access utterances (turn-by-turn with speaker labels)
if (transcript.utterances) {
  for (const utterance of transcript.utterances) {
    console.log(`Speaker ${utterance.speaker}: ${utterance.text}`);
  }
}
```

### Non-Blocking Transcription (for timeout handling)
```typescript
// Source: https://github.com/AssemblyAI/assemblyai-node-sdk
// Submit job without waiting
const transcript = await client.transcripts.submit({
  audio: audioUrl,
  speaker_labels: true,
});

// Later: poll for completion (can be done from client)
const result = await client.transcripts.waitUntilReady(transcript.id, {
  pollingInterval: 3000,  // ms between polls
  pollingTimeout: 300000, // 5 minute max wait
});
```

### Audio URL Extraction with youtubei.js
```typescript
// Source: https://github.com/LuanRT/YouTube.js
import { Innertube } from 'youtubei.js';

async function extractAudioUrl(videoId: string): Promise<string> {
  const youtube = await Innertube.create();
  const info = await youtube.getBasicInfo(videoId);

  const format = info.chooseFormat({ type: 'audio', quality: 'best' });
  if (!format) throw new Error('No audio format available');

  const url = format.decipher(youtube.session.player);
  return url;
}
```

### Audio Buffer Extraction (Fallback)
```typescript
// Source: https://github.com/LuanRT/YouTube.js
async function extractAudioBuffer(videoId: string): Promise<Buffer> {
  const url = await extractAudioUrl(videoId);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}
```

### Vercel maxDuration Configuration
```typescript
// Source: https://vercel.com/docs/functions/configuring-functions/duration
// In page.tsx or route handler for Next.js App Router:
export const maxDuration = 300; // 5 minutes, sufficient for most transcriptions

// Or in vercel.json for all API routes:
// {
//   "functions": {
//     "app/api/**/*": { "maxDuration": 300 }
//   }
// }
```

### TranscriptUtterance Type Reference
```typescript
// Source: https://www.assemblyai.com/docs/pre-recorded-audio/speaker-diarization
type TranscriptUtterance = {
  speaker: string;        // "A", "B", "C", etc. (capital letters)
  text: string;           // Transcribed text for this turn
  start: number;          // Start time in milliseconds
  end: number;            // End time in milliseconds
  confidence: number;     // 0.0 to 1.0
  words: TranscriptWord[]; // Individual word details
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @distube/ytdl-core | youtubei.js v16.0.1 | Aug 2025 | ytdl-core archived, must migrate |
| Manual AssemblyAI REST calls | AssemblyAI SDK | 2024 | SDK handles upload, polling, types |
| Vercel 60s timeout (non-Fluid) | Fluid Compute 300s default | 2025 | Long transcriptions now feasible |

**Deprecated/outdated:**
- `@distube/ytdl-core`: Archived August 16, 2025. Use `youtubei.js` instead.
- Manual polling loops: Use SDK's built-in `transcribe()` or `waitUntilReady()`
- Short serverless timeouts: Fluid Compute provides 300s default

## Open Questions

Things that couldn't be fully resolved:

1. **Should we migrate from @distube/ytdl-core immediately?**
   - What we know: It's archived but may still work for now
   - What's unclear: How long until YouTube changes break it
   - Recommendation: Migrate to youtubei.js in Phase 2 to avoid future breakage

2. **URL vs Buffer for AssemblyAI?**
   - What we know: URLs are simpler but YouTube URLs can expire/have restrictions
   - What's unclear: How reliably AssemblyAI can fetch from YouTube audio URLs
   - Recommendation: Try URL first, fall back to buffer on failure

3. **How to handle very long videos (3+ hours)?**
   - What we know: AssemblyAI handles 8+ hour files in ~5 minutes
   - What's unclear: Memory usage of downloading full audio to buffer
   - Recommendation: Use URL approach for long videos, test with real-world examples

4. **Should we show transcription progress to user?**
   - What we know: AssemblyAI doesn't provide progress %, only status
   - What's unclear: Best UX for 30-130 second wait times
   - Recommendation: Show spinner with "Transcribing audio..." and explain it takes longer than captions

## Sources

### Primary (HIGH confidence)
- [AssemblyAI Node SDK GitHub](https://github.com/AssemblyAI/assemblyai-node-sdk) - SDK usage, types, examples
- [AssemblyAI Speaker Diarization Docs](https://www.assemblyai.com/docs/pre-recorded-audio/speaker-diarization) - Utterance format, speaker labels
- [AssemblyAI Pricing](https://www.assemblyai.com/pricing) - $0.15/hr + $0.02/hr diarization, $50 free credits
- [AssemblyAI FAQ: Transcription Time](https://www.assemblyai.com/docs/faq/how-long-does-it-take-to-transcribe-a-file) - Processing benchmarks (45s for 1hr)
- [Vercel Function Duration](https://vercel.com/docs/functions/configuring-functions/duration) - maxDuration configuration, Fluid Compute 300s default
- [youtubei.js GitHub](https://github.com/LuanRT/YouTube.js) - v16.0.1, audio extraction

### Secondary (MEDIUM confidence)
- [youtubei.js npm](https://www.npmjs.com/package/youtubei.js) - Installation, version info
- [@distube/ytdl-core npm](https://www.npmjs.com/package/@distube/ytdl-core) - Archived status (Aug 2025)
- [AssemblyAI SDK Reference](https://assemblyai.github.io/assemblyai-node-sdk/) - TypeScript types

### Tertiary (LOW confidence)
- Community discussions on speaker diarization UX patterns
- Stack Overflow on YouTube audio extraction approaches

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official SDK docs, clear deprecation notices verified
- Architecture: HIGH - Follows existing project patterns, SDK well-documented
- Pitfalls: HIGH - Verified through official documentation (timeouts, pricing, archived status)

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (30 days - stable domain, SDK mature)
