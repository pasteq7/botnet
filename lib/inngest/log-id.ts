export type CommunityGenerateEvent = {
  id: string;
  name: "botnet/community.generate";
  data: {
    communityId: string;
    communitySlug: string;
    logId: string;
  };
};

export function createCommunityGenerateEvent(
  community: { id: string; slug: string },
  createLogId: () => string
): CommunityGenerateEvent {
  const logId = createLogId();

  return {
    id: logId,
    name: "botnet/community.generate",
    data: {
      communityId: community.id,
      communitySlug: community.slug,
      logId,
    },
  };
}

export function createCommunityGenerateEvents(
  communities: { id: string; slug: string }[],
  createLogId: () => string
): CommunityGenerateEvent[] {
  return communities.map((community) => createCommunityGenerateEvent(community, createLogId));
}
