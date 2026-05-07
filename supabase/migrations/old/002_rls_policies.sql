-- Enable RLS on all tables
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Allow public read access to communities
DROP POLICY IF EXISTS "Allow public read access for communities" ON communities;
CREATE POLICY "Allow public read access for communities"
ON communities FOR SELECT
USING (is_active = true);

-- Allow public read access to personas
DROP POLICY IF EXISTS "Allow public read access for personas" ON personas;
CREATE POLICY "Allow public read access for personas"
ON personas FOR SELECT
USING (true);

-- Allow public read access to published threads
DROP POLICY IF EXISTS "Allow public read access for threads" ON threads;
CREATE POLICY "Allow public read access for threads"
ON threads FOR SELECT
USING (is_published = true);

-- Allow public read access to comments
DROP POLICY IF EXISTS "Allow public read access for comments" ON comments;
CREATE POLICY "Allow public read access for comments"
ON comments FOR SELECT
USING (true);

