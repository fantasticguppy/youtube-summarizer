# YouTube Summarizer - Project State

## Overview
A Next.js 16 app that summarizes YouTube videos. Users paste a video URL and get:
- AI-generated summary
- Key points extraction
- Detailed outline
- Full transcript with optional speaker labels

## Tech Stack
- **Framework**: Next.js 16.1.3 with App Router, React 19
- **Styling**: Tailwind CSS 4
- **UI**: Radix UI primitives (tabs, dialog, sheet)
- **Database**: Dexie (IndexedDB) for local history
- **AI**: OpenAI via Vercel AI SDK for summarization
- **Transcription**: YouTube captions (primary), AssemblyAI (fallback with speaker diarization)
- **Audio Extraction**: youtubei.js (replaced ytdl-core Jan 2026)

## Architecture

### Transcript Pipeline
1. **YouTube Captions** (fast, free): `youtube-caption-extractor` library
2. **AssemblyAI Fallback** (when no captions): Extract audio via youtubei.js, transcribe with speaker labels

### Audio Extraction (`src/lib/youtube/extract-audio.ts`)
Uses youtubei.js with multi-client fallback chain:
- TV_EMBEDDED (most reliable)
- WEB
- ANDROID
- iOS

This approach handles YouTube's frequent API changes by trying multiple client types.

### Key Files
```
src/
├── actions/
│   └── process-video.ts      # Server action: metadata + transcript
├── app/
│   ├── page.tsx              # Main UI
│   └── api/
│       ├── summarize/        # Streaming summary generation
│       ├── key-points/       # Key points extraction
│       └── outline/          # Detailed outline generation
├── components/
│   ├── results-tabs.tsx      # Tabbed results UI
│   ├── transcript-view.tsx   # Transcript display
│   └── ...                   # UI components
├── lib/
│   ├── youtube/
│   │   ├── extract-audio.ts  # Audio download (youtubei.js)
│   │   ├── fetch-transcript.ts
│   │   ├── fetch-metadata.ts
│   │   └── extract-video-id.ts
│   ├── assemblyai/
│   │   └── transcribe.ts     # Fallback transcription
│   └── db.ts                 # Dexie history store
└── types/index.ts
```

## Environment Variables
```
OPENAI_API_KEY=          # For summarization
ASSEMBLYAI_API_KEY=      # For fallback transcription
```

## Known Issues & Gotchas
- YouTube frequently changes their API; youtubei.js client fallback helps but may need updates
- Videos without captions trigger AssemblyAI which adds 30-130s processing time
- Max video duration: 3 hours (memory/cost constraint)

## Recent Changes
- **Jan 2026**: Migrated from `@distube/ytdl-core` to `youtubei.js` due to YouTube breaking signature decryption

## Running Locally
```bash
npm install
npm run dev
```

## Test Video
`https://youtu.be/yCCIDNvp5dk` - Good test video for AssemblyAI fallback
