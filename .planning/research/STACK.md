# Stack Research: v1.1 Outline Generation

**Project:** YouTube Transcript & Summary Tool v1.1
**Researched:** 2026-01-19
**Mode:** Stack dimension for outline generation and transcript formatting

## Executive Summary

The existing stack (AI SDK v6, GPT-4o, Next.js 15) is **sufficient** for outline generation from long transcripts. No new dependencies are required. The key challenges are prompt engineering and context management, not technology gaps.

**Key findings:**
- GPT-4o has 128K context (~96K usable) which handles 6-8 hour videos without chunking
- Structured outputs via AI SDK v6's `Output.object()` with Zod schemas provide type-safe hierarchical outlines
- Timestamp correlation can use existing `TranscriptSegment.offset` data already in codebase
- For 1-2 hour videos (~15-20K tokens), single-pass generation is viable and preferred

## Existing Stack Assessment

### What We Have

| Technology | Version | Role | Sufficient? |
|------------|---------|------|-------------|
| Next.js | 16.1.3 | API routes, streaming | Yes |
| AI SDK | 6.0.41 | LLM integration | Yes |
| @ai-sdk/openai | 3.0.12 | OpenAI provider | Yes |
| GPT-4o | - | Outline generation | Yes |
| TypeScript | 5.x | Type safety | Yes |
| Dexie.js | 4.2.1 | Persistence | Yes |

**Verdict:** Current stack handles all v1.1 requirements. No new dependencies needed.

### Why Existing Stack Works

1. **GPT-4o context window (128K tokens):** A 2-hour video produces ~20-30K tokens of transcript. This fits comfortably in GPT-4o's context with room for the prompt and output.

2. **AI SDK v6 structured outputs:** The `Output.object()` API with Zod schemas provides exactly what we need for hierarchical outline generation with type safety.

3. **Streaming support:** `streamText` with `partialOutputStream` enables progressive rendering of outline sections as they generate.

4. **Timestamp data available:** `TranscriptSegment.offset` already contains millisecond timestamps. Outline generation just needs to reference these.

## Long Transcript Handling

### Token Budget Analysis

| Video Length | Est. Words | Est. Tokens | GPT-4o Headroom |
|--------------|------------|-------------|-----------------|
| 30 min | 4,500 | 6,000 | 122K remaining |
| 1 hour | 9,000 | 12,000 | 116K remaining |
| 2 hours | 18,000 | 24,000 | 104K remaining |
| 4 hours | 36,000 | 48,000 | 80K remaining |
| 8 hours | 72,000 | 96,000 | 32K remaining |

**Calculation basis:** ~150 words/minute speech rate, ~1.33 tokens/word

**Conclusion:** Single-pass generation works for videos up to ~6 hours. Beyond that, chunking strategies may be needed, but this exceeds the v1.1 target of 1-2 hours.

### Recommended Approach: Single-Pass Generation

For v1.1 (targeting 1-2 hour videos), use **single-pass generation**:

```typescript
// Pseudo-code pattern
const { partialOutputStream } = streamText({
  model: openai('gpt-4o'),
  output: Output.object({
    schema: outlineSchema
  }),
  prompt: buildOutlinePrompt(transcript, timestamps),
  maxOutputTokens: 4000,
});
```

**Why single-pass over map-reduce:**
- Preserves cross-topic coherence
- Avoids "lost in the middle" fragmentation
- Simpler implementation
- Lower latency (one API call vs. many)
- Lower cost (no redundant token processing)

### Deferred: Chunking for 4+ Hour Videos

If future versions need to support very long content (4+ hours), implement map-reduce:

1. **Map:** Chunk transcript by time boundaries (15-20 minute segments)
2. **Summarize:** Generate section outline for each chunk
3. **Reduce:** Merge section outlines into hierarchical structure
4. **Reconcile:** Resolve cross-chunk topics and deduplicate

This is **not needed for v1.1** but documented for future reference.

## Outline Generation Patterns

### Schema Design for Hierarchical Outlines

Use Zod with AI SDK v6's `Output.object()`:

```typescript
import { z } from 'zod';

const OutlineSubsection = z.object({
  title: z.string().describe('Subsection heading'),
  timestampMs: z.number().describe('Start time in milliseconds'),
  points: z.array(z.string()).describe('Key points covered'),
});

const OutlineSection = z.object({
  title: z.string().describe('Main section heading'),
  timestampMs: z.number().describe('Start time in milliseconds'),
  summary: z.string().describe('2-3 sentence section summary'),
  subsections: z.array(OutlineSubsection).optional(),
});

export const OutlineSchema = z.object({
  title: z.string().describe('Video title for context'),
  sections: z.array(OutlineSection).describe('Hierarchical outline sections'),
  totalDurationMs: z.number().describe('Total video duration'),
});
```

**Schema constraints (GPT-4o limits):**
- Max 100 total object properties
- Max 5 levels of nesting
- Our 3-level schema (outline > section > subsection) is well within limits

### Prompt Strategy for Near-Complete Coverage

The challenge: Generate outlines that capture every distinct topic, not just "main points."

**Key prompt elements:**

1. **Explicit coverage instruction:**
   ```
   Generate a comprehensive outline covering EVERY distinct topic.
   Do not summarize or compress. Each topic mentioned deserves its own entry.
   ```

2. **Timestamp correlation:**
   ```
   The transcript includes timestamps. Reference these to indicate when
   each section begins. Use the exact millisecond values provided.
   ```

3. **Hierarchical guidance:**
   ```
   Structure with:
   - Top-level sections (major topic shifts)
   - Subsections (distinct points within a topic)
   - Bullet points (specific details, examples, data)
   ```

4. **Coverage verification:**
   ```
   After generating, verify: does every 5-minute segment of the video
   have representation in the outline? If not, add missing topics.
   ```

### Timestamp Injection Pattern

Current transcript format loses timestamp data. For outline generation, inject timestamps:

```typescript
function formatTranscriptWithTimestamps(
  segments: TranscriptSegment[]
): string {
  return segments.map(seg => {
    const timeStr = formatTime(seg.offset); // "01:23:45"
    return `[${timeStr}] ${seg.text}`;
  }).join(' ');
}
```

This gives the model explicit temporal context to reference in outline timestamps.

### Streaming Pattern for Progressive UI

Use `partialOutputStream` for progressive outline rendering:

```typescript
const { partialOutputStream } = streamText({
  model: openai('gpt-4o'),
  output: Output.object({ schema: OutlineSchema }),
  // ...
});

for await (const partial of partialOutputStream) {
  // partial.sections contains completed sections so far
  // Render incrementally as sections complete
}
```

## API Route Design

### Recommended: New `/api/outline` Route

```typescript
// src/app/api/outline/route.ts
export const maxDuration = 120; // 2 minutes for long transcripts

export async function POST(req: Request) {
  const { transcript, segments, videoTitle, durationMs } = await req.json();

  const transcriptWithTimestamps = formatWithTimestamps(segments);

  const { partialOutputStream } = streamText({
    model: openai('gpt-4o'),
    output: Output.object({ schema: OutlineSchema }),
    system: OUTLINE_SYSTEM_PROMPT,
    prompt: buildOutlinePrompt(transcriptWithTimestamps, videoTitle, durationMs),
    maxOutputTokens: 4000,
  });

  // Stream structured output
  return new Response(/* stream handling */);
}
```

### Input Requirements

The outline route needs:
1. `transcript` - Full text (for context)
2. `segments` - Raw `TranscriptSegment[]` (for timestamps)
3. `videoTitle` - Context for the model
4. `durationMs` - Total duration for coverage verification

This data is already available from the existing processing pipeline.

## New Dependencies

### Required: None

The existing stack handles all requirements:
- **Zod:** Already installed (shadcn/ui dependency)
- **AI SDK v6:** Already has `Output.object()` for structured outputs
- **GPT-4o:** Already configured in `@ai-sdk/openai`

### Explicitly NOT Adding

| Library | Why Not |
|---------|---------|
| LangChain | Overkill for single LLM calls; AI SDK sufficient |
| LlamaIndex | RAG not needed; full context fits in window |
| tiktoken | Not needed; GPT-4o context is ample |
| Additional LLM providers | GPT-4o handles the task well |
| Text chunking libraries | Single-pass works for target video lengths |

## Cost Estimation

### Per-Video Cost (1-2 hour video)

| Component | Tokens | Cost |
|-----------|--------|------|
| Input (transcript) | ~20,000 | $0.05 |
| Input (prompt) | ~500 | $0.001 |
| Output (outline) | ~2,000 | $0.02 |
| **Total** | ~22,500 | **~$0.07** |

At current GPT-4o pricing ($2.50/1M input, $10/1M output).

### Comparison to Existing Features

| Feature | Est. Tokens | Est. Cost |
|---------|-------------|-----------|
| Summary | ~21,500 | ~$0.07 |
| Key Points | ~21,000 | ~$0.06 |
| Outline | ~22,500 | ~$0.07 |

Outline generation has comparable cost to existing features.

## Recommendations

### 1. Use Single-Pass Structured Output (HIGH Confidence)

```typescript
// Pattern to follow
const { partialOutputStream } = streamText({
  model: openai('gpt-4o'),
  output: Output.object({
    schema: OutlineSchema
  }),
  system: OUTLINE_SYSTEM_PROMPT,
  prompt: promptWithTimestampedTranscript,
});
```

**Rationale:** GPT-4o's 128K context handles 6+ hour videos. Single-pass preserves topic coherence and is simpler to implement.

### 2. Inject Timestamps into Transcript (HIGH Confidence)

Current transcript formatting loses timestamp data. The outline route should use a timestamped format:

```
[00:00:00] Introduction to the topic...
[00:02:30] First main point about...
```

**Rationale:** Model needs explicit temporal context to generate accurate section timestamps.

### 3. Design Schema for 3-Level Hierarchy (HIGH Confidence)

```
Outline
  > Section (major topic)
    > Subsection (distinct point)
      > Points (details/examples)
```

**Rationale:** Fits GPT-4o's 5-level nesting limit with room to spare. Matches user mental model of video structure.

### 4. Set `maxOutputTokens: 4000` for Outlines (MEDIUM Confidence)

Comprehensive outlines for 2-hour videos need ~2,000-3,000 tokens. Budget 4,000 for safety margin.

**Rationale:** Summaries use 2,000 tokens and are more compressed. Outlines with full coverage need more.

### 5. Do NOT Add New Dependencies (HIGH Confidence)

The existing stack (AI SDK v6, GPT-4o, Zod) has everything needed:
- Structured output: `Output.object()` with Zod
- Streaming: `partialOutputStream`
- Type safety: Zod inference

**Rationale:** Adding libraries like LangChain introduces complexity without benefit for this use case.

## Sources

### Token Limits and Context
- [OpenAI GPT-4.1 Announcement](https://openai.com/index/gpt-4-1/) - GPT-4o has 128K context
- [ChatGPT Token Limits 2025](https://www.datastudios.org/post/chatgpt-token-limits-and-context-windows-updated-for-all-models-in-2025) - Model comparison
- [GPT-4o Context Window Discussion](https://community.openai.com/t/gpt-4o-context-window-confusion/761439) - Community verification

### AI SDK Documentation
- [AI SDK Generating Structured Data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) - Official Output.object() docs
- [AI SDK streamText Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text) - Streaming API
- [AI SDK 6 Announcement](https://vercel.com/blog/ai-sdk-6) - Unified structured output

### Structured Output
- [OpenAI Structured Outputs](https://openai.com/index/introducing-structured-outputs-in-the-api/) - 100% schema compliance
- [Structured Outputs Depth Limits](https://community.openai.com/t/measuring-maximum-depth-and-object-properties-in-structured-outputs/918388) - 100 properties, 5 nesting levels

### Long Document Processing
- [LLM Summarization Approaches](https://belitsoft.com/llm-summarization) - Map-reduce vs single-pass
- [Google Cloud Long Document Summarization](https://cloud.google.com/blog/products/ai-machine-learning/long-document-summarization-with-workflows-and-gemini-models) - Iterative refinement
- [LLM Token Limit Solutions](https://www.deepchecks.com/5-approaches-to-solve-llm-token-limits/) - Chunking strategies

### Outline Generation Research
- [Video Chaptering with LLMs](https://towardsdatascience.com/automate-video-chaptering-with-llms-and-tf-idf-f6569fd4d32b/) - Timestamp handling challenges
- [Outline-Guided Text Generation](https://arxiv.org/html/2404.13919v1) - Hierarchical expansion
- [Meeting Transcript Processing](https://arxiv.org/pdf/2307.15793) - Hierarchical recap patterns

### Pricing
- [OpenAI API Pricing](https://openai.com/api/pricing/) - GPT-4o at $2.50/1M input, $10/1M output
