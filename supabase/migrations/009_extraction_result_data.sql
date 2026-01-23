-- Add result_data column to store extracted graph data
-- This allows the edge function to store results in Supabase
-- and the Next.js app syncs to Neo4J (since AuraDB Free doesn't support HTTP API)

ALTER TABLE extraction_jobs
ADD COLUMN IF NOT EXISTS result_data JSONB;

-- Index for finding jobs with pending sync
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_pending_sync
ON extraction_jobs(status, result_data)
WHERE status = 'completed' AND result_data IS NOT NULL;

COMMENT ON COLUMN extraction_jobs.result_data IS 'Extracted graph data (skills, prerequisites, entities) pending sync to Neo4J';
