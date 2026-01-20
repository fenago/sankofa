-- Assessments table for formal testing
-- Supports diagnostic, formative, and summative assessment types

CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Assessment configuration
  type TEXT NOT NULL CHECK (type IN ('diagnostic', 'formative', 'summative')),
  title TEXT,
  description TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'abandoned')),

  -- Question configuration
  skill_ids JSONB DEFAULT '[]'::jsonb,
  question_ids JSONB DEFAULT '[]'::jsonb,
  question_count INTEGER,

  -- Timing
  time_limit_ms INTEGER, -- NULL = no time limit
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Answers and results
  answers JSONB DEFAULT '{}'::jsonb,
  score FLOAT,
  max_score FLOAT,

  -- Detailed results per skill
  skill_results JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_assessments_notebook_id ON assessments(notebook_id);
CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessments_type ON assessments(type);
CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments(created_at DESC);

-- Row Level Security
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- Users can only see their own assessments
CREATE POLICY "Users can view own assessments"
  ON assessments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own assessments
CREATE POLICY "Users can create own assessments"
  ON assessments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own assessments
CREATE POLICY "Users can update own assessments"
  ON assessments
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own assessments
CREATE POLICY "Users can delete own assessments"
  ON assessments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_assessments_updated_at
  BEFORE UPDATE ON assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_assessments_updated_at();

-- Assessment questions cache table
-- Stores generated questions for reuse within assessments
CREATE TABLE IF NOT EXISTS assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,

  -- Question data
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'free_response', 'true_false', 'fill_blank')),
  question TEXT NOT NULL,
  options JSONB, -- For multiple choice
  correct_answer TEXT NOT NULL,
  explanation TEXT,

  -- Difficulty and categorization
  difficulty FLOAT DEFAULT 0.5,
  bloom_level INTEGER DEFAULT 1,

  -- Ordering
  position INTEGER NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assessment_questions_assessment_id ON assessment_questions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_skill_id ON assessment_questions(skill_id);

-- RLS for assessment questions
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;

-- Users can view questions for their assessments
CREATE POLICY "Users can view questions for own assessments"
  ON assessment_questions
  FOR SELECT
  USING (
    assessment_id IN (
      SELECT id FROM assessments WHERE user_id = auth.uid()
    )
  );

-- Users can insert questions for their assessments
CREATE POLICY "Users can create questions for own assessments"
  ON assessment_questions
  FOR INSERT
  WITH CHECK (
    assessment_id IN (
      SELECT id FROM assessments WHERE user_id = auth.uid()
    )
  );
