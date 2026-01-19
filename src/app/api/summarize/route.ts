import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const maxDuration = 60; // Allow up to 60 seconds for long transcripts

export async function POST(req: Request) {
  const { transcript, videoTitle } = await req.json();

  if (!transcript || typeof transcript !== 'string') {
    return new Response(JSON.stringify({ error: 'Transcript is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = streamText({
    model: openai('gpt-4o'),
    system: `You are an expert at summarizing video content. Create structured summaries that are clear, accurate, and actionable. Only include information explicitly stated in the transcript - do not add external information or make assumptions.`,
    prompt: `Summarize the following transcript from the video "${videoTitle}".

Provide your response in this exact structure using markdown:

## Overview
[2-3 sentence high-level summary of what the video covers and its main purpose]

## Main Points
[Bullet points of the key topics and insights, grouped by theme if applicable. Use nested bullets for sub-points.]

## Key Takeaways
[3-5 actionable conclusions, important facts, or things the viewer should remember]

---

TRANSCRIPT:
${transcript}`,
    maxOutputTokens: 2000,
  });

  return result.toTextStreamResponse();
}
