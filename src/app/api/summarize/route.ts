import { streamText, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import {
  needsChunking,
  chunkTranscript,
  chunkContextPrefix,
  createMergePrompt
} from '@/lib/chunking';

export const maxDuration = 120; // Allow up to 120 seconds for chunked transcripts

const SYSTEM_PROMPT = `You are an expert at summarizing video content. Create structured summaries that are clear, accurate, and actionable. Only include information explicitly stated in the transcript - do not add external information or make assumptions.`;

const SUMMARY_PROMPT = (videoTitle: string, transcript: string, chunkPrefix: string) => `${chunkPrefix}Summarize the following transcript from the video "${videoTitle}".

Provide your response in this exact structure using markdown:

## Overview
[2-3 sentence high-level summary of what the video covers and its main purpose]

## Main Points
[Bullet points of the key topics and insights, grouped by theme if applicable. Use nested bullets for sub-points.]

## Key Takeaways
[3-5 actionable conclusions, important facts, or things the viewer should remember]

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
        system: SYSTEM_PROMPT,
        prompt: SUMMARY_PROMPT(videoTitle, transcript, ''),
        maxOutputTokens: 2000,
      });

      return result.toTextStreamResponse();
    }

    // Chunked processing for long transcripts
    const chunks = chunkTranscript(transcript);
    console.log(`Chunking transcript into ${chunks.length} parts for summarization`);

    // Process all chunks in parallel
    const chunkResults = await Promise.all(
      chunks.map(async (chunk) => {
        const result = await generateText({
          model: openai('gpt-4o'),
          system: SYSTEM_PROMPT,
          prompt: SUMMARY_PROMPT(videoTitle, chunk.text, chunkContextPrefix(chunk)),
          maxOutputTokens: 2000,
        });
        return result.text;
      })
    );

    // Merge chunk summaries and stream the result
    const mergePrompt = createMergePrompt(chunkResults, videoTitle, 'summary');
    const mergeResult = streamText({
      model: openai('gpt-4o'),
      system: SYSTEM_PROMPT,
      prompt: mergePrompt,
      maxOutputTokens: 2500,
    });

    return mergeResult.toTextStreamResponse();
  } catch (error) {
    console.error('Summarize API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate summary' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
