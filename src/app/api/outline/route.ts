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
      system: `You are an expert at creating comprehensive outlines from video content. Your outlines are so detailed and well-structured that readers don't need to watch the video or read the transcript. Capture every important point, example, and piece of information. Only include information explicitly stated in the transcript - do not add external information.`,
      prompt: `Create a detailed outline from the following transcript of "${videoTitle}".

Your outline should be comprehensive enough that someone reading it would get ALL the value from the video without needing to read the transcript.

Structure your outline like this:

## 1. [First Major Section/Topic]

**Main point:** [The core idea of this section in 1-2 sentences]

- [Key detail or sub-point]
  - [Supporting detail, example, or quote if relevant]
- [Key detail or sub-point]
- [Key detail or sub-point]

## 2. [Second Major Section/Topic]

**Main point:** [The core idea of this section in 1-2 sentences]

- [Key detail or sub-point]
  - [Supporting detail, example, or quote if relevant]
- [Key detail or sub-point]

[Continue for all major sections...]

## Conclusion/Summary

[What the speaker concludes or the main takeaway]

---

Guidelines:
- Number each major section
- Include ALL significant points, examples, and explanations
- Use nested bullets for supporting details
- Capture specific examples, numbers, or quotes when mentioned
- Preserve the logical flow and structure of the content
- Be thorough - don't summarize, outline everything

TRANSCRIPT:
${transcript}`,
      maxOutputTokens: 4000,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Outline API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate outline' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
