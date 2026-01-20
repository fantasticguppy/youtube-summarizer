# Requirements: YouTube Transcript & Summary Tool

**Defined:** 2026-01-19
**Core Value:** Extract actionable knowledge from YouTube videos — not just readable summaries, but output structured enough to feed into further work.

## v1.1 Requirements

Requirements for Outline milestone. Each maps to roadmap phases.

### Outline Generation

- [ ] **OUTL-01**: App generates hierarchical outline with 3 levels (topics > sections > points)
- [ ] **OUTL-02**: Outline includes timestamps on each section and subsection
- [ ] **OUTL-03**: Outline provides near-complete coverage (every substantive topic represented)
- [ ] **OUTL-04**: Outline is organized by theme/topic, not chronologically
- [ ] **OUTL-05**: Outline includes key points under each section with specific details
- [ ] **OUTL-06**: Outline sections are collapsible for scanning
- [ ] **OUTL-07**: Outline shows time estimate per section
- [ ] **OUTL-08**: Outline generation handles 1-2+ hour videos via chunked processing

### Transcript Improvements

- [ ] **TRNS-01**: Transcript displays with paragraph breaks for readability
- [ ] **TRNS-02**: Transcript includes inline timestamps throughout
- [ ] **TRNS-03**: Transcript shows speaker labels when available (AssemblyAI)
- [ ] **TRNS-04**: Transcript timestamps are clickable (open YouTube at that moment)

### Live Video Support

- [ ] **LIVE-01**: Audio extraction works for live video recordings (youtube.com/live URLs)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Output

- **OUTPUT-01**: Cheat sheet output for technical content (actionable reference)
- **OUTPUT-02**: Download as markdown file
- **OUTPUT-03**: Download as JSON (structured data for machine use)

### Enhanced History

- **HIST-03**: Search/filter history by title or content
- **HIST-04**: Favorites/bookmarks for important videos

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Video downloading/storage | TOS violation risk, only transcripts stored |
| User accounts/authentication | Keep simple, local storage only |
| Batch processing | One video at a time |
| Multi-language translation | Process videos in original language |
| AI speaker detection for YouTube transcripts | Complex, AssemblyAI already provides this |
| Real-time live stream processing | Only process after stream ends |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| OUTL-01 | Phase 6 | Pending |
| OUTL-02 | Phase 6 | Pending |
| OUTL-03 | Phase 6, 8 | Pending |
| OUTL-04 | Phase 6 | Pending |
| OUTL-05 | Phase 6 | Pending |
| OUTL-06 | Phase 7 | Pending |
| OUTL-07 | Phase 7 | Pending |
| OUTL-08 | Phase 8 | Pending |
| TRNS-01 | Phase 9 | Pending |
| TRNS-02 | Phase 5 | Pending |
| TRNS-03 | Phase 9 | Pending |
| TRNS-04 | Phase 5 | Pending |
| LIVE-01 | Phase 9 | Pending |

**Coverage:**
- v1.1 requirements: 13 total
- Mapped to phases: 13/13
- Unmapped: 0

---
*Requirements defined: 2026-01-19*
*Last updated: 2026-01-19 after roadmap creation*
