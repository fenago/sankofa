-- Track async graph extraction jobs
CREATE TABLE IF NOT EXISTS extraction_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  skill_count INTEGER,
  prerequisite_count INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Index for looking up jobs by source
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_source ON extraction_jobs(source_id);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_notebook ON extraction_jobs(notebook_id);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_status ON extraction_jobs(status);

-- Only keep the most recent job per source (cleanup old ones)
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_source_created ON extraction_jobs(source_id, created_at DESC);

-- Enable RLS
ALTER TABLE extraction_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own extraction jobs
CREATE POLICY "Users can view own extraction jobs"
  ON extraction_jobs FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update (API routes use admin client)
CREATE POLICY "Service role can manage extraction jobs"
  ON extraction_jobs FOR ALL
  USING (auth.role() = 'service_role');

-- Function to update updated_at on changes
CREATE OR REPLACE FUNCTION update_extraction_job_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER extraction_jobs_updated_at
  BEFORE UPDATE ON extraction_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_extraction_job_updated_at();
