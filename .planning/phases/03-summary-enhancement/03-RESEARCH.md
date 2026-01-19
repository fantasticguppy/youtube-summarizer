# Phase 3: Summary Enhancement - Research

**Researched:** 2026-01-19
**Domain:** LLM prompt engineering for extractive key points vs narrative summaries
**Confidence:** HIGH

## Summary

This phase adds a "Key Points" tab that displays extractive bullet points distinct from the existing narrative summary. The existing codebase already has the tabbed UI structure (currently 2 tabs: Summary, Transcript) and uses AI SDK v6 with streamText for GPT-4o summaries.

The core technical challenge is ensuring the key points output is **distinct** from the summary - the summary is abstractive (narrative rewrites), while key points should be extractive (direct facts, quotes, and actionable items from the transcript). Research confirms this distinction is achievable through careful prompt engineering with different instructions, output formats, and temperature settings.

Two implementation approaches were researched: (1) single API call with combined structured output using AI SDK's `Output.object()`, or (2) separate parallel API calls with text streaming. The recommendation is **separate parallel API calls** because it allows streaming both outputs independently with real-time updates, matches the existing streaming pattern, keeps prompts focused on their specific task, and the AI SDK's structured output with `Output.object()` doesn't stream partial results as naturally as pure text.

**Primary recommendation:** Create a new `/api/key-points` route with extractive-focused prompt engineering (temperature 0), stream both summary and key points in parallel on the client using the fetch-based streaming pattern, and add a third tab to the existing ResultsTabs component.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| AI SDK (ai) | 6.0.41 | Streaming LLM responses | Already in use, supports parallel streams via fetch |
| @ai-sdk/openai | 3.0.12 | OpenAI provider | Already in use |
| GPT-4o | - | LLM model | Already in use, follows instructions well for extractive vs abstractive |
| Radix Tabs | 1.1.13 | Tab component | Already installed as @radix-ui/react-tabs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | (peer dep) | Schema validation | If switching to structured output approach with `Output.object()` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate API calls | Single call with `Output.object()` | Structured output is better for parsing but doesn't stream partial text naturally; separate calls allow independent real-time streaming |
| GPT-4o | GPT-4o-mini | Faster/cheaper but lower instruction-following quality for subtle extractive vs abstractive distinctions |
| Text streaming | `elementStream` with `Output.array()` | Array streaming gives validated complete elements but loses chunk-by-chunk text feel |

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
    └── index.ts                   # Add KeyPoints type (optional)
```

### Pattern 1: Parallel Streaming API Calls

**What:** Make two separate fetch calls to `/api/summarize` and `/api/key-points` in parallel, streaming both results independently to the UI.

**When to use:** When both outputs need real-time streaming and prompts are sufficiently different.

**Source:** [Multiple Parallel AI Streams with the Vercel AI SDK](https://mikecavaliere.com/posts/multiple-parallel-streams-vercel-ai-sdk)

**Example:**
```typescript
// In page.tsx handleSubmit, after getting transcript
setStatus('summarizing');

// Start both fetch requests without awaiting (non-blocking)
const summaryFetch = fetch('/api/summarize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ transcript, videoTitle }),
});

const keyPointsFetch = fetch('/api/key-points', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ transcript, videoTitle }),
});

// Process both streams concurrently using IIFEs
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
```

### Pattern 2: Extractive vs Abstractive Prompt Differentiation

**What:** Use distinct prompt structures to ensure outputs are genuinely different.

**Source:** [Galileo AI Blog](https://galileo.ai/blog/llm-summarization-strategies), [Prompt Engineering Best Practices](https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-the-openai-api)

**Extractive (Key Points):**
- Instruction: "Extract and list" (not "summarize")
- Format: Strict bullet points with categories
- Constraint: "Use exact phrases from the transcript where possible"
- Temperature: 0 (deterministic, no rephrasing) - research confirms temperature 0 is best for factual extraction
- Focus: "Pull out specific facts, statistics, quotes, and claims"

**Abstractive (Summary):**
- Instruction: "Summarize in your own words"
- Format: Flowing paragraphs with headers
- Freedom: "Rephrase for clarity"
- Temperature: 0.7 (allows creative reformulation) - default in existing codebase
- Focus: "Create a coherent narrative"

### Pattern 3: Categorized Key Points Structure

**What:** Organize key points into distinct categories for clarity.

**Source:** [Typeface AI Prompts Guide](https://www.typeface.ai/blog/ai-prompts-to-summarize-videos-text-and-podcasts)

**Recommended Structure:**
```markdown
## Main Takeaways
[3-5 top-level insights - direct quotes or close paraphrases]

## Key Facts & Data
[Specific numbers, statistics, dates, names mentioned]

## Core Arguments
[Main positions, recommendations, or assertions the speaker makes]

## Action Items
[If applicable - recommended next steps mentioned by speaker]
```

This categorization matches SUMM-02 requirement: "main takeaways, facts, arguments."

### Pattern 4: AI SDK Structured Output Alternative

**What:** Use `Output.object()` with Zod schema for type-safe structured data.

**When to use:** When you need validated structured data over streaming text.

**Source:** [AI SDK Structured Data Docs](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)

**Example (NOT recommended for this phase, but documented for reference):**
```typescript
import { streamText, Output } from 'ai';
import { z } from 'zod';

const keyPointsSchema = z.object({
  mainTakeaways: z.array(z.string()).describe('3-5 top insights from the video'),
  keyFacts: z.array(z.string()).describe('Specific statistics, dates, or names'),
  coreArguments: z.array(z.string()).describe('Main positions or claims made'),
  actionItems: z.array(z.string()).describe('Recommended next steps if any'),
});

const result = streamText({
  model: openai('gpt-4o'),
  prompt: `Extract key points from: ${transcript}`,
  output: Output.object({
    schema: keyPointsSchema,
    description: 'Extractive key points from video transcript'
  }),
  temperature: 0,
});

// Access partial streaming object
for await (const partial of result.partialOutputStream) {
  console.log(partial); // { mainTakeaways: ['...'], keyFacts: [...] }
}
```

**Tradeoff:** This provides type-safe validated output but `partialOutputStream` streams partial objects (not raw text), which doesn't match the existing text-streaming UX pattern.

### Anti-Patterns to Avoid
- **Combining into single API call with JSON output:** Doesn't stream well, adds parsing complexity, loses the real-time feel users expect
- **Using same prompt with different output format:** Key points will just be reformatted summary, not truly extractive
- **Generic "key points" instruction:** Without explicit extractive guidance, LLM defaults to abstractive paraphrasing
- **Skipping temperature configuration:** Temperature 0 is critical for extractive consistency

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Parallel streaming | Custom Promise orchestration | Standard fetch + Promise.all pattern | Well-understood, handles errors properly |
| Markdown rendering | Complex parser | Existing formatMarkdown function in summary-view.tsx | Already works, just reuse for key points |
| Tab state management | Custom state | Existing Radix Tabs | Already implemented with accessibility |
| Loading states | Custom loading logic | Existing SummaryView loading pattern | Skeleton UI already implemented |

**Key insight:** The existing codebase already has the patterns needed - extend them, don't replace them.

## Common Pitfalls

### Pitfall 1: Key Points Are Just Reformatted Summary
**What goes wrong:** Key points output reads like bullet-pointed summary, not distinct extractive content.
**Why it happens:** LLMs default to abstractive summarization; without explicit extractive instructions, they rephrase.
**How to avoid:**
- Use explicit "extract exact phrases" instruction
- Set temperature to 0
- Include phrase "EXTRACTIVE, not abstractive" in prompt
- Use categories that force specific content types (facts, statistics, quotes)
**Warning signs:** Key points contain no direct quotes, statistics are rounded/approximated, same themes as summary.

### Pitfall 2: Streaming Order Causes UI Jank
**What goes wrong:** Key Points tab shows content before Summary, or both flicker.
**Why it happens:** Parallel streams complete at different times; React re-renders on each chunk.
**How to avoid:**
- Initialize both state values to empty string (not undefined)
- Use proper loading states per tab
- Don't switch tabs automatically based on content arrival
- Use functional state updates: `setSummary(prev => prev + chunk)`
**Warning signs:** Tab content flickers, loading skeleton appears/disappears rapidly.

### Pitfall 3: Double API Costs
**What goes wrong:** Users complain about slow processing or you get unexpected OpenAI bills.
**Why it happens:** Two API calls per video doubles token usage.
**How to avoid:**
- Document the tradeoff clearly in UX
- GPT-4o cost is ~$2.50/1M input tokens, $10/1M output tokens
- For typical 10k token transcript with ~1.5k output each, cost is ~$0.06-0.08 per video for both calls
**Warning signs:** Processing takes noticeably longer, OpenAI dashboard shows doubled usage.

### Pitfall 4: Prompt Too Long for Context
**What goes wrong:** API errors for long videos.
**Why it happens:** Transcript + prompt exceeds context window; with two calls, prompt overhead is doubled.
**How to avoid:**
- Keep prompts concise (current prompts are ~200 tokens each)
- GPT-4o has 128k context window
- Typical 1-hour video transcript is 10-30k tokens
- Rarely an issue in practice
**Warning signs:** 400 errors from OpenAI API on very long (3+ hour) videos.

### Pitfall 5: Missing Error Handling for Parallel Streams
**What goes wrong:** One stream fails but other continues, user sees partial results.
**Why it happens:** Promise.all rejects on first error; individual stream errors aren't handled.
**How to avoid:**
- Wrap each stream processing in try-catch
- Show error state per tab if needed, or aggregate errors
- Consider Promise.allSettled for independent error handling
**Warning signs:** Partial content showing with no error message.

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
  try {
    const { transcript, videoTitle } = await req.json();

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Transcript is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = streamText({
      model: openai('gpt-4o'),
      temperature: 0, // Critical: deterministic for extractive output
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
  } catch (error) {
    console.error('Key points API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to extract key points' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

### Helper Function for Stream Processing
```typescript
// Reusable stream processor to reduce duplication
async function processTextStream(
  response: Response,
  onChunk: (accumulated: string) => void
): Promise<string> {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('No response body');
  }

  let accumulated = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    accumulated += chunk;
    onChunk(accumulated);
  }

  return accumulated;
}
```

### Updated Page State and Handler
```typescript
// In page.tsx, add keyPoints state and update handler

const [keyPoints, setKeyPoints] = useState<string>('');

const handleSubmit = useCallback(async (videoId: string, url: string) => {
  // Reset state including keyPoints
  setError(null);
  setMetadata(null);
  setTranscript('');
  setSummary('');
  setKeyPoints(''); // NEW
  // ... rest of state resets

  // ... existing video processing code ...

  setStatus('summarizing');

  try {
    // Start both requests without awaiting
    const summaryFetch = fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: result.transcript,
        videoTitle: result.metadata.title,
      }),
    });

    const keyPointsFetch = fetch('/api/key-points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: result.transcript,
        videoTitle: result.metadata.title,
      }),
    });

    // Process both streams in parallel
    await Promise.all([
      (async () => {
        const response = await summaryFetch;
        if (!response.ok) throw new Error('Failed to generate summary');
        await processTextStream(response, setSummary);
      })(),
      (async () => {
        const response = await keyPointsFetch;
        if (!response.ok) throw new Error('Failed to extract key points');
        await processTextStream(response, setKeyPoints);
      })()
    ]);

    setStatus('complete');
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to generate summary');
    setStatus('error');
  }
}, []);
```

### KeyPointsView Component
```typescript
// src/components/key-points-view.tsx
// Pattern: Same as SummaryView but could add category icons later

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from './copy-button';
import { Skeleton } from '@/components/ui/skeleton';

interface KeyPointsViewProps {
  keyPoints: string;
  isLoading?: boolean;
}

export function KeyPointsView({ keyPoints, isLoading }: KeyPointsViewProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
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
        <CardTitle className="text-lg font-medium">Key Points</CardTitle>
        <CopyButton text={keyPoints} />
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <div
            className="text-sm leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: formatMarkdown(keyPoints),
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Reuse the same markdown formatter from summary-view.tsx
// Consider extracting to shared util
function formatMarkdown(text: string): string {
  return text
    .replace(/^## (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^### (.+)$/gm, '<h4 class="text-sm font-medium mt-3 mb-1">$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/^  - (.+)$/gm, '<li class="ml-8">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul class="list-disc space-y-1 my-2">$&</ul>')
    .replace(/^([^<\s].+)$/gm, '<p class="my-2">$1</p>')
    .replace(/^---$/gm, '<hr class="my-4" />');
}
```

### Updated ResultsTabs (3 columns)
```typescript
// Modified src/components/results-tabs.tsx

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
| `generateObject`/`streamObject` | `streamText` with `output` property | AI SDK 6.0 (2025) | Use new API for structured output |
| Single combined call | Parallel streaming calls | 2024-2025 | Better UX with real-time streaming for both outputs |
| Generic summarization | Extractive vs abstractive distinction | 2024-2025 | Better content quality by matching task to technique |
| JSON mode without schema | `Output.object()` with Zod | AI SDK 6.0 | Type-safe structured outputs with streaming |

**Deprecated/outdated:**
- `generateObject` and `streamObject` as standalone functions - use `generateText`/`streamText` with `output` property
- JSON mode without schema enforcement - use structured outputs with Zod schemas if structured data needed
- Single temperature for all tasks - extractive tasks need temperature 0, abstractive can use 0.7

## Open Questions

Things that couldn't be fully resolved:

1. **Temperature optimization for extractive output**
   - What we know: Temperature 0 is recommended for extractive; prevents rephrasing
   - What's unclear: Whether a small temperature (0.1-0.3) might help with variety in edge cases
   - Recommendation: Start with 0, adjust based on testing if results are too rigid

2. **Optimal key points categories**
   - What we know: Main takeaways, facts, arguments, action items are standard categories
   - What's unclear: Whether video type (tutorial vs interview vs lecture) needs different categories
   - Recommendation: Use generic categories for Phase 3; consider video-type detection in future phase

3. **Cost vs single-call tradeoff**
   - What we know: Two calls roughly doubles API cost; structured output could combine them
   - What's unclear: User preference between faster streaming vs lower cost
   - Recommendation: Implement parallel calls for better UX; cost is minimal (~$0.06-0.08/video)

4. **formatMarkdown function duplication**
   - What we know: SummaryView and KeyPointsView will use same markdown formatter
   - What's unclear: Best location for shared utility
   - Recommendation: Extract to `src/lib/format-markdown.ts` if modifying, or copy function for now

## Sources

### Primary (HIGH confidence)
- [AI SDK Core: streamText](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text) - Streaming API, `output` property
- [AI SDK Core: Generating Structured Data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) - `Output.object()`, `Output.array()`, Zod integration
- [Vercel Academy: Structured Data Extraction](https://vercel.com/academy/ai-sdk/structured-data-extraction) - Schema design, `.describe()` usage
- [Building type-safe AI applications with structured outputs](https://www.ai-engineer.io/tutorials/ai-sdk-structured-outputs-with-zod) - Complete Zod schema examples
- Existing codebase patterns - src/app/api/summarize/route.ts, src/components/results-tabs.tsx

### Secondary (MEDIUM confidence)
- [Multiple Parallel AI Streams with the Vercel AI SDK](https://mikecavaliere.com/posts/multiple-parallel-streams-vercel-ai-sdk) - Parallel streaming pattern
- [OpenAI Best Practices for Prompt Engineering](https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-the-openai-api) - Constraint-based prompting
- [Typeface AI Prompts Guide](https://www.typeface.ai/blog/ai-prompts-to-summarize-videos-text-and-podcasts) - Video transcript extraction prompts
- [Next.js Data Fetching Patterns](https://nextjs.org/docs/14/app/building-your-application/data-fetching/patterns) - Parallel fetching, loading states

### Tertiary (LOW confidence)
- General prompt engineering guides (2025) - Various blogs on extractive vs abstractive
- Community discussions on streaming UI patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - uses existing dependencies, well-documented APIs
- Architecture: HIGH - extends existing patterns, verified with official docs
- Pitfalls: MEDIUM - based on general LLM experience and prompt engineering research
- Code examples: HIGH - derived from official documentation and existing codebase

**Research date:** 2026-01-19
**Valid until:** 2026-03-19 (60 days - AI SDK and OpenAI are relatively stable)
