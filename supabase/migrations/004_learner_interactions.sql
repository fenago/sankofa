-- Migration: Learner Interaction Capture Infrastructure
-- Purpose: Store all learner interactions for Inverse Profiling and BKT validation
-- Phase 1 of Inverse Profiling Implementation

-- ============================================================================
-- LEARNER INTERACTIONS TABLE
-- Stores ALL learner events for pattern analysis and profile inference
-- ============================================================================

CREATE TABLE learner_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id TEXT,                        -- Can be null for non-skill events

  -- Event classification
  event_type TEXT NOT NULL,
  session_id UUID NOT NULL,

  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_duration_ms INTEGER,          -- Time since session start
  time_since_last_ms INTEGER,           -- Time since last interaction

  -- Payload (JSONB for flexibility by event type)
  payload JSONB NOT NULL DEFAULT '{}',

  -- Context (JSONB for session/device context)
  context JSONB NOT NULL DEFAULT '{}',

  -- Validate event types
  CONSTRAINT valid_event_type CHECK (event_type IN (
    -- Practice Events
    'practice_attempt',
    'practice_skipped',
    'hint_requested',
    'hint_viewed',
    'solution_revealed',

    -- Navigation Events
    'skill_viewed',
    'skill_selected',
    'path_changed',

    -- Content Events
    'artifact_generated',
    'artifact_viewed',
    'source_accessed',
    'chat_message',

    -- Assessment Events
    'assessment_started',
    'assessment_completed',
    'confidence_rated',

    -- Session Events
    'session_started',
    'session_ended',
    'session_paused',
    'session_resumed'
  ))
);

-- Indexes for common query patterns
CREATE INDEX idx_interactions_notebook ON learner_interactions(notebook_id);
CREATE INDEX idx_interactions_learner ON learner_interactions(learner_id);
CREATE INDEX idx_interactions_skill ON learner_interactions(skill_id) WHERE skill_id IS NOT NULL;
CREATE INDEX idx_interactions_session ON learner_interactions(session_id);
CREATE INDEX idx_interactions_type ON learner_interactions(event_type);
CREATE INDEX idx_interactions_created ON learner_interactions(created_at DESC);

-- Composite indexes for analytics queries
CREATE INDEX idx_interactions_learner_notebook ON learner_interactions(learner_id, notebook_id);
CREATE INDEX idx_interactions_learner_time ON learner_interactions(learner_id, created_at DESC);
CREATE INDEX idx_interactions_notebook_type ON learner_interactions(notebook_id, event_type);

-- Partial index for practice attempts (most queried event type)
CREATE INDEX idx_interactions_practice ON learner_interactions(notebook_id, learner_id, created_at)
  WHERE event_type = 'practice_attempt';


-- ============================================================================
-- LEARNER SESSIONS TABLE
-- Aggregated session-level data for engagement analysis
-- ============================================================================

CREATE TABLE learner_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Session summary (computed on session end)
  total_interactions INTEGER DEFAULT 0,
  practice_attempts INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,
  hints_requested INTEGER DEFAULT 0,
  skills_practiced TEXT[] DEFAULT '{}',

  -- State snapshot at end of session
  ending_mastery_snapshot JSONB,        -- {skillId: pMastery} at session end

  -- Device context
  device_type TEXT,                     -- 'mobile' | 'tablet' | 'desktop'
  user_agent TEXT,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'abandoned'))
);

-- Indexes for session queries
CREATE INDEX idx_sessions_learner ON learner_sessions(learner_id, started_at DESC);
CREATE INDEX idx_sessions_notebook ON learner_sessions(notebook_id, started_at DESC);
CREATE INDEX idx_sessions_active ON learner_sessions(learner_id, notebook_id)
  WHERE status = 'active';


-- ============================================================================
-- INVERSE PROFILES TABLE
-- Computed learner profiles inferred from interaction patterns
-- ============================================================================

CREATE TABLE inverse_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,

  -- Profile versioning
  version INTEGER NOT NULL DEFAULT 1,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  interactions_analyzed INTEGER DEFAULT 0,

  -- DIMENSION 1: Knowledge State (strongest predictor of learning)
  knowledge_state JSONB NOT NULL DEFAULT '{
    "averageMastery": 0,
    "skillsMastered": 0,
    "skillsInProgress": 0,
    "skillsNotStarted": 0,
    "knowledgeGaps": [],
    "misconceptions": [],
    "currentZPD": []
  }',

  -- DIMENSION 2: Cognitive Indicators
  cognitive_indicators JSONB NOT NULL DEFAULT '{
    "workingMemoryIndicator": "unknown",
    "expertiseLevel": "novice",
    "cognitiveLoadThreshold": null,
    "optimalComplexityLevel": null,
    "averageResponseTimeMs": null
  }',

  -- DIMENSION 3: Metacognitive Indicators
  metacognitive_indicators JSONB NOT NULL DEFAULT '{
    "calibrationAccuracy": null,
    "helpSeekingPattern": "unknown",
    "selfMonitoringAccuracy": null,
    "overconfidenceRate": null,
    "underconfidenceRate": null
  }',

  -- DIMENSION 4: Motivational Indicators
  motivational_indicators JSONB NOT NULL DEFAULT '{
    "sessionFrequency": null,
    "averageSessionDuration": null,
    "voluntaryReturnRate": null,
    "persistenceScore": null,
    "goalOrientation": "unknown"
  }',

  -- DIMENSION 5: Behavioral Patterns
  behavioral_patterns JSONB NOT NULL DEFAULT '{
    "preferredTimeOfDay": null,
    "mostActiveDay": null,
    "averageResponseTime": null,
    "hintUsageRate": null,
    "errorPatterns": [],
    "learningVelocity": null
  }',

  -- Confidence scores for each dimension (0-1 based on evidence quantity)
  confidence_scores JSONB NOT NULL DEFAULT '{
    "knowledge": 0,
    "cognitive": 0,
    "metacognitive": 0,
    "motivational": 0,
    "behavioral": 0
  }',

  -- Unique constraint: one profile per learner per notebook
  UNIQUE(learner_id, notebook_id)
);

-- Indexes for profile queries
CREATE INDEX idx_profiles_learner ON inverse_profiles(learner_id);
CREATE INDEX idx_profiles_notebook ON inverse_profiles(notebook_id);
CREATE INDEX idx_profiles_computed ON inverse_profiles(computed_at DESC);


-- ============================================================================
-- ROW LEVEL SECURITY
-- Users can only access their own learner data
-- ============================================================================

ALTER TABLE learner_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inverse_profiles ENABLE ROW LEVEL SECURITY;

-- Interactions: users can view and insert their own
CREATE POLICY "Users can view own interactions"
  ON learner_interactions FOR SELECT
  USING (learner_id = auth.uid());

CREATE POLICY "Users can insert own interactions"
  ON learner_interactions FOR INSERT
  WITH CHECK (learner_id = auth.uid());

-- Sessions: users can manage their own
CREATE POLICY "Users can view own sessions"
  ON learner_sessions FOR SELECT
  USING (learner_id = auth.uid());

CREATE POLICY "Users can insert own sessions"
  ON learner_sessions FOR INSERT
  WITH CHECK (learner_id = auth.uid());

CREATE POLICY "Users can update own sessions"
  ON learner_sessions FOR UPDATE
  USING (learner_id = auth.uid());

-- Profiles: users can view their own (computed by system)
CREATE POLICY "Users can view own profiles"
  ON inverse_profiles FOR SELECT
  USING (learner_id = auth.uid());

-- Allow service role to manage profiles (for background computation)
CREATE POLICY "Service role can manage profiles"
  ON inverse_profiles FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');


-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get active session for a learner in a notebook
CREATE OR REPLACE FUNCTION get_active_session(
  p_learner_id UUID,
  p_notebook_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  SELECT id INTO v_session_id
  FROM learner_sessions
  WHERE learner_id = p_learner_id
    AND notebook_id = p_notebook_id
    AND status = 'active'
  ORDER BY started_at DESC
  LIMIT 1;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get interaction counts by type for a learner
CREATE OR REPLACE FUNCTION get_interaction_summary(
  p_learner_id UUID,
  p_notebook_id UUID,
  p_since TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  event_type TEXT,
  event_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    li.event_type,
    COUNT(*)::BIGINT as event_count
  FROM learner_interactions li
  WHERE li.learner_id = p_learner_id
    AND li.notebook_id = p_notebook_id
    AND (p_since IS NULL OR li.created_at >= p_since)
  GROUP BY li.event_type
  ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate practice statistics
CREATE OR REPLACE FUNCTION get_practice_stats(
  p_learner_id UUID,
  p_notebook_id UUID,
  p_skill_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_attempts BIGINT,
  correct_attempts BIGINT,
  accuracy NUMERIC,
  avg_response_time_ms NUMERIC,
  hints_used BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_attempts,
    COUNT(*) FILTER (WHERE (payload->>'isCorrect')::boolean = true)::BIGINT as correct_attempts,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND(COUNT(*) FILTER (WHERE (payload->>'isCorrect')::boolean = true)::NUMERIC / COUNT(*)::NUMERIC, 3)
      ELSE 0
    END as accuracy,
    ROUND(AVG((payload->>'responseTimeMs')::NUMERIC), 0) as avg_response_time_ms,
    SUM(COALESCE((payload->>'hintUsedCount')::INTEGER, 0))::BIGINT as hints_used
  FROM learner_interactions
  WHERE learner_id = p_learner_id
    AND notebook_id = p_notebook_id
    AND event_type = 'practice_attempt'
    AND (p_skill_id IS NULL OR skill_id = p_skill_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE learner_interactions IS 'Stores all learner interaction events for Inverse Profiling and analytics';
COMMENT ON TABLE learner_sessions IS 'Aggregated session data for engagement analysis';
COMMENT ON TABLE inverse_profiles IS 'Computed learner profiles inferred from interaction patterns';

COMMENT ON COLUMN learner_interactions.payload IS 'Event-specific data (varies by event_type)';
COMMENT ON COLUMN learner_interactions.context IS 'Contextual information (time of day, session duration, device)';
COMMENT ON COLUMN inverse_profiles.confidence_scores IS 'Confidence in profile estimates (0-1) based on evidence quantity';
