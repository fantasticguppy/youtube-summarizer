# Roadmap: YouTube Transcript & Summary Tool

## Milestones

- [x] **v1.0 MVP** - Phases 1-4 (shipped 2026-01-19)
- [ ] **v1.1 Outline** - Phases 5-9 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-4) - SHIPPED 2026-01-19</summary>

### Phase 1: Core Pipeline
**Goal**: Basic transcript fetch and display
**Plans**: 3 plans (complete)

### Phase 2: Robustness
**Goal**: AssemblyAI fallback for missing transcripts
**Plans**: 2 plans (complete)

### Phase 3: Summary Enhancement
**Goal**: Key points extraction tab
**Plans**: 1 plan (complete)

### Phase 4: Persistence
**Goal**: History with instant replay
**Plans**: 2 plans (complete)

</details>

### v1.1 Outline (In Progress)

**Milestone Goal:** Add comprehensive Outline tab and improve transcript readability so users never need to read raw transcripts.

#### Phase 5: Timestamp Infrastructure
**Goal**: Timestamps flow through the entire pipeline, enabling clickable navigation
**Depends on**: Phase 4 (v1 foundation)
**Requirements**: TRNS-02, TRNS-04
**Success Criteria** (what must be TRUE):
  1. User sees inline timestamps throughout the transcript view (every 30-60 seconds)
  2. User can click any timestamp in transcript to open YouTube at that moment
  3. Transcript data retains timestamp information for downstream use (outline generation)
**Plans**: 2 plans

Plans:
- [ ] 05-01-PLAN.md — Data model: add segments to HistoryEntry + Dexie v2 migration
- [ ] 05-02-PLAN.md — UI: clickable inline timestamps in transcript view

#### Phase 6: Core Outline Generation
**Goal**: Single-pass outline generation with streaming structured output for videos under 60 minutes
**Depends on**: Phase 5 (timestamp infrastructure)
**Requirements**: OUTL-01, OUTL-02, OUTL-03, OUTL-04, OUTL-05
**Success Criteria** (what must be TRUE):
  1. User sees hierarchical outline with 3 levels (topics > sections > points) for any video under 60 min
  2. Each outline section shows a clickable timestamp linking to that video position
  3. Outline is organized by theme/topic, grouping related content (not strictly chronological)
  4. Each section includes specific key points capturing the substantive content
  5. Outline streams progressively as it generates (not all-at-once at the end)
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

#### Phase 7: Outline UI Integration
**Goal**: Outline tab with collapsible sections and time estimates integrated into the app
**Depends on**: Phase 6 (outline generation)
**Requirements**: OUTL-06, OUTL-07
**Success Criteria** (what must be TRUE):
  1. User can access Outline tab alongside Summary, Key Points, and Transcript tabs
  2. User can expand/collapse outline sections to scan or dive deep
  3. Each section shows estimated duration (e.g., "5 min") helping user budget attention
  4. Outline is persisted to history and loads instantly on revisit
**Plans**: TBD

Plans:
- [ ] 07-01: TBD

#### Phase 8: Long Video Support
**Goal**: Chunked processing enables comprehensive outlines for 1-2+ hour videos
**Depends on**: Phase 6 (core outline generation)
**Requirements**: OUTL-08
**Success Criteria** (what must be TRUE):
  1. User can generate outline for videos up to 2+ hours without timeout or truncation
  2. Middle sections of long videos have comparable coverage to beginning/end (no "lost in middle")
  3. Outline streaming shows progress during multi-chunk processing
  4. Topics spanning chunk boundaries are consolidated (no fragmented duplicate sections)
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD

#### Phase 9: Transcript Improvements & Live Video Fix
**Goal**: Transcript readability improvements and live video compatibility
**Depends on**: Phase 5 (timestamp infrastructure)
**Requirements**: TRNS-01, TRNS-03, LIVE-01
**Success Criteria** (what must be TRUE):
  1. Transcript displays with paragraph breaks for readability (not wall of text)
  2. Speaker labels appear when available (AssemblyAI transcripts)
  3. Live video recordings (youtube.com/live URLs) process successfully
**Plans**: TBD

Plans:
- [ ] 09-01: TBD

## Progress

**Execution Order:** 5 > 6 > 7 > 8 > 9 (Phase 9 can run in parallel with 7-8 after Phase 5)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Core Pipeline | v1.0 | 3/3 | Complete | 2026-01-19 |
| 2. Robustness | v1.0 | 2/2 | Complete | 2026-01-19 |
| 3. Summary Enhancement | v1.0 | 1/1 | Complete | 2026-01-19 |
| 4. Persistence | v1.0 | 2/2 | Complete | 2026-01-19 |
| 5. Timestamp Infrastructure | v1.1 | 0/2 | Planned | - |
| 6. Core Outline Generation | v1.1 | 0/TBD | Not started | - |
| 7. Outline UI Integration | v1.1 | 0/TBD | Not started | - |
| 8. Long Video Support | v1.1 | 0/TBD | Not started | - |
| 9. Transcript & Live Fix | v1.1 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-01-19*
*v1.1 milestone: Phases 5-9*
