# Research Summary: v1.1 Outline Generation

**Project:** YouTube Transcript & Summary Tool v1.1
**Domain:** Streaming outline generation for video transcripts
**Researched:** 2026-01-19
**Confidence:** HIGH

## Executive Summary

Building comprehensive outline generation for 1-2 hour YouTube videos requires no new dependencies. The existing stack (AI SDK v6, GPT-4o with 128K context, Next.js 15) handles all requirements. GPT-4o's context window comfortably fits transcripts up to 6 hours (~96K tokens), and the AI SDK's `Output.object()` with Zod schemas provides type-safe hierarchical outline generation with streaming support. The architecture adds a third parallel stream alongside existing summary and key points generation.

The recommended approach uses **single-pass structured output** for videos under 60 minutes, with a chunked map-reduce strategy reserved for longer content. Critical to success is injecting timestamps directly into the transcript text (e.g., `[00:15:30] Welcome to...`) so the LLM can anchor outline sections to actual video positions. The current `formatTranscriptIntoParagraphs()` function discards timestamp data, so a new `formatTranscriptWithTimestamps()` utility is required.

The primary risk is the **"lost in the middle" problem**: LLMs systematically under-represent content from the middle of long transcripts. For 2-hour videos, this means the middle hour may have thinner coverage. Prevention requires chunked processing with overlap (15-20 minute segments, 2-3 minute overlap) for anything over 60 minutes. Secondary risks include hallucinated timestamps and difficulty verifying "near-complete coverage" claims. Both can be mitigated through timestamp validation and length-proportionality checks.

## Stack Decision

**Use existing stack - no new dependencies needed:**

- **GPT-4o**: 128K context window handles 6+ hour transcripts; structured outputs with 100% schema compliance
- **AI SDK v6**: `Output.object()` with Zod for type-safe hierarchical outlines; `partialOutputStream` for progressive rendering
- **Zod**: Already installed (shadcn/ui dependency); defines 3-level outline schema (outline > section > subsection)
- **Dexie.js**: Schema v2 migration to add `outline` field to history entries

**Do NOT add:**
- LangChain (overkill for single LLM calls)
- LlamaIndex (RAG not needed; full context fits)
- tiktoken (GPT-4o context is ample)
- Text chunking libraries (simple word-count splitting suffices)

**Cost impact:** ~$0.07 per 1-2 hour video outline (comparable to existing summary feature)

## Key Features

### Must Have (Table Stakes)

| Feature | Rationale |
|---------|-----------|
| Clickable timestamps | YouTube chapters trained users to expect instant navigation |
| Hierarchical structure (H1/H2/H3) | Users expect outlines to show topic relationships |
| Complete topic coverage | Every substantive section must be represented |
| Descriptive topic labels | Specific, not generic ("How React hooks work" not "Introduction") |
| Chronological ordering | Timestamps in ascending order, matches video flow |

### Should Have (Differentiators)

| Feature | Value |
|---------|-------|
| Key points under sections | Directly solves "summary too high-level" pain point |
| Estimated time per section | Low complexity, helps users budget attention |
| Collapsible sections | Essential for 1-2 hour videos to avoid overwhelm |

### Defer to v2+

- Topic reorganization/grouping (high complexity, questionable ROI)
- Cross-references between sections (high complexity)
- Advanced speaker identification beyond basic labels

## Architecture Approach

Outline generation integrates as a **third parallel stream** alongside summary and key points. The client initiates three concurrent API calls; the server decides internally whether to use single-pass or chunked processing based on transcript length. No changes to the existing pipeline - just additive.

**Major components:**

1. **Timestamp formatting utility** (`formatTranscriptWithTimestamps`) - Converts `TranscriptSegment[]` to text with inline `[MM:SS]` markers every 30 seconds
2. **Outline API route** (`/api/outline`) - Streaming endpoint using `Output.object()` with Zod schema; auto-selects single-pass vs chunked based on word count
3. **Outline view component** - Renders hierarchical outline with clickable timestamps; collapsible sections for long videos
4. **Database migration** - Dexie v2 schema adds `outline` field to `HistoryEntry`

**Data flow (short videos <60 min):**
```
Transcript -> formatWithTimestamps() -> /api/outline (single-pass) -> stream outline -> IndexedDB
```

**Data flow (long videos >60 min):**
```
Transcript -> formatWithTimestamps() -> /api/outline -> chunk -> parallel extract -> sequential consolidate -> stream outline
```

## Critical Pitfalls

### 1. Lost in the Middle (CRITICAL)

**Problem:** LLMs systematically overlook content in the middle of long transcripts. The beginning and end are well-covered; the middle hour of a 2-hour video may be sparse.

**Prevention:**
- Use chunked processing (15-20 min segments) for videos over 60 minutes
- Include 2-3 minute overlap between chunks to catch boundary content
- Verify coverage in middle sections during testing

### 2. Hallucinated Timestamps (CRITICAL)

**Problem:** LLM generates timestamps that don't correspond to actual transcript positions. User clicks and lands on unrelated content.

**Prevention:**
- Inject actual timestamps into transcript text (`[00:15:30]`)
- Validate all generated timestamps fall within video duration
- Use coarse granularity (30-60 second accuracy) rather than false precision
- Never let LLM interpolate timestamps - anchor to source data

### 3. Map-Reduce Information Loss (HIGH)

**Problem:** Topics spanning chunk boundaries get fragmented or dropped during aggregation. Related content appears in disconnected outline sections.

**Prevention:**
- Use 500-word overlap between chunks (~2-3 minutes of content)
- Two-phase aggregation: extract per-chunk, then consolidate similar topics
- Structured information protocol defines what passes between stages

### 4. Coverage Verification Difficulty (MEDIUM)

**Problem:** "Near-complete coverage" is promised but unverifiable. No ground truth exists. Outline length may not scale with video length.

**Prevention:**
- Length proportionality check: outline detail should scale with video duration
- QAG verification: generate questions from transcript, verify outline answers them
- Don't claim "complete" - communicate estimated coverage honestly

### 5. Inconsistent Hierarchical Structure (MEDIUM)

**Problem:** Different sections have different depths, naming conventions vary, structure is inconsistent across outline.

**Prevention:**
- Use OpenAI structured outputs mode with Zod schema
- Schema enforces 3-level max (outline > section > subsection)
- Post-processing normalization if needed

## Recommendations

### For Requirements Phase

1. **Define timestamp precision expectations** - Is 30-second accuracy acceptable? Document this.
2. **Specify minimum coverage** - "Every 5-minute segment should have representation" is testable.
3. **Clarify outline depth requirements** - Recommend max 3 levels to avoid complexity.
4. **Accept chronological ordering within topics** - True topic reorganization is complex and may not add value.

### For Roadmap Phase

1. **Start with single-pass for short videos** - Prove the pattern works before adding chunking complexity.
2. **Timestamp infrastructure is foundational** - Must come first; everything depends on it.
3. **Defer chunking until single-pass works** - Chunking adds significant complexity; validate approach first.
4. **UI integration can parallel backend work** - Tab/state additions are independent.

### For Implementation Phase

1. **Use `Output.object()` with Zod from day one** - Don't start with freeform text and parse later.
2. **Set `maxOutputTokens: 4000-8000`** - Comprehensive outlines need room; summaries use only 2000.
3. **Validate timestamps before displaying** - Catch hallucinations before user sees them.
4. **Test with actual 2-hour videos** - The "lost in the middle" problem only manifests at scale.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Timestamp Infrastructure

**Rationale:** Everything depends on having timestamps in the transcript. This is the foundational change that enables all outline features.

**Delivers:**
- `formatTranscriptWithTimestamps()` utility
- Updated `processVideo` to return timestamped transcript
- Timestamp validation utilities

**Addresses:** Clickable timestamps (table stakes), timestamp accuracy

**Avoids:** Hallucinated timestamps pitfall

### Phase 2: Single-Pass Outline Generation

**Rationale:** Prove the core pattern works before adding chunking complexity. Single-pass handles majority of videos (under 60 min).

**Delivers:**
- `/api/outline` route with streaming
- Zod schema for 3-level hierarchy
- Basic outline rendering component

**Addresses:** Hierarchical structure, topic labels, complete coverage (for short videos)

**Avoids:** Inconsistent structure pitfall (via schema constraints)

### Phase 3: UI Integration

**Rationale:** Can run in parallel with Phase 2 backend work. Independent state and component changes.

**Delivers:**
- Outline tab in ResultsTabs
- `outline` state in page.tsx
- Third parallel stream integration
- Dexie v2 schema migration

**Addresses:** User can see and navigate outlines

### Phase 4: Long Video Support (Chunking)

**Rationale:** Only after single-pass works. Adds complexity that's only needed for 1-2 hour videos.

**Delivers:**
- Transcript chunking with overlap
- Per-chunk outline extraction (parallel)
- Cross-chunk topic consolidation (sequential)
- Seamless streaming of final result

**Addresses:** Near-complete coverage for long videos

**Avoids:** Lost in the middle, map-reduce information loss

### Phase 5: Quality and Polish

**Rationale:** Verification and UX improvements after core functionality works.

**Delivers:**
- Coverage verification (length proportionality, optional QAG)
- Collapsible sections UI
- Key points under sections (differentiator)
- Time estimation per section

**Addresses:** Differentiator features, quality assurance

### Phase Ordering Rationale

- **Timestamps first** because outline sections need anchors to video positions
- **Single-pass before chunking** to validate core approach with simpler implementation
- **UI can parallel backend** because components and state are independent
- **Long video support later** because it's complex and most videos are under 60 minutes
- **Quality last** because verification requires working generation to verify

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 4 (Chunking):** Optimal chunk size and overlap needs empirical testing with actual 2-hour videos. Research suggests 15-20 minutes with 2-3 minute overlap, but this needs validation.
- **Phase 5 (Coverage verification):** QAG implementation details are sparse. May need to design custom approach or simplify to length-proportionality only.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Timestamps):** Simple text formatting, well-documented
- **Phase 2 (Single-pass):** AI SDK structured outputs are well-documented
- **Phase 3 (UI):** Follows existing patterns in codebase

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | GPT-4o specs verified, AI SDK v6 docs current, existing codebase analyzed |
| Features | MEDIUM | Based on NN/g research, W3C guidelines, community feedback; user validation needed |
| Architecture | HIGH | Follows proven patterns from existing codebase; parallel streaming already works |
| Pitfalls | MEDIUM-HIGH | "Lost in the middle" well-researched; timestamp hallucination less formally documented |

**Overall confidence:** HIGH

### Gaps to Address

- **Chunk size optimization:** 15-20 minutes suggested but needs validation with real 2-hour videos during Phase 4 planning
- **Coverage verification method:** QAG is promising but implementation details sparse; may need to design custom approach or accept simpler length-proportionality check
- **Topic reorganization value:** Research unclear if users actually want topical vs chronological organization; defer and validate later

## Sources

### Primary (HIGH confidence)

**Stack:**
- [OpenAI GPT-4o Docs](https://platform.openai.com/docs/models/gpt-4o) - 128K context verified
- [AI SDK Structured Outputs](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) - `Output.object()` API
- [OpenAI Structured Outputs](https://openai.com/index/introducing-structured-outputs-in-the-api/) - 100% schema compliance

**Architecture:**
- [AI SDK streamText](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text) - Streaming patterns
- Existing codebase analysis - Parallel streaming pattern

### Secondary (MEDIUM confidence)

**Features:**
- [NN/g Table of Contents](https://www.nngroup.com/articles/table-of-contents/) - Navigation expectations
- [W3C WAI Headings](https://www.w3.org/WAI/tutorials/page-structure/headings/) - Hierarchy requirements
- [YouTube Chapters](https://support.google.com/youtube/answer/9884579?hl=en) - Timestamp format

**Pitfalls:**
- [Chroma Research: Context Rot](https://research.trychroma.com/context-rot) - Lost in the middle phenomenon
- [Google Cloud Summarization](https://cloud.google.com/blog/products/ai-machine-learning/long-document-summarization-with-workflows-and-gemini-models) - Map-reduce patterns
- [Nature: Hallucination Framework](https://www.nature.com/articles/s41598-025-31075-1) - Content hallucination research

### Tertiary (LOW confidence)

- [Logos Community Feedback](https://community.logos.com/discussion/223496/feedback-ai-summary-is-not-detailed-enough) - User pain point anecdote
- [YouTube Summary Best Practices](https://youtubesummary.com/blog/youtube-summary-categories-2025) - Timestamp handling advice

---
*Research completed: 2026-01-19*
*Ready for roadmap: yes*
