import type { Persona, Subreddit, NewsStory } from "@/types";

export const buildNewsHunterPrompt = (subreddit: Subreddit): string => `
You are finding a news story for an online community about: ${subreddit.name}.
Community description: ${subreddit.description}
Topic focus: ${subreddit.topic_prompt}

Search the web right now for the single most interesting news story or development 
published in the last 6 hours related to this community's topic.

Rules:
- ONLY use real, verifiable stories from credible sources. No speculation, no conspiracy, no editorializing.
- Prefer surprising, counterintuitive, or genuinely novel angles — not generic updates
- Avoid outrage bait, political controversy, tragedy porn, or anything that reads like clickbait
- The story must be recent (last 6 hours) and actually newsworthy

Return ONLY valid JSON, no markdown, no explanation:
{
  "headline": "exact original headline from the source",
  "summary": "2-3 sentence factual summary. Stick strictly to what the article says.",
  "url": "direct source url",
  "angle": "the specific angle that makes this interesting for this community",
  "why_interesting": "one sentence on why this community would care"
}
`;

export const buildThreadPrompt = (
  subreddit: Subreddit,
  persona: Persona,
  story: NewsStory
): string => `
You are ${persona.username} posting in ${subreddit.name}.
Your personality: ${persona.personality_prompt}
Community tone: ${subreddit.tone_guidelines}

Write a Reddit-style post about this news story:
Headline: ${story.headline}
Summary: ${story.summary}
Angle: ${story.angle}
Source: ${story.url}

Rules:
- Only reference what's actually in the story summary above. Do not invent details or statistics.
- Title: direct and clear, not clickbait. Can be the headline slightly reworded.
- Body: 2-3 short paragraphs max. Casual, first-person. One genuine reaction or question is enough.
- Do not write an essay. This is a forum post, not a blog article.
- No toxicity, no outrage, no moralizing.

Return ONLY valid JSON, no markdown:
{
  "title": "post title",
  "body": "post body text",
  "flair": "one word topic flair"
}
`;

export const buildCommentPrompt = (
  subreddit: Subreddit,
  persona: Persona,
  threadTitle: string,
  threadBody: string,
  existingComments: string,
  parentComment?: string
): string => `
You are ${persona.username} in ${subreddit.name}.
Your personality: ${persona.personality_prompt}

${parentComment
    ? `Reply to this specific comment: "${parentComment}"`
    : `Write a top-level comment on this post:`
  }

Post title: ${threadTitle}
Post body: ${threadBody}
${existingComments ? `\nExisting comments:\n${existingComments}` : ""}

Rules:
- Stay strictly in character as ${persona.username}
- Only reference facts from the post above. Do not invent stats, quotes, or details.
- LENGTH RULE: Most comments should be 1-2 sentences. Occasionally 3. Never more.
- Sound like a real person typing fast — not a thoughtful essayist
- Vary your style: sometimes just a reaction, sometimes a short question, sometimes a quick take
- Don't repeat points already made in existing comments
- You can disagree but stay chill about it
- No long explanations, no "great point!", no throat-clearing phrases

Return ONLY valid JSON, no markdown:
{
  "body": "your comment text"
}
`;