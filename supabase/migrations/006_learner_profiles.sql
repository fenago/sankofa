-- Migration: Add inverse profiles table for Inverse Profiling
-- Phase 3: Store computed learner profiles with all 5 dimensions

-- Create inverse profiles table (matches existing type definitions)
CREATE TABLE IF NOT EXISTS public.inverse_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  interactions_analyzed INTEGER NOT NULL DEFAULT 0,

  -- Dimension 1: Knowledge State
  knowledge_state JSONB NOT NULL DEFAULT '{
    "averageMastery": 0,
    "skillsMastered": 0,
    "skillsInProgress": 0,
    "skillsNotStarted": 0,
    "knowledgeGaps": [],
    "misconceptions": [],
    "currentZPD": []
  }'::jsonb,

  -- Dimension 2: Cognitive Indicators
  cognitive_indicators JSONB NOT NULL DEFAULT '{
    "workingMemoryIndicator": "unknown",
    "expertiseLevel": "novice",
    "cognitiveLoadThreshold": null,
    "optimalComplexityLevel": null,
    "averageResponseTimeMs": null
  }'::jsonb,

  -- Dimension 3: Metacognitive Indicators
  metacognitive_indicators JSONB NOT NULL DEFAULT '{
    "calibrationAccuracy": null,
    "helpSeekingPattern": "unknown",
    "selfMonitoringAccuracy": null,
    "overconfidenceRate": null,
    "underconfidenceRate": null
  }'::jsonb,

  -- Dimension 4: Motivational Indicators
  motivational_indicators JSONB NOT NULL DEFAULT '{
    "sessionFrequency": null,
    "averageSessionDuration": null,
    "voluntaryReturnRate": null,
    "persistenceScore": null,
    "goalOrientation": "unknown"
  }'::jsonb,

  -- Dimension 5: Behavioral Patterns
  behavioral_patterns JSONB NOT NULL DEFAULT '{
    "preferredTimeOfDay": null,
    "mostActiveDay": null,
    "averageResponseTime": null,
    "hintUsageRate": null,
    "errorPatterns": [],
    "learningVelocity": null
  }'::jsonb,

  -- Confidence scores for each dimension
  confidence_scores JSONB NOT NULL DEFAULT '{
    "knowledge": 0.1,
    "cognitive": 0.1,
    "metacognitive": 0.1,
    "motivational": 0.1,
    "behavioral": 0.1
  }'::jsonb,

  -- Data quality assessment
  data_quality TEXT CHECK (data_quality IN ('insufficient', 'limited', 'adequate', 'good')) DEFAULT 'insufficient',

  -- Warnings/notes from computation
  warnings TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one profile per learner per notebook
  UNIQUE(notebook_id, learner_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inverse_profiles_notebook_id ON public.inverse_profiles(notebook_id);
CREATE INDEX IF NOT EXISTS idx_inverse_profiles_learner_id ON public.inverse_profiles(learner_id);
CREATE INDEX IF NOT EXISTS idx_inverse_profiles_computed_at ON public.inverse_profiles(computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_inverse_profiles_data_quality ON public.inverse_profiles(data_quality);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_inverse_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_inverse_profiles_updated_at
  BEFORE UPDATE ON public.inverse_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_inverse_profiles_updated_at();

-- Enable RLS
ALTER TABLE public.inverse_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own profiles
CREATE POLICY "Users can view own learner profiles"
  ON public.inverse_profiles
  FOR SELECT
  USING (learner_id = auth.uid());

-- Users can create their own profiles
CREATE POLICY "Users can create own learner profiles"
  ON public.inverse_profiles
  FOR INSERT
  WITH CHECK (learner_id = auth.uid());

-- Users can update their own profiles
CREATE POLICY "Users can update own learner profiles"
  ON public.inverse_profiles
  FOR UPDATE
  USING (learner_id = auth.uid());

-- Users can delete their own profiles
CREATE POLICY "Users can delete own learner profiles"
  ON public.inverse_profiles
  FOR DELETE
  USING (learner_id = auth.uid());

-- Notebook owners can view profiles of learners in their notebooks
CREATE POLICY "Notebook owners can view learner profiles"
  ON public.inverse_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = inverse_profiles.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON public.inverse_profiles TO authenticated;

-- Helper function to get or create profile
CREATE OR REPLACE FUNCTION get_or_create_learner_profile(
  p_notebook_id UUID,
  p_learner_id UUID
)
RETURNS public.inverse_profiles AS $$
DECLARE
  v_profile public.inverse_profiles;
BEGIN
  -- Try to get existing profile
  SELECT * INTO v_profile
  FROM public.inverse_profiles
  WHERE notebook_id = p_notebook_id AND learner_id = p_learner_id;

  -- If not found, create new one
  IF NOT FOUND THEN
    INSERT INTO public.inverse_profiles (notebook_id, learner_id)
    VALUES (p_notebook_id, p_learner_id)
    RETURNING * INTO v_profile;
  END IF;

  RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to count interactions since last profile update
CREATE OR REPLACE FUNCTION count_interactions_since_profile_update(
  p_notebook_id UUID,
  p_learner_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_last_computed TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  -- Get last computed time
  SELECT computed_at INTO v_last_computed
  FROM public.inverse_profiles
  WHERE notebook_id = p_notebook_id AND learner_id = p_learner_id;

  -- If no profile, count all interactions
  IF v_last_computed IS NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM public.learner_interactions
    WHERE notebook_id = p_notebook_id AND learner_id = p_learner_id;
  ELSE
    SELECT COUNT(*) INTO v_count
    FROM public.learner_interactions
    WHERE notebook_id = p_notebook_id
      AND learner_id = p_learner_id
      AND created_at > v_last_computed;
  END IF;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON TABLE public.inverse_profiles IS 'Stores computed inverse profiles for learners, updated periodically based on interaction data';
