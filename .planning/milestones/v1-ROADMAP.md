# Milestone v1: MVP

**Status:** SHIPPED 2026-01-19
**Phases:** 1-4
**Total Plans:** 8

## Overview

This roadmap delivered a YouTube video transcript and summarization tool in four phases. Phase 1 established the core pipeline (URL to summary for videos with captions). Phase 2 added robustness via AssemblyAI fallback for videos without captions. Phase 3 enhanced summarization with key points extraction. Phase 4 completed the experience with local history storage and retrieval.

## Phases

### Phase 1: Core Pipeline

**Goal**: Users can paste a YouTube URL and get a transcript plus structured summary for any video with existing captions
**Depends on**: Nothing (first phase)
**Requirements**: INPUT-01, INPUT-02, INPUT-03, INPUT-05, SUMM-01, SUMM-03, SUMM-04, EXPORT-01
**Success Criteria** (what must be TRUE):
  1. User can paste any YouTube URL format and initiate processing
  2. User sees video title, channel, and thumbnail before processing completes
  3. User sees processing status indicators during fetch and summarization
  4. User can view full transcript formatted into readable paragraphs in a tab
  5. User can view structured summary (overview, main points, conclusions) in a tab
  6. User can copy any section to clipboard with one click
**Plans**: 3 plans in 2 waves

Plans:
- [x] 01-01-PLAN.md — Project scaffolding with Next.js + shadcn/ui, URL input, video preview
- [x] 01-02-PLAN.md — YouTube utilities (URL parsing, metadata fetch, transcript fetch, formatting)
- [x] 01-03-PLAN.md — Summarization API with streaming, tabbed results UI, copy functionality

**Details:**
- Tech stack: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, AI SDK v6
- Key patterns: Streaming API responses, server actions, component composition
- Duration: ~14 min across 3 plans

### Phase 2: Robustness

**Goal**: Users can process videos that lack YouTube captions via AssemblyAI audio transcription
**Depends on**: Phase 1
**Requirements**: INPUT-04, SUMM-05
**Success Criteria** (what must be TRUE):
  1. When YouTube captions unavailable, app automatically transcribes via AssemblyAI
  2. User sees clear indication when fallback transcription is being used
  3. Transcript shows speaker labels when AssemblyAI diarization detects multiple speakers
**Plans**: 2 plans in 2 waves

Plans:
- [x] 02-01-PLAN.md — AssemblyAI SDK, audio extraction, transcription with speaker diarization
- [x] 02-02-PLAN.md — Fallback integration into pipeline, UI source indicators, speaker labels

**Details:**
- Tech stack: AssemblyAI SDK v4.22, @distube/ytdl-core for audio extraction
- Key patterns: Dynamic imports for bundler compatibility, route segment config for timeouts
- Duration: ~12 min across 2 plans
- Note: Used dynamic import workaround for Next.js 16 Turbopack bundler issues

### Phase 3: Summary Enhancement

**Goal**: Users get actionable key points breakdown in addition to structured summary
**Depends on**: Phase 2
**Requirements**: SUMM-02
**Success Criteria** (what must be TRUE):
  1. User can view key points breakdown (main takeaways, facts, arguments) in dedicated tab
  2. Key points are distinct from structured summary (extractive vs narrative)
**Plans**: 1 plan in 1 wave

Plans:
- [x] 03-01-PLAN.md — Key points extraction with parallel streaming, tabbed display

**Details:**
- Key patterns: Parallel API calls with Promise.all, three-tab layout
- Duration: ~5 min

### Phase 4: Persistence

**Goal**: Users can save and revisit previously processed videos without re-processing
**Depends on**: Phase 3
**Requirements**: HIST-01, HIST-02
**Success Criteria** (what must be TRUE):
  1. Processed videos are automatically saved locally
  2. User can see list of previously processed videos
  3. User can select a past video and view its transcript/summaries instantly (no re-processing)
**Plans**: 2 plans in 2 waves

Plans:
- [x] 04-01-PLAN.md — Dexie.js database setup, HistoryEntry type, auto-save after processing
- [x] 04-02-PLAN.md — History panel UI with slide-out sheet, load and delete functionality

**Details:**
- Tech stack: Dexie.js v4.2, dexie-react-hooks for reactive queries
- Key patterns: Fire-and-forget saves, deduplication by videoId, useLiveQuery
- Duration: ~8 min across 2 plans

---

## Milestone Summary

**Key Decisions:**
- AI SDK v6 with streamText for real-time streaming (better than direct OpenAI client)
- GPT-4o for summarization (quality/cost balance)
- AssemblyAI for fallback transcription (user's existing preference)
- Dexie.js for IndexedDB (simpler than raw IndexedDB, good React hooks)
- Dynamic imports for AssemblyAI (Next.js 16 bundler workaround)

**Issues Resolved:**
- AI SDK parameter naming (`maxOutputTokens` not `maxTokens`)
- Next.js 16 Turbopack bundler issues with server action imports
- Server action body size limits for audio buffers

**Technical Debt Incurred:**
- @distube/ytdl-core is archived (Aug 2025) — plan migration to youtubei.js
- ProcessingResult interface defined but never used (orphaned export)
- Missing VERIFICATION.md for phases 3 and 4

---

*For current project status, see .planning/ROADMAP.md (created for next milestone)*

---
*Archived: 2026-01-19*
