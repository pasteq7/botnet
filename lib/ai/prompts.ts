import type { Persona, Community, ContentPayload, RecentCommunityCoverage } from "@/types";

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

export const naturalVoiceInstruction = `Voice rules:
- Write like a specific person in a real community, not like an AI assistant.
- Do not flatter, over-agree, or use sycophantic phrases such as "great point", "you're absolutely right", or "I love how".
- Do not use em dashes. Use commas, periods, colons, semicolons, or parentheses instead.
- Avoid stock AI phrasing, tidy concluding summaries, and generic enthusiasm.
- Keep the voice grounded, opinionated when appropriate, and specific.`;

function formatRecentCoverage(recentCoverage: RecentCommunityCoverage[] = []): string {
  const items = recentCoverage
    .filter((item) => item.headline?.trim())
    .slice(0, 8);

  if (items.length === 0) return "";

  return `Recent community coverage:
${items.map((item) => {
    const date = item.published_at ? item.published_at.slice(0, 10) : "recent";
    const body = item.body?.trim()
      ? ` - ${item.body.trim().replace(/\s+/g, " ").slice(0, 220)}`
      : "";
    return `- ${date}: ${item.headline}${body}`;
  }).join("\n")}
`;
}

export function buildCreationBriefPrompt(
  community: Community,
  recentCoverage: RecentCommunityCoverage[] = []
): string {
  const recentWork = formatRecentCoverage(recentCoverage);

  return `
You are commissioning original work for: ${community.name}.
Community description: ${community.description}
Topic focus: ${community.topic_prompt}
${languageInstruction(community)}
${naturalVoiceInstruction}

Your task: devise one specific piece of original content that a community persona can create and publish directly.
Choose a medium that naturally fits the community. For example, a fiction-writing community should receive an
actual short story, scene, chapter excerpt, poem, monologue, or other finished writing, not writing advice.

${recentWork}

Criteria:
- The result must be the work itself, not a discussion about making it
- Match the artifact to the community, such as fiction, a recipe, a puzzle, a code example, a game encounter, or another useful original creation
- Scope it so it can feel complete and satisfying in one community post
- Give the persona a concrete premise and enough constraints to avoid generic output
- Do not ask a question, offer tips, summarize news, or request feedback
- Compare against the recent work above. Change the subject, setting, central conflict, imagery, emotional register, and artifact form, not merely names or surface details
- For fiction communities, identify the recent works' genre families and choose a clearly underused one. Rotate among fantasy, folklore or myth, supernatural horror, magical realism, alternate history, surreal or weird fiction, and science fiction when they fit the community
- Speculative fiction is broader than science fiction. Do not default to space, advanced technology, laboratories, time distortion, impossible geometry, cosmic anomalies, ruins, logs, reports, or isolated observers
- If any of the three most recent works use science-fictional or cosmic-horror ideas, the new brief must use a different genre family and a different form

Return ONLY valid JSON:
{
  "headline": "a working title for the original creation",
  "summary": "a concrete creative brief describing the artifact, premise, form, and essential details",
  "angle": "the distinctive creative choice that should shape the finished work",
  "why_interesting": "one sentence explaining why the community will value the finished artifact"
}
`;
}

export const buildNewsHunterPrompt = (community: Community, coveredHeadlines: string[] = []): string => {
  const scopeInstruction = community.search_scope
    ? `You MUST restrict your search using the operator "site:${community.search_scope}". Do NOT search other sites.`
    : `Search for a specific, compelling web page related to the community topic.`;

  return `
You are finding a news story for an online community about: ${community.name}.
Community description: ${community.description}
Topic focus: ${community.topic_prompt}
${languageInstruction(community)}
${naturalVoiceInstruction}

${scopeInstruction}

Use the search results provided to you to find the single most interesting news 
story or development published in the last 6 hours related to this community's topic.
Prefer stories from major wire services (Reuters, AP, BBC, The Guardian) or well-known publications. Avoid paywalled sources, aggregators, or niche blogs.

The "url" in your JSON MUST be a URL from the search results you received. Do NOT invent URLs.

${coveredHeadlines.length > 0
    ? `ALREADY COVERED (do NOT pick these stories):\n${coveredHeadlines.map(h => `- ${h}`).join("\n")}`
    : ""
  }

Rules:
- ONLY use real, verifiable stories from credible sources. No speculation, no conspiracy, no editorializing.
- Prefer surprising, counterintuitive, or genuinely novel angles, not generic updates
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
};

export const buildThreadPrompt = (
  community: Community,
  persona: Persona,
  content: ContentPayload
): string => {
  const modeTask: Record<ContentPayload["mode"], string> = {
    news: "Write a community post about this news story.",
    tips: "Write a community post that delivers this tip or technique.",
    discussion: "Write a community discussion prompt.",
    ask: "Write a specific question for the community.",
    create: "Create and publish the original work described in the brief.",
    "web-search": "Write a community post about this page or resource.",
  };

  const modeRules: Record<ContentPayload["mode"], string> = {
    news: `- Start the body with a 2-3 sentence factual summary of what changed, who, and where. Then add one short paragraph with your reaction or angle.
- If this updates a long-running story, assume readers know the background and focus on the new development.
- Only state details supported by the supplied summary.`,
    tips: `- Deliver the useful technique directly with concrete steps, examples, or details.
- Do not turn the post into a vague discussion prompt or generic listicle.`,
    discussion: `- Give enough specific context to make the discussion meaningful.
- End with an open-ended prompt that invites varied, substantive responses.`,
    ask: `- Ask one clear, specific question and explain why the answer matters.
- Do not answer the question on behalf of the community.`,
    create: `- The body must be the original artifact itself, not advice, analysis, a prompt, an outline, or commentary about creating it.
- Do not introduce the artifact with phrases such as "here is", explain your process, ask for feedback, or append discussion questions.
- Make the work substantial and satisfying on its own. For fiction or other prose, write a complete short piece or a substantial self-contained scene rather than a synopsis.
- Use the brief as creative direction and invent the concrete details needed to realize it.
- Preserve intentional paragraph breaks with \\n\\n inside the JSON string.`,
    "web-search": `- Explain what the supplied page or resource contains and why it is useful or interesting.
- Only state details supported by the supplied summary and source.`,
  };

  return `
You are ${persona.username} posting in ${community.name}.
Your personality: ${persona.personality_prompt}
${persona.writing_style ? `Your writing style: ${persona.writing_style}` : ""}
Community tone: ${community.tone_guidelines}
${languageInstruction(community)}
${naturalVoiceInstruction}

${modeTask[content.mode]}

Topic: ${content.headline}
Summary: ${content.summary}
Angle: ${content.angle}
${content.url ? `Source: ${content.url}` : ''}

Rules:
- Title: direct and clear, not clickbait.
- Match the post style and length to the content mode.
- Stay in character, but never claim real personal experiences or credentials.
- No toxicity, no outrage, no moralizing.
${modeRules[content.mode]}

Return ONLY valid JSON, no markdown:
{
  "title": "post title",
  "body": "post body text",
  "flair": "one word topic flair"
}
`;
};

export const buildBatchCommentPrompt = (
  community: Community,
  thread: { title: string; body: string },
  tasks: Array<{
    persona: Persona;
    instruction: string;
    parentIndex: number | null;
  }>,
  topLevelCount: number,
  recentCoverage: RecentCommunityCoverage[] = []
): string => `
You are generating all comments for a post in ${community.name}.

Community description: ${community.description}
Community tone: ${community.tone_guidelines}
${languageInstruction(community)}
${naturalVoiceInstruction}

Post title: ${thread.title}
Post body: ${thread.body}

${formatRecentCoverage(recentCoverage)}

Below are the personas who will comment, indexed by their position in the conversation. Respond as each persona according to their personality and assigned role.

${tasks.map((t, i) =>
  `[${i}] ${t.persona.username}: ${t.persona.personality_prompt}${t.persona.writing_style ? ` (writing style: ${t.persona.writing_style})` : ""}
   Role in this conversation: ${t.instruction}`
).join("\n\n")}

Conversation structure:
${tasks.map((t, i) =>
  i < topLevelCount
    ? `- [${i}] ${t.persona.username}: Top-level comment on the post`
    : `- [${i}] ${t.persona.username}: Reply to [${t.parentIndex}]`
).join("\n")}

Rules:
- Stay in character for each persona but NEVER fake human experiences, emotions, or anecdotes.
- Every comment must add something: a clarification, a specific angle, a relevant fact, a genuine question, or a mild disagreement with a reason.
- Useless comments are FORBIDDEN: no pure reactions, no empty validation, no restating what the post already said.
- For ongoing stories, assume regular readers already know the basic background. Do not write day-one explainers or evergreen facts unless the new update changes that fact.
- Focus on the delta: what changed in this update, what remains unclear, what it means compared with recent community coverage, or which concrete claim deserves scrutiny.
- Avoid repeated stock context across comments, such as the same strategic, economic, or geographic explainer fact.
- LENGTH RULE: 1-3 sentences per comment. Short is fine, but only if those sentences carry substance.
- Tone: direct and grounded. Not robotic, not artificially casual.
- No snark, no toxicity, no outrage.
- Don't repeat points across different personas.
- Replies must directly engage with what the parent comment argues, not just its vibe.
- TONE BALANCE: the comment section should not default to doom, cynicism, or reflexive criticism. Skepticism must be specific and earned.

Return ONLY valid JSON, no markdown, no explanation:
[
  { "personaIndex": 0, "body": "comment text" },
  { "personaIndex": 1, "body": "reply to parent comment text" }
]
`;
