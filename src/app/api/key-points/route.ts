import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const maxDuration = 60; // Allow up to 60 seconds for long transcripts

export async function POST(req: Request) {
  try {
    const { transcript, videoTitle } = await req.json();

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Transcript is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = streamText({
      model: openai('gpt-4o'),
      temperature: 0,
      system: `You are an expert at extracting key information from video transcripts. Your task is to identify and list the most important points EXACTLY as stated in the transcript. Do NOT paraphrase or summarize - extract direct facts, claims, and actionable items using the speaker's original wording where possible.`,
      prompt: `Extract the key points from this transcript of "${videoTitle}".

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
${transcript}`,
      maxOutputTokens: 1500,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Key-points API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate key points' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
