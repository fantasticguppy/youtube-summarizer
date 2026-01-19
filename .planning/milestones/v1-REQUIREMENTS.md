# Requirements Archive: v1 MVP

**Archived:** 2026-01-19
**Status:** SHIPPED

This is the archived requirements specification for v1.
For current requirements, see `.planning/REQUIREMENTS.md` (created for next milestone).

---

# Requirements: YouTube Transcript & Summary Tool

**Defined:** 2025-01-19
**Core Value:** Extract actionable knowledge from YouTube videos -- not just readable summaries, but output structured enough to feed into further work.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Input & Processing

- [x] **INPUT-01**: User can paste YouTube URL and submit
- [x] **INPUT-02**: App displays video metadata (title, channel, thumbnail)
- [x] **INPUT-03**: App fetches transcript via YouTube API when available
- [x] **INPUT-04**: App transcribes audio via AssemblyAI when no transcript available
- [x] **INPUT-05**: App displays processing status during fetch/summarization

### Summary Output

- [x] **SUMM-01**: App generates structured summary (overview, main points by topic, conclusions)
- [x] **SUMM-02**: App generates key points breakdown (main takeaways, facts, arguments)
- [x] **SUMM-03**: Results displayed in tabbed interface (Summary, Key Points, Transcript)
- [x] **SUMM-04**: Full transcript displayed formatted into paragraphs
- [x] **SUMM-05**: Transcript indicates speakers when available (AssemblyAI diarization only)

### Export

- [x] **EXPORT-01**: User can copy any section to clipboard

### History

- [x] **HIST-01**: App saves processed videos locally
- [x] **HIST-02**: User can revisit past videos without re-processing

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Output

- **OUTPUT-01**: Cheat sheet output for technical content (actionable reference)
- **OUTPUT-02**: Download as markdown file
- **OUTPUT-03**: Download as JSON (structured data for machine use)
- **OUTPUT-04**: Download as PDF

### Enhanced History

- **HIST-03**: Search/filter history by title or content
- **HIST-04**: Favorites/bookmarks for important videos
- **HIST-05**: Export full history

### Advanced Processing

- **PROC-01**: Chunked processing for long videos (hierarchical summarization)
- **PROC-02**: Multiple summary styles (TL;DW vs detailed)
- **PROC-03**: Timestamp linking in outputs

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Video downloading/storage | TOS violation risk, only transcripts stored |
| User accounts/authentication | Keep simple, local storage only for v1 |
| Batch processing | One video at a time for v1 |
| Multi-language translation | Process videos in original language |
| Local/scraping transcript extraction | Bot detection makes this unreliable |
| Real-time chat with video | High complexity, not core to value prop |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INPUT-01 | Phase 1 | Complete |
| INPUT-02 | Phase 1 | Complete |
| INPUT-03 | Phase 1 | Complete |
| INPUT-04 | Phase 2 | Complete |
| INPUT-05 | Phase 1 | Complete |
| SUMM-01 | Phase 1 | Complete |
| SUMM-02 | Phase 3 | Complete |
| SUMM-03 | Phase 1 | Complete |
| SUMM-04 | Phase 1 | Complete |
| SUMM-05 | Phase 2 | Complete |
| EXPORT-01 | Phase 1 | Complete |
| HIST-01 | Phase 4 | Complete |
| HIST-02 | Phase 4 | Complete |

**Coverage:**
- v1 requirements: 13 total
- Shipped: 13
- Adjusted: 0
- Dropped: 0

---

## Milestone Summary

**Shipped:** 13 of 13 v1 requirements
**Adjusted:** None
**Dropped:** None

All v1 requirements were delivered as originally specified. The cheat sheet feature (mentioned in original PROJECT.md) was correctly scoped to v2 during requirements definition.

---
*Archived: 2026-01-19 as part of v1 milestone completion*
