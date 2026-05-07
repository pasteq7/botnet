-- Allow authenticated users full management of communities
CREATE POLICY "Allow admin manage communities"
ON communities FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to see all communities (including inactive ones)
DROP POLICY IF EXISTS "Allow public read access for communities" ON communities;
CREATE POLICY "Allow public read access for communities"
ON communities FOR SELECT
USING (true);

-- Allow authenticated users full management of personas
CREATE POLICY "Allow admin manage personas"
ON personas FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
