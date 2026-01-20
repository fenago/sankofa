-- Add settings column to notebooks for per-notebook configuration
-- Including inverse profiling toggle and other learner tracking settings

-- Add settings JSONB column with default values
ALTER TABLE public.notebooks
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
  "inverse_profiling_enabled": true,
  "session_tracking_enabled": true,
  "interaction_logging_enabled": true,
  "bkt_parameters": {
    "use_skill_specific": false,
    "default_pL0": 0.3,
    "default_pT": 0.1,
    "default_pS": 0.1,
    "default_pG": 0.2
  }
}'::jsonb;

-- Create index for settings queries
CREATE INDEX IF NOT EXISTS idx_notebooks_settings
ON public.notebooks USING gin (settings);

-- Create a helper function to get specific setting with default fallback
CREATE OR REPLACE FUNCTION public.get_notebook_setting(
  p_notebook_id uuid,
  p_setting_path text[],
  p_default jsonb DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT settings #> p_setting_path INTO result
  FROM public.notebooks
  WHERE id = p_notebook_id;

  RETURN COALESCE(result, p_default);
END;
$$;

-- Create a function to update a specific setting
CREATE OR REPLACE FUNCTION public.update_notebook_setting(
  p_notebook_id uuid,
  p_setting_path text[],
  p_value jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  current_settings jsonb;
  updated_settings jsonb;
BEGIN
  -- Get current settings
  SELECT COALESCE(settings, '{}'::jsonb) INTO current_settings
  FROM public.notebooks
  WHERE id = p_notebook_id;

  -- Update the nested path
  updated_settings := jsonb_set(current_settings, p_setting_path, p_value, true);

  -- Update the notebook
  UPDATE public.notebooks
  SET settings = updated_settings
  WHERE id = p_notebook_id;

  RETURN updated_settings;
END;
$$;

-- Add comment explaining the settings structure
COMMENT ON COLUMN public.notebooks.settings IS 'Notebook-specific settings including:
- inverse_profiling_enabled: Whether to infer learner characteristics from behavior
- session_tracking_enabled: Whether to track learning sessions
- interaction_logging_enabled: Whether to log individual interactions
- bkt_parameters: Bayesian Knowledge Tracing configuration
  - use_skill_specific: Use per-skill fitted parameters vs defaults
  - default_pL0: Initial probability of knowing a skill
  - default_pT: Probability of learning from attempt
  - default_pS: Probability of slip (knows but fails)
  - default_pG: Probability of guess (doesnt know but succeeds)';
