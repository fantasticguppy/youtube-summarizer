import { streamText, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import {
  needsChunking,
  chunkTranscript,
  chunkContextPrefix,
  createMergePrompt
} from '@/lib/chunking';

export const maxDuration = 120; // Allow up to 120 seconds for chunked transcripts

const SYSTEM_PROMPT = `You are an expert at extracting key information from video transcripts. Your task is to identify and list the most important points EXACTLY as stated in the transcript. Do NOT paraphrase or summarize - extract direct facts, claims, and actionable items using the speaker's original wording where possible.`;

const KEYPOINTS_PROMPT = (videoTitle: string, transcript: string, chunkPrefix: string) => `${chunkPrefix}Extract the key points from this transcript of "${videoTitle}".

IMPORTANT: This should be EXTRACTIVE, not abstractive. Pull out specific facts, statistics, quotes, and claims directly from the transcript. Do not rephrase or summarize them.

Format your response EXACTLY as:

## Main Takeaways
[3-5 most important insights - use direct quotes or close paraphrases]

## Key Facts & Data
[Specific numbers, statistics, dates, names, or concrete claims mentioned]

## Core Arguments
[Main positions, recommendations, or assertions the speaker makes]

## Action Items
[Any specific recommendations or next steps mentioned - omit section if none]

---

TRANSCRIPT:
${transcript}`;

export async function POST(req: Request) {
  try {
    const { transcript, videoTitle } = await req.json();

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Transcript is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if chunking is needed
    if (!needsChunking(transcript)) {
      // Direct streaming for short transcripts
      const result = streamText({
        model: openai('gpt-4o'),
        temperature: 0,
        system: SYSTEM_PROMPT,
        prompt: KEYPOINTS_PROMPT(videoTitle, transcript, ''),
        maxOutputTokens: 1500,
      });

      return result.toTextStreamResponse();
    }

    // Chunked processing for long transcripts
    const chunks = chunkTranscript(transcript);
    console.log(`Chunking transcript into ${chunks.length} parts for key points`);

    // Process all chunks in parallel
    const chunkResults = await Promise.all(
      chunks.map(async (chunk) => {
        const result = await generateText({
          model: openai('gpt-4o'),
          temperature: 0,
          system: SYSTEM_PROMPT,
          prompt: KEYPOINTS_PROMPT(videoTitle, chunk.text, chunkContextPrefix(chunk)),
          maxOutputTokens: 1500,
        });
        return result.text;
      })
    );

    // Merge chunk key points and stream the result
    const mergePrompt = createMergePrompt(chunkResults, videoTitle, 'keypoints');
    const mergeResult = streamText({
      model: openai('gpt-4o'),
      temperature: 0,
      system: SYSTEM_PROMPT,
      prompt: mergePrompt,
      maxOutputTokens: 2000,
    });

    return mergeResult.toTextStreamResponse();
  } catch (error) {
    console.error('Key-points API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate key points' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
