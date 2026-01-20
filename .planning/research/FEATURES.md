# Features Research: v1.1 Outline

**Domain:** Video transcript outline/summary for 1-2+ hour videos
**Researched:** 2026-01-19
**Confidence:** MEDIUM (based on multiple sources including NNG, W3C, academic research, and user feedback)

## User Expectations

### What "Complete Outline" Means

Users expect an outline that serves as a **replacement for reading the full transcript**, not a supplement that requires them to still read everything. Research and user feedback consistently show:

1. **Navigability over brevity**: Users want to quickly find specific information without scrolling through irrelevant content ([NN/g](https://www.nngroup.com/articles/table-of-contents/))

2. **Detail over generic summaries**: User feedback from Logos Community explicitly states AI summaries are "just not detailed enough" - users resort to external tools like ChatGPT/Claude for better results ([Logos Community](https://community.logos.com/discussion/223496/feedback-ai-summary-is-not-detailed-enough))

3. **Juicy details, not homogeneous slurry**: Good summaries "surface juicy details" rather than averaging everything into boring, uninformative content ([Josh Bernoff](https://bernoff.com/blog/amazons-ai-generated-review-summaries-are-boring-and-useless))

4. **Mental model formation**: A table of contents allows users to "understand what the page has to offer without delving into details" and "form a mental model" of the content ([NN/g](https://www.nngroup.com/articles/table-of-contents/))

### Use Cases to Support

Based on project context, the outline must support:

| Use Case | What User Needs | Implication |
|----------|-----------------|-------------|
| **Find specific info** | Jump to exact topic | Timestamps + descriptive headings |
| **Understand flow** | See logical progression | Hierarchical structure showing relationships |
| **Reference while working** | Quick lookup without context loss | Floating/accessible navigation |

### "Near-Complete Coverage" Defined

Based on information granularity research, "near-complete" for an outline means:

- **Summary level, not detail level**: Each major topic covered, not every sentence
- **No significant topics missing**: All substantive content areas represented
- **Sufficient context to decide**: User can determine if a section is relevant without reading it
- **Key points preserved**: Important facts, examples, or arguments captured

Practical test: A user who reads only the outline should be able to accurately describe "what the video is about" at a level sufficient for their use case.

---

## Table Stakes

Features users **expect**. Missing any of these makes the outline feel incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Clickable timestamps** | YouTube chapters trained users to expect instant navigation | Low | Format: `MM:SS` for <1hr, `HH:MM:SS` for 1hr+ |
| **Hierarchical structure** | Users expect outlines to show relationships between topics | Low | Main topics (H2) with subtopics (H3) |
| **Topic labels** | Users need to know what each section is about without reading it | Medium | Descriptive, not cryptic |
| **Complete topic coverage** | Missing topics = broken mental model | Medium | Every substantive section represented |
| **Chronological order** | Matches video flow, enables following along | Low | Timestamps in ascending order |
| **Readable typography** | Wall of text = unusable | Low | Clear fonts, adequate spacing, hierarchy |

### Timestamp Requirements (Critical)

Based on YouTube chapter research ([YouTube Help](https://support.google.com/youtube/answer/9884579?hl=en), [Captions.ai](https://www.captions.ai/blog-post/youtube-link-with-timestamp)):

- First timestamp must be `00:00` (or near start)
- Minimum 3 timestamps for meaningful navigation
- Format must be consistent throughout
- Timestamps must be in ascending chronological order
- Each timestamp needs a descriptive label (max 120 chars for YouTube compat)

### Heading Hierarchy (Critical)

Based on accessibility research ([W3C WAI](https://www.w3.org/WAI/tutorials/page-structure/headings/), [Princeton Accessibility](https://digital.accessibility.princeton.edu/how/content/headings)):

- Never skip heading levels (H1 -> H3 without H2 is wrong)
- H1 = Video title/main topic
- H2 = Major sections/topics
- H3 = Subtopics within major sections
- H4+ = Use sparingly, only for deep nesting
- Recommend max 3 levels deep (H1, H2, H3) for readability

---

## Differentiators

Features that set the product apart. Not expected, but significantly valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Key points under each section** | Lets users grasp content without reading transcript | Medium | 2-4 bullet points per major section |
| **Speaker identification** | Critical for interviews, panels, podcasts | Medium | "Speaker A discusses...", "Host asks about..." |
| **Topic grouping/reorganization** | Sometimes chronological != logical grouping | High | Optional: Group related topics together |
| **Search within outline** | Find specific terms across all sections | Medium | Browser search works, but explicit UI helps |
| **Collapsible sections** | Reduce cognitive load, expand as needed | Low | Toggle functionality per NN/g research |
| **Copy section with timestamp link** | Share specific moments easily | Low | One-click copy of `[Topic] (MM:SS)` |
| **Estimated time per section** | Help users budget attention | Low | Calculate from timestamp spans |
| **Key quotes/examples** | Surface the "juicy details" users want | Medium | Pull notable quotes from transcript |
| **Cross-references** | "See also: [Related Topic] at [Timestamp]" | High | Link related discussions in different parts |

### High-Impact Differentiators (Prioritize These)

Based on user pain point ("current summary too high-level"):

1. **Key points under sections** - Directly addresses "forces reading full transcript" problem
2. **Collapsible sections** - Handles long videos (1-2+ hours) without overwhelming
3. **Estimated time per section** - Helps users with "find specific info" use case

---

## Anti-Features

Things to **deliberately NOT do**. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Generic summaries** | "This video discusses X" tells user nothing useful | Use specific, descriptive labels with key details |
| **Verbatim transcript chunks** | Defeats purpose of outline | Synthesize and summarize, don't copy-paste |
| **Too few timestamps** | 3-5 timestamps for 2hr video is useless | Aim for timestamp every 5-10 minutes of content |
| **Overly deep nesting** | H4, H5, H6 become confusing | Max 3 levels; flatten if deeper |
| **Wall of text bullets** | Long bullets = just another transcript | Keep bullets to 1-2 sentences max |
| **Missing critical details** | NN/g found AI summaries often drop important specifics | Include dates, names, numbers when mentioned |
| **Timestamp without context** | "12:34" alone means nothing | Always pair timestamp with descriptive label |
| **Hiding the outline** | Forcing users to expand to see anything | Show top-level structure by default |
| **Auto-collapsing while reading** | Disrupts user's mental model | Preserve user's expand/collapse state |
| **Inconsistent formatting** | Different styles for similar content | Use consistent template throughout |

### Common AI Summary Failures to Avoid

From Northwestern CASMI research and NN/g studies:

1. **Contradictory themes** - AI sometimes includes conflicting information in summary
2. **Wrong specifics** - Dates, times, numbers may be misrepresented
3. **Boring averaging** - Removing all interesting details to create "safe" summary
4. **Vague language** - "The speaker discusses various aspects of..." (useless)
5. **Context loss** - Summary makes sense only if you already know the content

---

## Transcript Formatting

What makes the underlying transcript readable when users do need to dive deeper.

### Typography Requirements

Based on transcription formatting research ([SpeakWrite](https://speakwrite.com/blog/transcription-formatting/), [Way With Words](https://waywithwords.net/resource/custom-transcript-formatting-readability/)):

| Element | Recommendation | Why |
|---------|----------------|-----|
| **Font** | Serif (Times New Roman) or clean sans-serif (Arial, Calibri) | Readability; avoid decorative fonts |
| **Font size** | 16px base (Google Material Design standard) | Optimal reading per Baymard Institute |
| **Line height** | 1.5x font size minimum | Below 1.4x causes reading difficulty |
| **Line length** | ~66 characters per line | Sweet spot per typographic research |
| **Paragraph length** | 400-500 characters max | Break up long speech for readability |
| **Alignment** | Left-aligned | WCAG accessibility; avoid justified text |

### Transcript Structure

| Element | Recommendation | Notes |
|---------|----------------|-------|
| **Speaker labels** | "Speaker Name:" or "[Speaker]" | Essential for multi-speaker content |
| **Timestamp frequency** | Every 30-60 seconds | Balance between granularity and clutter |
| **Paragraph breaks** | At topic/speaker changes | Avoid wall of text |
| **Non-verbal cues** | [laughs], [pause], [applause] | Adds context when relevant |
| **Clean read style** | Remove "um", "uh", filler words | Unless verbatim is specifically needed |
| **Headings in transcript** | Match outline sections | Creates navigable document |

### Accessibility Considerations

Based on W3C WAI guidelines ([W3C](https://www.w3.org/WAI/media/av/transcripts/)):

- Transcripts enable screen reader users and Braille display users
- Searchable by computers and users (discoverability)
- Can be translated more easily than audio
- Useful for those with cognitive differences (dyslexia, etc.)

---

## Feature Dependencies

```
Clickable timestamps
    |
    +-- Requires: Accurate timestamp extraction from transcript
    +-- Enables: Section time estimation
    +-- Enables: Deep linking / sharing specific moments

Hierarchical structure
    |
    +-- Requires: Topic detection / segmentation
    +-- Enables: Collapsible sections
    +-- Enables: Table of contents navigation

Key points per section
    |
    +-- Requires: Summarization capability
    +-- Requires: Hierarchical structure (to know what "per section" means)
    +-- Risk: May need quality validation to avoid AI summary failures
```

---

## MVP Recommendation

For v1.1 MVP, prioritize these table stakes:

1. **Clickable timestamps** - Core navigation requirement
2. **Hierarchical structure (H1/H2/H3)** - Users expect outline = hierarchy
3. **Complete topic coverage** - Every substantive section represented
4. **Descriptive topic labels** - Not generic, includes specifics
5. **Readable typography** - Clear fonts, spacing, alignment

Consider these differentiators for MVP:

1. **Key points under major sections** - Directly solves "too high-level" pain point
2. **Estimated time per section** - Low complexity, high utility

Defer to post-MVP:

- Topic reorganization/grouping (High complexity, questionable ROI)
- Cross-references (High complexity)
- Speaker identification beyond basic labels (Medium complexity, video-dependent)

---

## Sources

### HIGH Confidence (Official/Authoritative)
- [W3C WAI - Transcripts](https://www.w3.org/WAI/media/av/transcripts/)
- [W3C WAI - Headings](https://www.w3.org/WAI/tutorials/page-structure/headings/)
- [YouTube Help - Video Chapters](https://support.google.com/youtube/answer/9884579?hl=en)
- [MDN - Heading Elements](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/Heading_Elements)

### MEDIUM Confidence (Research/Expert Sources)
- [NN/g - Table of Contents](https://www.nngroup.com/articles/table-of-contents/)
- [NN/g - In-Page Links](https://www.nngroup.com/articles/in-page-links-content-navigation/)
- [NN/g - AI Reviews](https://www.nngroup.com/articles/ai-reviews/)
- [Northwestern CASMI - AI Summarization Dilemma](https://casmi.northwestern.edu/news/articles/2024/the-ai-summarization-dilemma-when-good-enough-isnt-enough.html)
- [ScienceDirect - Lecture Note-taking with Outlines](https://www.sciencedirect.com/science/article/abs/pii/S2211368115000200)
- [arXiv - Video Summarization Techniques](https://arxiv.org/html/2410.04449v1)

### LOW Confidence (Community/Single Source)
- [Logos Community - AI Summary Feedback](https://community.logos.com/discussion/223496/feedback-ai-summary-is-not-detailed-enough)
- [Josh Bernoff - Amazon AI Summaries](https://bernoff.com/blog/amazons-ai-generated-review-summaries-are-boring-and-useless)
- [Captions.ai - YouTube Timestamps](https://www.captions.ai/blog-post/youtube-link-with-timestamp)
- [SpeakWrite - Transcription Formatting](https://speakwrite.com/blog/transcription-formatting/)
