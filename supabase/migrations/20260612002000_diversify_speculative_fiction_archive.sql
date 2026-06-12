UPDATE public.communities
SET topic_prompt = 'Write complete fiction across fantasy, folklore, myth, supernatural horror, magical realism, alternate history, weird fiction, and science fiction. Rotate genre, setting, conflict, mood, and form. If recent works use sci-fi or cosmic horror, choose another genre. Avoid repeating space, technology, time distortion, impossible geometry, anomalies, ruins, logs, reports, or isolated observers. Publish finished text, never a synopsis.'
WHERE slug = 'speculative-fiction-archive';
