# Phase 3: Summary Enhancement - Research

**Researched:** 2026-01-19
**Domain:** LLM prompt engineering for extractive key points vs narrative summaries
**Confidence:** HIGH

## Summary

This phase adds a "Key Points" tab that displays extractive bullet points distinct from the existing narrative summary. The existing codebase already has the tabbed UI structure (currently 2 tabs: Summary, Transcript) and uses AI SDK v6 with streamText for GPT-4o summaries.

The core technical challenge is ensuring the key points output is **distinct** from the summary - the summary is abstractive (narrative rewrites), while key points should be extractive (direct facts, quotes, and actionable items from the transcript). Research confirms this distinction is achievable through careful prompt engineering with different instructions and output formats.

Two implementation approaches were researched: (1) single API call with combined structured output, or (2) separate parallel API calls. The recommendation is to use **separate parallel API calls** because it allows streaming both outputs independently, matches the existing streaming pattern, and keeps prompts focused.

**Primary recommendation:** Create a new `/api/key-points` route with extractive-focused prompt engineering, stream both summary and key points in parallel on the client, and add a third tab to the existing ResultsTabs component.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| AI SDK (ai) | 6.0.41 | Streaming LLM responses | Already in use, supports parallel streams |
| @ai-sdk/openai | 3.0.12 | OpenAI provider | Already in use |
| GPT-4o | - | LLM model | Already in use, follows instructions well for extractive vs abstractive |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | (peer dep) | Schema validation | If switching to structured output approach |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate API calls | Single call with structured output | Structured output doesn't support streaming text well; separate calls allow independent streaming |
| GPT-4o | GPT-4o-mini | Faster/cheaper but lower instruction-following quality for subtle distinctions |

**Installation:**
```bash
# No new dependencies needed - uses existing AI SDK
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── api/
│       ├── summarize/route.ts     # Existing - abstractive summary
│       └── key-points/route.ts    # NEW - extractive key points
├── components/
│   ├── results-tabs.tsx           # Modified - add third tab
│   ├── summary-view.tsx           # Existing
│   ├── key-points-view.tsx        # NEW - display key points
│   └── transcript-view.tsx        # Existing
└── types/
    └── index.ts                   # Add KeyPoints type
```

### Pattern 1: Parallel Streaming API Calls

**What:** Make two separate fetch calls to `/api/summarize` and `/api/key-points` in parallel, streaming both results independently to the UI.

**When to use:** When both outputs need real-time streaming and prompts are sufficiently different.

**Example:**
```typescript
// In page.tsx handleSubmit, after getting transcript
setStatus('summarizing');

// Start both streams in parallel (don't await first)
const summaryPromise = streamSummary(transcript, videoTitle);
const keyPointsPromise = streamKeyPoints(transcript, videoTitle);

// Process both streams concurrently
await Promise.all([
  processStream(summaryPromise, setSummary),
  processStream(keyPointsPromise, setKeyPoints)
]);

setStatus('complete');
```

### Pattern 2: Extractive vs Abstractive Prompt Differentiation

**What:** Use distinct prompt structures to ensure outputs are genuinely different.

**Extractive (Key Points):**
- Instruction: "Extract and list" (not "summarize")
- Format: Strict bullet points with categories
- Constraint: "Use exact phrases from the transcript where possible"
- Temperature: 0 (deterministic, no rephrasing)

**Abstractive (Summary):**
- Instruction: "Summarize in your own words"
- Format: Flowing paragraphs with headers
- Freedom: "Rephrase for clarity"
- Temperature: 0.7 (allows creative reformulation)

### Pattern 3: Categorized Key Points Structure

**What:** Organize key points into distinct categories for clarity.

**Structure:**
```markdown
## Main Takeaways
- [3-5 top-level insights]

## Key Facts & Statistics
- [Specific numbers, dates, names mentioned]

## Arguments & Claims
- [Main positions or assertions made]

## Action Items
- [If applicable - recommended next steps mentioned]
```

### Anti-Patterns to Avoid
- **Combining into single API call with JSON output:** Doesn't stream well, adds parsing complexity, loses the real-time feel users expect
- **Using same prompt with different output format:** Key points will just be reformatted summary, not truly extractive
- **Generic "key points" instruction:** Without explicit extractive guidance, LLM defaults to abstractive paraphrasing

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Parallel streaming | Custom Promise orchestration | AI SDK createStreamableValue pattern | Handles edge cases, cleanup, React integration |
| Markdown rendering | Complex parser | Existing formatMarkdown function | Already works, just extend for new formatting |
| Tab state management | Custom state | Existing Radix Tabs | Already implemented with accessibility |

**Key insight:** The existing codebase already has the patterns needed - extend them, don't replace them.

## Common Pitfalls

### Pitfall 1: Key Points Are Just Reformatted Summary
**What goes wrong:** Key points output reads like bullet-pointed summary, not distinct extractive content.
**Why it happens:** LLMs default to abstractive summarization; without explicit extractive instructions, they rephrase.
**How to avoid:** Use explicit "extract exact phrases" instruction, set temperature to 0, include examples of extractive vs abstractive output in prompt.
**Warning signs:** Key points contain no direct quotes, statistics are rounded/approximated, same themes as summary.

### Pitfall 2: Streaming Order Causes UI Jank
**What goes wrong:** Key Points tab shows content before Summary, or both flicker.
**Why it happens:** Parallel streams complete at different times; React re-renders on each chunk.
**How to avoid:** Initialize both state values to empty string (not undefined), use proper loading states per tab, don't switch tabs automatically.
**Warning signs:** Tab content flickers, loading skeleton appears/disappears rapidly.

### Pitfall 3: Double API Costs
**What goes wrong:** Users complain about slow processing or you get unexpected OpenAI bills.
**Why it happens:** Two API calls per video doubles token usage.
**How to avoid:** Document the tradeoff clearly; if cost is concern, consider sequential calls or single structured call. GPT-4o cost is ~$5/1M input tokens, so for typical 10k token transcript, cost is ~$0.10 per video for both calls.
**Warning signs:** Processing takes 2x as long, OpenAI dashboard shows doubled usage.

### Pitfall 4: Prompt Too Long for Context
**What goes wrong:** API errors for long videos.
**Why it happens:** Transcript + prompt exceeds context window; with two calls, prompt overhead is doubled.
**How to avoid:** Keep prompts concise; GPT-4o has 128k context, typical transcript is under 30k tokens, so this is rarely an issue.
**Warning signs:** 400 errors from OpenAI API on long videos.

## Code Examples

Verified patterns from official sources and existing codebase:

### Key Points API Route
```typescript
// src/app/api/key-points/route.ts
// Based on existing summarize/route.ts pattern

import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { transcript, videoTitle } = await req.json();

  if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Transcript is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = streamText({
    model: openai('gpt-4o'),
    temperature: 0, // Deterministic for extractive output
    system: `You are an expert at extracting key information from video transcripts. Your task is to identify and list the most important points EXACTLY as stated in the transcript. Do NOT paraphrase or summarize - extract direct facts, claims, and actionable items using the speaker's original wording where possible.`,
    prompt: `Extract the key points from this transcript of "${videoTitle}".

IMPORTANT: This should be EXTRACTIVE, not abstractive. Pull out specific facts, statistics, quotes, and claims directly from the transcript. Do not rephrase or summarize them.

Format your response EXACTLY as:

## Main Takeaways
[3-5 most important insights - use direct quotes or close paraphrases]

## Key Facts & Data
[Specific numbers, statistics, dates, names, or concrete claims mentioned]

## Core Arguments
[Main positions, recommendations, or assertions the speaker makes]

## Action Items
[Any specific recommendations or next steps mentioned - omit section if none]

---

TRANSCRIPT:
${transcript}`,
    maxOutputTokens: 1500,
  });

  return result.toTextStreamResponse();
}
```

### Parallel Stream Processing (Client)
```typescript
// Pattern for parallel streaming in page.tsx
// Source: AI SDK documentation + mikecavaliere.com pattern

const handleSubmit = useCallback(async (videoId: string, url: string) => {
  // ... existing video processing code ...

  setStatus('summarizing');

  // Start both streams without awaiting
  const summaryFetch = fetch('/api/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript: result.transcript, videoTitle: result.metadata.title }),
  });

  const keyPointsFetch = fetch('/api/key-points', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript: result.transcript, videoTitle: result.metadata.title }),
  });

  // Process both in parallel using IIFEs
  await Promise.all([
    (async () => {
      const response = await summaryFetch;
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setSummary(prev => prev + chunk);
      }
    })(),
    (async () => {
      const response = await keyPointsFetch;
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setKeyPoints(prev => prev + chunk);
      }
    })()
  ]);

  setStatus('complete');
}, []);
```

### Updated ResultsTabs Component
```typescript
// Extending existing component pattern
// Source: Existing src/components/results-tabs.tsx

interface ResultsTabsProps {
  summary: string;
  keyPoints: string;  // NEW
  transcript: string;
  transcriptSource?: TranscriptSource;
  hasSpeakers?: boolean;
  isSummarizing?: boolean;
}

export function ResultsTabs({
  summary,
  keyPoints,  // NEW
  transcript,
  transcriptSource = 'youtube',
  hasSpeakers = false,
  isSummarizing
}: ResultsTabsProps) {
  return (
    <Tabs defaultValue="summary" className="w-full">
      <TabsList className="grid w-full grid-cols-3">  {/* Changed from 2 to 3 */}
        <TabsTrigger value="summary">Summary</TabsTrigger>
        <TabsTrigger value="keypoints">Key Points</TabsTrigger>  {/* NEW */}
        <TabsTrigger value="transcript">Transcript</TabsTrigger>
      </TabsList>
      <TabsContent value="summary" className="mt-4">
        <SummaryView summary={summary} isLoading={isSummarizing && !summary} />
      </TabsContent>
      <TabsContent value="keypoints" className="mt-4">  {/* NEW */}
        <KeyPointsView keyPoints={keyPoints} isLoading={isSummarizing && !keyPoints} />
      </TabsContent>
      <TabsContent value="transcript" className="mt-4">
        <TranscriptView transcript={transcript} source={transcriptSource} hasSpeakers={hasSpeakers} />
      </TabsContent>
    </Tabs>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| generateObject/streamObject | streamText with output property | AI SDK 6.0 | Use new API for structured output if needed |
| Single combined call | Parallel streaming calls | 2024-2025 | Better UX with real-time streaming for both outputs |
| Generic summarization | Extractive vs abstractive distinction | 2024-2025 | Better content quality by matching task to technique |

**Deprecated/outdated:**
- `generateObject` and `streamObject` functions are deprecated in AI SDK 6 - use `streamText` with `output` property instead
- JSON mode without schema enforcement - use structured outputs with Zod schemas if structured data needed

## Open Questions

Things that couldn't be fully resolved:

1. **Temperature optimization for extractive output**
   - What we know: Temperature 0 is recommended for extractive; prevents rephrasing
   - What's unclear: Whether a small temperature (0.1-0.3) might help with edge cases
   - Recommendation: Start with 0, adjust based on testing

2. **Optimal key points categories**
   - What we know: Main takeaways, facts, arguments, action items are common categories
   - What's unclear: Whether video type (tutorial vs interview vs lecture) needs different categories
   - Recommendation: Use generic categories, consider video-type detection in future phase

3. **Cost vs single-call tradeoff**
   - What we know: Two calls doubles API cost; structured output could combine them
   - What's unclear: User preference between faster streaming vs lower cost
   - Recommendation: Implement parallel calls for better UX; cost is minimal (~$0.10/video)

## Sources

### Primary (HIGH confidence)
- AI SDK v6 documentation - streamText API, structured output patterns
  - https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text
  - https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
- Existing codebase patterns - src/app/api/summarize/route.ts, src/components/results-tabs.tsx

### Secondary (MEDIUM confidence)
- Multiple Parallel Streams with Vercel AI SDK
  - https://mikecavaliere.com/posts/multiple-parallel-streams-vercel-ai-sdk
- GPT-4 Meeting Summarization techniques
  - https://www.width.ai/post/gpt-4-for-meeting-summarization
- Extractive vs Abstractive summarization comparison
  - https://kroolo.com/blog/extractive-vs-abstractive-summarization

### Tertiary (LOW confidence)
- General prompt engineering guides (2025)
  - https://www.tavus.io/post/llm-prompt
  - https://www.lakera.ai/blog/prompt-engineering-guide

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - uses existing dependencies, well-documented APIs
- Architecture: HIGH - extends existing patterns, verified with official docs
- Pitfalls: MEDIUM - based on general LLM experience and prompt engineering research

**Research date:** 2026-01-19
**Valid until:** 2026-03-19 (60 days - AI SDK and OpenAI are relatively stable)
