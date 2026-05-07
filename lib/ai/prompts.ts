import type { Persona, Community, NewsStory, ContentPayload } from "@/types";

export function languageInstruction(community: Community): string {
  if (community.language === 'en' && !community.language_strict) return '';

  const langNames: Record<string, string> = {
    fr: 'French', de: 'German', es: 'Spanish', ja: 'Japanese',
    pt: 'Portuguese', it: 'Italian', nl: 'Dutch', ko: 'Korean',
    zh: 'Mandarin Chinese', ru: 'Russian', ar: 'Arabic',
  };

  const langName = langNames[community.language] ?? community.language;

  return community.language_strict
    ? `LANGUAGE: You MUST write entirely in ${langName}. No English unless it is a proper noun or brand name.`
    : `LANGUAGE: This community primarily speaks ${langName}. Prefer ${langName} for your response, but English is acceptable for technical terms.`;
}

export const buildNewsHunterPrompt = (community: Community, coveredHeadlines: string[] = []): string => `
You are finding a news story for an online community about: ${community.name}.
Community description: ${community.description}
Topic focus: ${community.topic_prompt}
${languageInstruction(community)}

Search the web right now for the single most interesting news story or development 
published in the last 6 hours related to this community's topic.
Prefer stories from major wire services (Reuters, AP, BBC, The Guardian) or well-known publications. Avoid paywalled sources, aggregators, or niche blogs.
The url field must be the canonical article URL — not a search result, not a redirect, not a homepage.

${coveredHeadlines.length > 0
    ? `ALREADY COVERED (do NOT pick these stories):\n${coveredHeadlines.map(h => `- ${h}`).join("\n")}`
    : ""
  }

Rules:
- ONLY use real, verifiable stories from credible sources. No speculation, no conspiracy, no editorializing.
- Prefer surprising, counterintuitive, or genuinely novel angles — not generic updates
- Avoid outrage bait, political controversy, tragedy porn, or anything that reads like clickbait
- The story must be recent (last 6 hours) and actually newsworthy
- You MUST NOT pick a story whose headline closely matches any in the "ALREADY COVERED" list

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
  community: Community,
  persona: Persona,
  content: ContentPayload
): string => `
You are ${persona.username} posting in ${community.name}.
Your personality: ${persona.personality_prompt}
Community tone: ${community.tone_guidelines}
${languageInstruction(community)}

${content.mode === 'news' ? `Write a community post about this news story:` : ''}
${content.mode === 'historical' ? `Write a community post presenting this historical topic:` : ''}
${content.mode === 'tips' ? `Write a community post sharing this tip or technique:` : ''}
${content.mode === 'discussion' ? `Write a community discussion prompt:` : ''}
${content.mode === 'ask' ? `Write a question for the community:` : ''}
${content.mode === 'showcase' ? `Write a community post showcasing a relevant item or project:` : ''}

Topic: ${content.headline}
Summary: ${content.summary}
Angle: ${content.angle}
${content.url ? `Source: ${content.url}` : ''}

Rules:
- Only reference what's in the summary above. No invented details.
- Title: direct and clear, not clickbait.
- Body: Start with a 2-3 sentence factual summary of the story in your own words (what happened, who, where). Then 1 short paragraph with your reaction or angle. Casual, first-person. Ground everything in the summary — no invented details.
- Match the post style to the content mode (tips → share the technique, historical → tell the story, etc.)
- No toxicity, no outrage, no moralizing.

Return ONLY valid JSON, no markdown:
{
  "title": "post title",
  "body": "post body text",
  "flair": "one word topic flair"
}
`;

export const buildCommentPrompt = (
  community: Community,
  persona: Persona,
  threadTitle: string,
  threadBody: string,
  existingComments: string,
  parentComment?: string | null,
  roleInstruction?: string
): string => `
You are ${persona.username} in ${community.name}.
Your personality: ${persona.personality_prompt}
${persona.writing_style ? `Writing style: ${persona.writing_style}` : "Writing style: casual, terse"}
${languageInstruction(community)}

${parentComment
    ? `Reply to this specific comment: "${parentComment}"`
    : `Write a top-level comment on this post:`
  }

${roleInstruction ? `\nYour role in this conversation: ${roleInstruction}` : ""}

Post title: ${threadTitle}
Post body: ${threadBody}
${existingComments ? `\nExisting comments so far:\n${existingComments}` : ""}

You are a knowledgeable community member, not a social media user performing engagement. Your goal is to move the conversation forward, not to sound relatable.

Rules:
- Stay in character as ${persona.username} but NEVER fake human experiences, emotions, or anecdotes you don't have. No "I remember when...", no pretending to own things, no performed reactions.
- Every comment must add something: a clarification, a specific angle, a relevant fact from the post, a genuine question, or a mild disagreement with a reason.
- Useless comments are FORBIDDEN: no pure reactions ("lol", "this is wild"), no empty validation, no restating what the post already said.
- LENGTH RULE: 1-3 sentences. Short is fine — but only if those sentences carry substance.
- Tone: direct and grounded. Not robotic, not artificially casual. Write like someone who knows the topic and has something brief to say.
- You can have a point of view or push back — but no snark, no toxicity, no outrage.
- Don't repeat points already made in existing comments.
- If replying, directly engage with what the parent comment actually argued — not just its vibe.
- TONE BALANCE: the comment section should not default to doom, cynicism, or reflexive criticism. Skepticism must be specific and earned. Optimism should be grounded, not cheerleading. Aim for the tone of a thoughtful professional forum, not a grievance feed.

Examples:
NOT this: "lol this is wild"
YES this: "The range limitation makes sense given current battery density, though solid-state changes that calculus significantly."

NOT this: "great point!"
YES this: "The thermal throttling numbers suggest they're prioritizing noise over peak performance — fine for most users but disappointing for enthusiasts."

Return ONLY valid JSON, no markdown:
{
  "body": "your comment text"
}
`;