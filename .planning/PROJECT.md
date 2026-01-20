# YouTube Transcript & Summary Tool

## Current State

**Version:** v1 MVP (shipped 2026-01-19)
**Status:** Production-ready web application
**Codebase:** 1,913 LOC TypeScript/TSX

A fully functional YouTube transcript and summarization tool. Users paste a URL, get video metadata, transcript (via YouTube captions or AssemblyAI fallback), structured summary, and key points extraction. History is persisted locally for instant replay.

## Current Milestone: v1.1 Outline

**Goal:** Add comprehensive Outline tab and improve transcript readability so users never need to read raw transcripts.

**Target features:**
- Outline tab with hierarchical topical breakdown, timestamps, and near-complete coverage
- Transcript improvements: paragraph formatting, inline timestamps, speaker labels when available
- Support for 1-2+ hour videos

## What This Is

A web application that takes a YouTube video URL and produces a complete transcript plus AI-generated summaries. Users paste a URL, and the app delivers the full transcript, a structured summary, and key points breakdown. The tool uses official APIs to avoid bot detection issues that plague scraping approaches.

## Core Value

**Extract actionable knowledge from YouTube videos** — not just readable summaries, but output structured enough to feed into further work (like Claude Code building something based on a tutorial).

## Requirements

### Validated

- [x] User can paste a YouTube URL and initiate processing — v1
- [x] App displays video metadata (title, channel, thumbnail) — v1
- [x] App fetches video transcript via YouTube API when available — v1
- [x] App transcribes audio via AssemblyAI when YouTube transcript unavailable — v1
- [x] App displays processing status during fetch/summarization — v1
- [x] App generates structured summary via OpenAI (overview, main points by topic, conclusions) — v1
- [x] App generates key points breakdown (main takeaways, arguments, facts) — v1
- [x] Results displayed in tabbed interface (Summary, Key Points, Transcript) — v1
- [x] Transcript indicates speakers when available (AssemblyAI diarization) — v1
- [x] User can copy any section to clipboard — v1
- [x] App saves history of processed videos — v1
- [x] User can revisit past videos without re-processing — v1

### Active (v1.1)

- [ ] Outline tab with comprehensive topical breakdown organized by theme
- [ ] Outline includes timestamps for each section/subsection
- [ ] Outline has near-complete coverage (every distinct point captured)
- [ ] Transcript formatted with paragraph breaks for readability
- [ ] Transcript includes inline timestamps
- [ ] Transcript shows speaker labels when available

### Deferred (v2 Candidates)

- [ ] Cheat sheet output for technical content (actionable reference)
- [ ] Download as markdown file
- [ ] Download as JSON (structured data for machine use)
- [ ] Search/filter history by title or content
- [ ] Favorites/bookmarks for important videos

### Out of Scope

- Local/scraping-based transcript extraction — bot detection makes this unreliable
- Video downloading or storage — only metadata and transcripts stored
- Multi-language translation — process videos in their original language
- Batch processing — one video at a time for v1
- User accounts/authentication — local history only

## Context

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, AI SDK v6, Dexie.js

**External APIs:**
- YouTube oEmbed API — video metadata (no API key required)
- youtube-transcript library — existing captions
- AssemblyAI — audio transcription fallback with speaker diarization
- OpenAI GPT-4o — streaming summary and key points generation

**Known Tech Debt:**
- @distube/ytdl-core archived (Aug 2025) — plan migration to youtubei.js
- ProcessingResult interface unused (orphaned export)

## Constraints

- **API-based:** Must use YouTube Data API, not scraping — reliability and bot detection avoidance
- **External Dependencies:** Requires API keys for OpenAI and AssemblyAI
- **Web-first:** Simple web UI, no CLI needed

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| YouTube oEmbed + youtube-transcript | No API key required, good reliability | Good |
| AssemblyAI for fallback transcription | User's existing preference, good quality | Good |
| OpenAI GPT-4o for summarization | User's choice, streaming works well | Good |
| AI SDK v6 for streaming | Better than direct OpenAI client | Good |
| Tabbed interface | Clean separation of output types | Good |
| Local history with Dexie.js | Simple, no auth complexity, instant replay | Good |
| Dynamic imports for AssemblyAI | Workaround for Next.js 16 bundler | Workaround |

---
*Last updated: 2026-01-19 after starting v1.1 milestone*
