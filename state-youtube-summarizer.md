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
- **Audio Extraction**: youtubei.js + yt-dlp fallback

## Architecture

### Transcript Pipeline
1. **YouTube Captions** (fast, free): `youtube-caption-extractor` library
2. **AssemblyAI Fallback** (when no captions): Extract audio, transcribe with speaker labels

### Audio Extraction (`src/lib/youtube/extract-audio.ts`)
Two-tier fallback system:

**Tier 1: youtubei.js** - Tries multiple client types:
- TV, TV_EMBEDDED, MWEB, WEB, ANDROID, iOS

**Tier 2: yt-dlp** - External CLI fallback when youtubei.js fails:
- Uses Safari cookies for authentication
- Requires `--extractor-args "youtube:player_client=android,web"` to bypass YouTube's SABR streaming restrictions
- Falls back to any available format if audio-only unavailable

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
│   │   ├── extract-audio.ts  # Audio download (youtubei.js + yt-dlp)
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

## System Requirements
- **yt-dlp**: Required for fallback audio extraction (`brew install yt-dlp`)
- **Safari**: Must be logged into YouTube for cookie-based auth

## Known Issues & Gotchas
- YouTube frequently changes their API; multi-tier fallback helps but may need updates
- Videos without captions trigger AssemblyAI which adds 30-130s processing time
- Max video duration: 3 hours (memory/cost constraint)
- Some videos require yt-dlp fallback due to YouTube's PO Token / SABR streaming restrictions
- yt-dlp uses Safari cookies - user must be logged into YouTube in Safari

## Recent Changes
- **Jan 28, 2026**: Added yt-dlp as fallback when youtubei.js fails (handles SABR streaming)
- **Jan 28, 2026**: Added `--extractor-args "youtube:player_client=android,web"` for yt-dlp
- **Jan 2026**: Migrated from `@distube/ytdl-core` to `youtubei.js`

## Running Locally
```bash
npm install
brew install yt-dlp  # if not installed
npm run dev
```

Access from iOS on same network: use the Network URL shown in terminal (e.g., `http://192.168.x.x:3000`)

## Test Videos
- `https://youtu.be/yCCIDNvp5dk` - Works with youtubei.js
- `https://youtu.be/8lF7HmQ_RgY` - Requires yt-dlp fallback (no captions, SABR protected)
