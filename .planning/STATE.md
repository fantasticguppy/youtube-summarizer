# Project State

## Current Position

**Phase:** 04 of 4 (persistence) - IN PROGRESS
**Plan:** 02 of 02 in phase (COMPLETE)
**Status:** Phase complete
**Last activity:** 2026-01-19 - Completed 04-02-PLAN.md

**Progress:** [##########] 100%
- Phase 01: core-pipeline - COMPLETE (verified)
- Phase 02: robustness - COMPLETE (verified)
- Phase 03: summary-enhancement - COMPLETE (verified)
- Phase 04: persistence - COMPLETE

## Accumulated Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 02-01 | Use @distube/ytdl-core for audio | Archived but functional, migration to youtubei.js documented |
| 02-01 | Speaker labels only when multiple | Avoid redundant "Speaker A:" on single-speaker content |
| 02-01 | TranscriptResult unified type | Consistent handling of YouTube and AssemblyAI sources |
| 03-01 | temperature=0 for key points | Extractive (exact phrases) vs abstractive (narrative) differentiation |
| 03-01 | maxOutputTokens 1500 for key points | More concise than 2000-token summary |
| 03-01 | Separate /api/key-points endpoint | Clear separation from /api/summarize |
| 04-01 | Dexie over idb-keyval | Dexie provides EntityTable typing and useLiveQuery for reactive updates |
| 04-01 | HistoryEntry with Date processedAt | Indexed for sorting by recency |
| 04-02 | Controlled Sheet state | Allows closing panel on video selection |
| 04-02 | useLiveQuery for reactive history | Automatic UI updates when IndexedDB changes |

## Blockers / Concerns

None currently.

## Session Continuity

**Last session:** 2026-01-19T23:19:59Z
**Stopped at:** Completed 04-02-PLAN.md
**Resume file:** None

## Key Files Reference

### Phase 01 - Core Pipeline
- Verification: `.planning/phases/01-core-pipeline/01-VERIFICATION.md`

### Phase 02 - Robustness
- Summary: `.planning/phases/02-robustness/02-01-SUMMARY.md`
- Pending: `.planning/phases/02-robustness/02-02-PLAN.md`

### Phase 03 - Summary Enhancement
- Summary: `.planning/phases/03-summary-enhancement/03-01-SUMMARY.md`
- Verification: `.planning/phases/03-summary-enhancement/03-VERIFICATION.md`

### Phase 04 - Persistence
- Summary: `.planning/phases/04-persistence/04-02-SUMMARY.md`

## Environment Notes

- AssemblyAI API key required in `.env.local` for fallback transcription
- OpenAI API key required for summarization
