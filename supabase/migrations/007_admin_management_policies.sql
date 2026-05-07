-- Allow authenticated users full management of subreddits
CREATE POLICY "Allow admin manage subreddits"
ON subreddits FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to see all subreddits (including inactive ones)
DROP POLICY IF EXISTS "Allow public read access for subreddits" ON subreddits;
CREATE POLICY "Allow public read access for subreddits"
ON subreddits FOR SELECT
USING (true);

-- Allow authenticated users full management of personas
CREATE POLICY "Allow admin manage personas"
ON personas FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
