# Phase 2: Robustness - Research

**Researched:** 2026-01-19
**Domain:** Audio transcription fallback with AssemblyAI speaker diarization
**Confidence:** HIGH

## Summary

This phase adds robustness to the YouTube summarizer by implementing AssemblyAI as a fallback transcription service when YouTube captions are unavailable. The research covers the AssemblyAI Node.js SDK, audio extraction from YouTube videos, and speaker diarization display.

The primary challenge is that the existing `@distube/ytdl-core` library in the project is **deprecated and archived** (August 2025). The recommended replacement is `youtubei.js`, but AssemblyAI's SDK can accept buffers directly, which simplifies the audio extraction flow.

AssemblyAI's async transcription API typically completes in under 45 seconds even for hour-long audio. The SDK handles file uploads, polling, and returns strongly-typed TypeScript responses including speaker-labeled utterances.

**Primary recommendation:** Use AssemblyAI SDK with buffer upload (download audio to buffer, upload to AssemblyAI), enable `speaker_labels: true`, and format utterances as "Speaker A:", "Speaker B:" turn-by-turn display.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| assemblyai | latest | Speech-to-text transcription with diarization | Official SDK, TypeScript native, handles upload/polling |
| youtubei.js | v16.0.1 | YouTube audio extraction | Actively maintained replacement for deprecated ytdl-core |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @distube/ytdl-core | 4.16.12 | YouTube audio extraction (DEPRECATED) | Already installed, may work short-term |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| youtubei.js | Keep @distube/ytdl-core | Already installed but deprecated Aug 2025, may break |
| AssemblyAI | Deepgram, Google STT | AssemblyAI has best diarization accuracy (2.9% error rate) |
| Buffer upload | Direct URL | YouTube URLs expire in 6 hours, signed URLs more complex |

**Installation:**
```bash
npm install assemblyai
# Optional: replace deprecated ytdl-core
npm install youtubei.js
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── youtube/
│   │   ├── fetch-transcript.ts    # Existing - YouTube captions
│   │   └── extract-audio.ts       # NEW - Audio buffer extraction
│   └── assemblyai/
│       ├── index.ts               # Client initialization
│       ├── transcribe.ts          # Transcription with diarization
│       └── format-utterances.ts   # Speaker-labeled formatting
├── types/
│   └── index.ts                   # Extended with AssemblyAI types
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

### Pattern 2: AssemblyAI Buffer Upload
**What:** Download audio to buffer, upload buffer to AssemblyAI
**When to use:** When YouTube captions unavailable
**Example:**
```typescript
// Source: AssemblyAI Node SDK documentation
import { AssemblyAI } from 'assemblyai';

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!,
});

async function transcribeFromBuffer(audioBuffer: Buffer): Promise<Transcript> {
  const transcript = await client.transcripts.transcribe({
    audio: audioBuffer,           // SDK handles upload automatically
    speaker_labels: true,         // Enable diarization
    // speakers_expected: 2,      // Optional: set if known
  });

  if (transcript.status === 'error') {
    throw new Error(transcript.error || 'Transcription failed');
  }

  return transcript;
}
```

### Pattern 3: Speaker Utterance Formatting
**What:** Format AssemblyAI utterances for display
**When to use:** When displaying transcripts with speaker labels
**Example:**
```typescript
// Source: AssemblyAI SDK types
interface TranscriptUtterance {
  speaker: string;    // "A", "B", "C", etc.
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
```

### Anti-Patterns to Avoid
- **Passing YouTube URLs directly to AssemblyAI:** YouTube URLs may be region-restricted, require auth, or expire. Download to buffer first.
- **Using `transcribe()` in short-timeout contexts:** In Vercel with default 15s timeout, use `submit()` + separate polling, or configure `maxDuration`.
- **Blocking on transcription in server actions:** AssemblyAI can take 30-130+ seconds. Consider showing "transcribing" state to user.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Speech-to-text | Custom Whisper integration | AssemblyAI SDK | Handles audio formats, encoding, error retry |
| Speaker detection | Custom diarization | AssemblyAI `speaker_labels` | Industry-leading 2.9% error rate |
| Audio extraction | Custom ffmpeg pipeline | youtubei.js or buffer from ytdl-core | Handles YouTube's changing APIs |
| Transcript polling | Manual setInterval loop | AssemblyAI SDK `transcribe()` | Built-in polling with configurable intervals |
| Retry logic | Manual retry loops | AssemblyAI SDK + tenacity pattern | Handles 422/500 errors gracefully |

**Key insight:** AssemblyAI's SDK abstracts away file upload, format handling, polling, and error retry. Don't implement these manually.

## Common Pitfalls

### Pitfall 1: Server Action Timeout on Vercel
**What goes wrong:** AssemblyAI transcription takes 30-130+ seconds but Vercel server actions default to 15s timeout
**Why it happens:** Server actions have shorter timeouts than route handlers on Vercel
**How to avoid:**
- Option A: Configure `maxDuration` in page or vercel.json: `export const maxDuration = 300;`
- Option B: Use route handler instead of server action for transcription
- Option C: Use `submit()` + client-side polling instead of blocking `transcribe()`
**Warning signs:** 504 Gateway Timeout errors in production

### Pitfall 2: Deprecated ytdl-core Breaking
**What goes wrong:** Audio extraction stops working unexpectedly
**Why it happens:** `@distube/ytdl-core` archived Aug 2025, YouTube changes APIs frequently
**How to avoid:** Plan migration to `youtubei.js`, implement graceful fallback with clear error messages
**Warning signs:** "Could not parse decipher function" errors in logs

### Pitfall 3: AssemblyAI Costs Accumulating
**What goes wrong:** Unexpected bills from heavy usage
**Why it happens:** Base rate $0.15/hour + speaker diarization adds $0.02/hour, per-second billing
**How to avoid:**
- Only use AssemblyAI as fallback (YouTube captions are free)
- Track usage with AssemblyAI dashboard
- Set up billing alerts
**Warning signs:** Many videos hitting AssemblyAI fallback (check transcript source tracking)

### Pitfall 4: Speaker Labels with Single Speaker
**What goes wrong:** All utterances show "Speaker A" which looks odd
**Why it happens:** AssemblyAI still returns speaker labels even with one speaker detected
**How to avoid:** Check utterance count/speaker variation, conditionally show labels only when multiple speakers
**Warning signs:** UI shows "Speaker A:" repeatedly with no "Speaker B:"

### Pitfall 5: Audio Download Failures
**What goes wrong:** Cannot extract audio from certain videos
**Why it happens:** Regional restrictions, age verification, private videos, rentals
**How to avoid:** Return clear error messages indicating why fallback failed, don't retry indefinitely
**Warning signs:** Timeouts or empty buffers during audio extraction

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
// Source: https://github.com/AssemblyAI/assemblyai-node-sdk
const transcript = await client.transcripts.transcribe({
  audio: audioBuffer,  // or URL string, or file path
  speaker_labels: true,
});

// Access utterances
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

// Later: poll for completion
const result = await client.transcripts.waitUntilReady(transcript.id, {
  pollingInterval: 3000,  // ms between polls
  pollingTimeout: 300000, // 5 minute max wait
});
```

### Audio Extraction with ytdl-core (current, deprecated)
```typescript
// Source: https://github.com/distubejs/ytdl-core (DEPRECATED)
import ytdl from '@distube/ytdl-core';

async function extractAudioBuffer(videoId: string): Promise<Buffer> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const info = await ytdl.getInfo(url);
  const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

  const chunks: Buffer[] = [];
  const stream = ytdl.downloadFromInfo(info, { format });

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
```

### Audio Extraction with youtubei.js (recommended replacement)
```typescript
// Source: https://github.com/LuanRT/YouTube.js
import { Innertube } from 'youtubei.js';

async function extractAudioBuffer(videoId: string): Promise<Buffer> {
  const youtube = await Innertube.create();
  const info = await youtube.getBasicInfo(videoId);

  // Choose best audio format
  const format = info.chooseFormat({ type: 'audio', quality: 'best' });
  if (!format) throw new Error('No audio format available');

  // Get stream URL and download
  const url = format.decipher(youtube.session.player);
  const response = await fetch(url);
  return Buffer.from(await response.arrayBuffer());
}
```

### TranscriptUtterance Type Reference
```typescript
// Source: https://assemblyai.github.io/assemblyai-node-sdk/types/TranscriptUtterance.html
type TranscriptUtterance = {
  channel?: string | null;      // For multichannel audio
  confidence: number;           // 0.0 to 1.0
  end: number;                  // End time in milliseconds
  speaker: string;              // "A", "B", "C", etc.
  start: number;                // Start time in milliseconds
  text: string;                 // Transcribed text
  words: TranscriptWord[];      // Individual word details
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @distube/ytdl-core | youtubei.js | Aug 2025 | ytdl-core archived, must migrate |
| Manual AssemblyAI REST calls | AssemblyAI SDK v2.0 | 2024 | SDK handles upload, polling, types |
| Claude 3.5 Sonnet for LeMUR | Claude 4 Sonnet | Oct 2025 | Old model deprecated (not relevant for this phase) |

**Deprecated/outdated:**
- `@distube/ytdl-core`: Archived August 16, 2025. Recommends youtubei.js instead.
- Manual polling loops: Use SDK's built-in `transcribe()` or `waitUntilReady()`

## Open Questions

Things that couldn't be fully resolved:

1. **Should we migrate from @distube/ytdl-core now or later?**
   - What we know: It's deprecated but still works currently
   - What's unclear: How long until YouTube changes break it
   - Recommendation: Use existing library for Phase 2, plan migration as separate task

2. **How to handle very long videos (3+ hours)?**
   - What we know: AssemblyAI handles 8+ hour files in ~5 minutes
   - What's unclear: Memory usage of downloading full audio to buffer
   - Recommendation: Test with long videos, may need streaming approach

3. **Should we show transcription progress to user?**
   - What we know: AssemblyAI doesn't provide progress %, only status
   - What's unclear: Best UX for 30-130 second wait times
   - Recommendation: Show spinner with "Transcribing audio..." and estimated time

## Sources

### Primary (HIGH confidence)
- [AssemblyAI Node SDK GitHub](https://github.com/AssemblyAI/assemblyai-node-sdk) - SDK usage, types, examples
- [AssemblyAI SDK Reference](https://assemblyai.github.io/assemblyai-node-sdk/) - TypeScript types
- [AssemblyAI Speaker Diarization Docs](https://www.assemblyai.com/docs/pre-recorded-audio/speaker-diarization) - Utterance format
- [AssemblyAI FAQ: Audio URLs](https://www.assemblyai.com/docs/faq/what-types-of-audio-urls-can-i-use-with-the-api) - URL requirements
- [AssemblyAI FAQ: Transcription Time](https://www.assemblyai.com/docs/faq/how-long-does-it-take-to-transcribe-a-file) - Processing benchmarks

### Secondary (MEDIUM confidence)
- [distubejs/ytdl-core GitHub](https://github.com/distubejs/ytdl-core) - Deprecation notice, alternatives
- [LuanRT/YouTube.js GitHub](https://github.com/LuanRT/YouTube.js) - Replacement library
- [Vercel Functions Duration](https://vercel.com/docs/functions/configuring-functions/duration) - Timeout configuration
- [AssemblyAI Pricing](https://www.assemblyai.com/pricing) - Cost structure

### Tertiary (LOW confidence)
- Various Stack Overflow and community discussions on speaker diarization UX

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official SDK docs, clear deprecation notices
- Architecture: HIGH - Follows existing project patterns, SDK well-documented
- Pitfalls: MEDIUM - Some based on community reports, timeout limits verified

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (30 days - stable domain, SDK mature)
