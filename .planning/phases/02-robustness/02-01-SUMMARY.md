---
phase: 02-robustness
plan: 01
subsystem: transcription
tags: [assemblyai, ytdl-core, speaker-diarization, audio-extraction]

# Dependency graph
requires:
  - phase: 01-core-pipeline
    provides: YouTube transcript fetching, types infrastructure
provides:
  - AssemblyAI SDK integration with speaker diarization
  - YouTube audio extraction for fallback transcription
  - TranscriptResult type for unified transcript handling
  - SpeakerUtterance type for speaker-labeled transcripts
affects: [02-02, 02-03, process-video integration]

# Tech tracking
tech-stack:
  added: [assemblyai@4.22.1]
  patterns: [fallback transcription, speaker diarization formatting]

key-files:
  created:
    - src/lib/assemblyai/index.ts
    - src/lib/assemblyai/transcribe.ts
    - src/lib/youtube/extract-audio.ts
  modified:
    - src/types/index.ts
    - src/lib/youtube/index.ts
    - package.json

key-decisions:
  - "Use @distube/ytdl-core for audio extraction (archived but functional, plan youtubei.js migration)"
  - "Only show speaker labels when multiple speakers detected (avoids redundant 'Speaker A' labels)"
  - "TranscriptResult as unified type for both YouTube and AssemblyAI sources"

patterns-established:
  - "Fallback transcription: try YouTube captions first, then AssemblyAI"
  - "Speaker formatting: **Speaker X:** prefix only when hasSpeakers=true"

# Metrics
duration: 4min
completed: 2026-01-19
---

# Phase 2 Plan 1: AssemblyAI Backend Summary

**AssemblyAI transcription with speaker diarization using @distube/ytdl-core audio extraction**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-19T19:45:00Z
- **Completed:** 2026-01-19T19:49:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- AssemblyAI SDK installed and client initialized with API key
- Audio extraction function for YouTube videos with clear error handling
- Transcription function with speaker diarization support
- Extended type system with TranscriptSource, SpeakerUtterance, TranscriptResult

## Task Commits

Each task was committed atomically:

1. **Task 1: Install AssemblyAI SDK and extend types** - `9dd2cac` (feat)
2. **Task 2: Create YouTube audio extraction function** - `c4e13da` (feat)
3. **Task 3: Create AssemblyAI client and transcription module** - `f12833e` (feat)

## Files Created/Modified
- `src/lib/assemblyai/index.ts` - AssemblyAI client initialization with env var
- `src/lib/assemblyai/transcribe.ts` - Transcription with speaker diarization
- `src/lib/youtube/extract-audio.ts` - Audio buffer extraction from YouTube
- `src/lib/youtube/index.ts` - Updated exports for audio extraction
- `src/types/index.ts` - TranscriptSource, SpeakerUtterance, TranscriptResult types
- `package.json` - Added assemblyai dependency

## Decisions Made
- Used @distube/ytdl-core for audio extraction despite being archived (Aug 2025) - it's already installed and works. Migration to youtubei.js documented as future work.
- Speaker labels only displayed when multiple unique speakers detected (hasSpeakers check) to avoid redundant "Speaker A:" prefixes on single-speaker content.
- TranscriptResult type unifies YouTube and AssemblyAI transcripts with source tracking.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None - all tasks completed without issues.

## User Setup Required

**External service requires manual configuration.**

For AssemblyAI fallback transcription to work:

1. Get API key from: https://www.assemblyai.com/app/account
2. Add to `.env.local`:
   ```
   ASSEMBLYAI_API_KEY=your_api_key_here
   ```

**Note:** AssemblyAI pricing is $0.15/hour + $0.02/hour for speaker diarization = $0.17/hour total. Free tier includes 185 hours.

## Next Phase Readiness
- AssemblyAI backend ready for integration into process-video.ts (Plan 02-02)
- Types ready for unified transcript handling
- Audio extraction tested and exported
- No blockers for next plan

---
*Phase: 02-robustness*
*Completed: 2026-01-19*
