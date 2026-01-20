# Inverse Profiling Implementation Plan

## Executive Summary

This plan outlines the infrastructure and implementation strategy for **Inverse Profiling** - a system that infers learner characteristics from natural interactions, eliminating friction from upfront diagnostic assessments while building increasingly accurate learner models over time.

### Current State
- **BKT (Bayesian Knowledge Tracing)**: ✅ Implemented in `lib/graph/learner-state.ts`
- **SM-2 Spaced Repetition**: ✅ Implemented
- **Scaffolding Levels**: ✅ Implemented (4 levels)
- **Neo4J Storage**: ✅ `LearnerSkillState` nodes with full mastery tracking
- **API Endpoints**: ✅ GET/POST/DELETE for learner state

### Critical Gap
**No historical event logging** - interactions are processed and discarded. Inverse Profiling requires analyzing patterns across ALL interactions to infer learner characteristics.

---

## Part 1: Interaction Capture Infrastructure

### 1.1 The Problem

Current flow:
```
User answers question → API updates mastery → State saved → Event discarded
```

Required flow:
```
User interaction → Event logged → Patterns analyzed → Inverse Profile updated → Mastery updated
```

### 1.2 Interaction Event Schema

Create a comprehensive event logging system that captures ALL learner interactions:

```typescript
// lib/types/interactions.ts

/**
 * Core interaction event - the atomic unit of learner behavior
 */
interface LearnerInteraction {
  // Identity
  id: string;                          // UUID
  notebookId: string;
  learnerId: string;                   // User ID
  skillId: string;                     // Related skill (if applicable)

  // Event Classification
  eventType: InteractionEventType;
  timestamp: number;                   // Unix timestamp (ms)
  sessionId: string;                   // Group interactions by session

  // Event Data (varies by type)
  payload: InteractionPayload;

  // Context
  context: InteractionContext;
}

type InteractionEventType =
  // Practice Events
  | 'practice_attempt'       // Answered a practice question
  | 'practice_skipped'       // Skipped without answering
  | 'hint_requested'         // Asked for a hint
  | 'hint_viewed'            // Viewed provided hint
  | 'solution_revealed'      // Gave up, saw solution

  // Navigation Events
  | 'skill_viewed'           // Viewed skill details
  | 'skill_selected'         // Selected skill to study
  | 'path_changed'           // Changed learning path

  // Content Events
  | 'artifact_generated'     // Generated visual artifact
  | 'artifact_viewed'        // Viewed existing artifact
  | 'source_accessed'        // Accessed source document
  | 'chat_message'           // Sent chat message

  // Assessment Events
  | 'assessment_started'     // Started formal assessment
  | 'assessment_completed'   // Completed assessment
  | 'confidence_rated'       // Self-rated confidence

  // Session Events
  | 'session_started'        // Started learning session
  | 'session_ended'          // Ended session (or timeout)
  | 'session_paused'         // Paused activity
  | 'session_resumed';       // Resumed after pause

/**
 * Payload varies by event type
 */
interface PracticeAttemptPayload {
  questionId?: string;
  questionDifficulty?: number;         // IRT difficulty if known
  isCorrect: boolean;
  responseTimeMs: number;
  expectedTimeMs?: number;
  selectedAnswer?: string;
  correctAnswer?: string;
  errorType?: ErrorType;               // Categorized error
  attemptNumber: number;               // Which attempt on this question
  hintUsedCount: number;               // How many hints used before answering
}

interface HintRequestPayload {
  hintLevel: number;                   // Which hint (1st, 2nd, 3rd...)
  hintContent?: string;                // The hint shown
  timeBeforeRequest: number;           // How long they tried before asking
}

interface ConfidencePayload {
  confidenceLevel: number;             // 1-5 or percentage
  actualOutcome?: boolean;             // Did they get it right?
  skillId: string;
}

interface ChatMessagePayload {
  messageId: string;
  messageType: 'user' | 'assistant';
  relatedSkillIds?: string[];          // Skills mentioned/relevant
  questionType?: 'clarification' | 'help' | 'explanation' | 'example';
}

type InteractionPayload =
  | PracticeAttemptPayload
  | HintRequestPayload
  | ConfidencePayload
  | ChatMessagePayload
  | Record<string, unknown>;           // Generic for other types

/**
 * Contextual information for every interaction
 */
interface InteractionContext {
  // Time context
  dayOfWeek: number;                   // 0-6
  hourOfDay: number;                   // 0-23
  sessionDurationMs: number;           // Time since session start
  timeSinceLastInteraction: number;    // Ms since last event

  // Learning context
  currentScaffoldLevel?: number;       // 1-4
  currentPMastery?: number;            // Before this interaction
  prerequisitesMastered?: number;      // Count
  recentSuccessRate?: number;          // Last 5 attempts

  // Device context (optional)
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  platform?: string;
}

/**
 * Error categorization for misconception detection
 */
type ErrorType =
  | 'computational'          // Math error (e.g., 2+2=5)
  | 'conceptual'             // Misunderstood concept
  | 'procedural'             // Wrong steps/order
  | 'careless'               // Knew it, made mistake
  | 'knowledge_gap'          // Missing prerequisite
  | 'misread'                // Misunderstood question
  | 'partial_understanding'  // Got part right
  | 'unknown';
```

### 1.3 Database Schema for Interactions

**Option A: Supabase (Recommended for analytics)**

```sql
-- supabase/migrations/XXX_learner_interactions.sql

-- Core interaction events table
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
  session_duration_ms INTEGER,
  time_since_last_interaction_ms INTEGER,

  -- Payload (JSONB for flexibility)
  payload JSONB NOT NULL DEFAULT '{}',

  -- Context
  context JSONB NOT NULL DEFAULT '{}',

  -- Indexes
  CONSTRAINT valid_event_type CHECK (event_type IN (
    'practice_attempt', 'practice_skipped', 'hint_requested', 'hint_viewed',
    'solution_revealed', 'skill_viewed', 'skill_selected', 'path_changed',
    'artifact_generated', 'artifact_viewed', 'source_accessed', 'chat_message',
    'assessment_started', 'assessment_completed', 'confidence_rated',
    'session_started', 'session_ended', 'session_paused', 'session_resumed'
  ))
);

-- Indexes for common queries
CREATE INDEX idx_interactions_notebook ON learner_interactions(notebook_id);
CREATE INDEX idx_interactions_learner ON learner_interactions(learner_id);
CREATE INDEX idx_interactions_skill ON learner_interactions(skill_id);
CREATE INDEX idx_interactions_session ON learner_interactions(session_id);
CREATE INDEX idx_interactions_type ON learner_interactions(event_type);
CREATE INDEX idx_interactions_created ON learner_interactions(created_at DESC);

-- Composite index for learner + time queries
CREATE INDEX idx_interactions_learner_time
  ON learner_interactions(learner_id, created_at DESC);

-- Sessions table for session-level aggregates
CREATE TABLE learner_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Session summary (computed on end)
  total_interactions INTEGER DEFAULT 0,
  practice_attempts INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,
  hints_requested INTEGER DEFAULT 0,
  skills_practiced TEXT[] DEFAULT '{}',

  -- State at end of session
  ending_mastery_snapshot JSONB,        -- {skillId: pMastery} at session end

  -- Context
  device_type TEXT,
  platform TEXT
);

CREATE INDEX idx_sessions_learner ON learner_sessions(learner_id, started_at DESC);
CREATE INDEX idx_sessions_notebook ON learner_sessions(notebook_id);

-- Inverse Profile table (computed from interactions)
CREATE TABLE inverse_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,

  -- Profile version (increment on update)
  version INTEGER NOT NULL DEFAULT 1,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- KNOWLEDGE STATE (strongest predictor)
  knowledge_state JSONB NOT NULL DEFAULT '{
    "averageMastery": 0,
    "skillsMastered": 0,
    "skillsInProgress": 0,
    "knowledgeGaps": [],
    "misconceptions": []
  }',

  -- COGNITIVE INDICATORS
  cognitive_indicators JSONB NOT NULL DEFAULT '{
    "workingMemoryIndicator": "unknown",
    "expertiseLevel": "novice",
    "cognitiveLoadThreshold": null,
    "optimalComplexityLevel": null
  }',

  -- METACOGNITIVE INDICATORS
  metacognitive_indicators JSONB NOT NULL DEFAULT '{
    "calibrationAccuracy": null,
    "helpSeekingPattern": "unknown",
    "selfMonitoringAccuracy": null,
    "confidenceVsPerformance": null
  }',

  -- MOTIVATIONAL INDICATORS
  motivational_indicators JSONB NOT NULL DEFAULT '{
    "engagement": null,
    "persistence": null,
    "goalOrientation": "unknown",
    "returnRate": null
  }',

  -- BEHAVIORAL PATTERNS
  behavioral_patterns JSONB NOT NULL DEFAULT '{
    "averageSessionDuration": null,
    "preferredTimeOfDay": null,
    "averageResponseTime": null,
    "hintUsageRate": null,
    "errorPatterns": []
  }',

  -- Confidence in profile estimates
  confidence_scores JSONB NOT NULL DEFAULT '{
    "knowledge": 0,
    "cognitive": 0,
    "metacognitive": 0,
    "motivational": 0,
    "behavioral": 0
  }',

  UNIQUE(learner_id, notebook_id)
);

CREATE INDEX idx_inverse_profiles_learner ON inverse_profiles(learner_id);
CREATE INDEX idx_inverse_profiles_notebook ON inverse_profiles(notebook_id);

-- Enable RLS
ALTER TABLE learner_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inverse_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see their own data)
CREATE POLICY "Users can view own interactions"
  ON learner_interactions FOR SELECT
  USING (learner_id = auth.uid());

CREATE POLICY "Users can insert own interactions"
  ON learner_interactions FOR INSERT
  WITH CHECK (learner_id = auth.uid());

CREATE POLICY "Users can view own sessions"
  ON learner_sessions FOR SELECT
  USING (learner_id = auth.uid());

CREATE POLICY "Users can manage own sessions"
  ON learner_sessions FOR ALL
  USING (learner_id = auth.uid());

CREATE POLICY "Users can view own profiles"
  ON inverse_profiles FOR SELECT
  USING (learner_id = auth.uid());
```

### 1.4 Interaction Capture API

```typescript
// app/api/notebooks/[id]/interactions/route.ts

import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { eventType, skillId, payload, context, sessionId } = body;

  // Validate event type
  const validEventTypes = [
    'practice_attempt', 'practice_skipped', 'hint_requested', 'hint_viewed',
    'solution_revealed', 'skill_viewed', 'skill_selected', 'path_changed',
    'artifact_generated', 'artifact_viewed', 'source_accessed', 'chat_message',
    'assessment_started', 'assessment_completed', 'confidence_rated',
    'session_started', 'session_ended', 'session_paused', 'session_resumed'
  ];

  if (!validEventTypes.includes(eventType)) {
    return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
  }

  // Insert interaction
  const { data, error } = await supabase
    .from('learner_interactions')
    .insert({
      notebook_id: params.id,
      learner_id: user.id,
      skill_id: skillId,
      event_type: eventType,
      session_id: sessionId,
      payload: payload || {},
      context: context || {},
    })
    .select()
    .single();

  if (error) {
    console.error('Error logging interaction:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If this is a practice_attempt, also update the learner state
  if (eventType === 'practice_attempt' && payload?.isCorrect !== undefined) {
    // Call existing learner state update
    const learnerResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/notebooks/${params.id}/learner`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillId,
          isCorrect: payload.isCorrect,
          responseTimeMs: payload.responseTimeMs,
        }),
      }
    );

    const learnerData = await learnerResponse.json();

    // Trigger async profile update (non-blocking)
    updateInverseProfileAsync(user.id, params.id).catch(console.error);

    return NextResponse.json({
      interaction: data,
      learnerState: learnerData,
    });
  }

  return NextResponse.json({ interaction: data });
}

// GET - Retrieve interaction history for analytics
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const eventType = searchParams.get('eventType');
  const skillId = searchParams.get('skillId');
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');
  const since = searchParams.get('since'); // ISO timestamp

  let query = supabase
    .from('learner_interactions')
    .select('*')
    .eq('notebook_id', params.id)
    .eq('learner_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (eventType) {
    query = query.eq('event_type', eventType);
  }
  if (skillId) {
    query = query.eq('skill_id', skillId);
  }
  if (since) {
    query = query.gte('created_at', since);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ interactions: data, total: count });
}
```

---

## Part 2: Inverse Profile Engine

### 2.1 Profile Dimensions

The Inverse Profile captures four key dimensions (from the whitepaper):

```typescript
// lib/inverse-profiling/types.ts

/**
 * Complete Inverse Profile for a learner
 * Inferred from interaction patterns, NOT self-reported
 */
interface InverseProfile {
  learnerId: string;
  notebookId: string;
  version: number;
  computedAt: number;

  // DIMENSION 1: Knowledge State (Strongest Predictor)
  knowledgeState: KnowledgeState;

  // DIMENSION 2: Cognitive Indicators
  cognitiveIndicators: CognitiveIndicators;

  // DIMENSION 3: Metacognitive Indicators
  metacognitiveIndicators: MetacognitiveIndicators;

  // DIMENSION 4: Motivational Indicators
  motivationalIndicators: MotivationalIndicators;

  // DIMENSION 5: Behavioral Patterns
  behavioralPatterns: BehavioralPatterns;

  // Confidence in each dimension (0-1)
  confidenceScores: {
    knowledge: number;
    cognitive: number;
    metacognitive: number;
    motivational: number;
    behavioral: number;
  };
}

/**
 * Knowledge State - Inferred from BKT + response patterns
 */
interface KnowledgeState {
  // Per-skill mastery (from BKT)
  skillMastery: Map<string, number>;   // skillId -> P(mastery)

  // Summary stats
  averageMastery: number;
  skillsMastered: number;
  skillsInProgress: number;

  // Gaps and misconceptions
  knowledgeGaps: KnowledgeGap[];       // Prerequisites with low mastery
  currentZPD: string[];                // Skill IDs in ZPD
  misconceptions: Misconception[];     // Detected systematic errors
}

interface KnowledgeGap {
  skillId: string;
  skillName: string;
  currentMastery: number;
  requiredBy: string[];                // Skills that need this prereq
  priority: 'critical' | 'recommended' | 'optional';
}

interface Misconception {
  skillId: string;
  errorType: string;
  frequency: number;                   // How often this error occurs
  examples: string[];                  // Example wrong answers
  suggestedIntervention: string;
}

/**
 * Cognitive Indicators - Inferred from response patterns
 */
interface CognitiveIndicators {
  // Working memory indicator (inferred from problem complexity tolerance)
  workingMemoryIndicator: 'low' | 'average' | 'high' | 'unknown';

  // Expertise level (affects scaffolding - novices need worked examples)
  expertiseLevel: 'novice' | 'intermediate' | 'advanced';

  // When to simplify content
  cognitiveLoadThreshold: number | null;

  // Optimal problem complexity
  optimalComplexityLevel: number | null;   // 1-10

  // Evidence
  evidence: {
    avgResponseTimeByDifficulty: Map<number, number>;
    successRateByComplexity: Map<number, number>;
    hintRequestRateByDifficulty: Map<number, number>;
  };
}

/**
 * Metacognitive Indicators - Inferred from confidence vs performance
 */
interface MetacognitiveIndicators {
  // Does stated confidence predict actual performance?
  calibrationAccuracy: number | null;      // Correlation coefficient

  // Help-seeking behavior
  helpSeekingPattern: 'avoidant' | 'appropriate' | 'dependent' | 'unknown';

  // Can they identify their own errors?
  selfMonitoringAccuracy: number | null;

  // Confidence vs performance (for calibration interventions)
  confidenceVsPerformance: {
    overconfident: number;               // % of times confident but wrong
    underconfident: number;              // % of times unsure but right
    calibrated: number;                  // % of times confidence matched outcome
  } | null;

  // Evidence
  evidence: {
    confidenceRatings: Array<{ confidence: number; wasCorrect: boolean }>;
    hintRequestTiming: number[];         // Ms before requesting hint
    selfCorrectionRate: number;          // % of times caught own error
  };
}

/**
 * Motivational Indicators - Inferred from engagement patterns
 */
interface MotivationalIndicators {
  // Engagement metrics
  engagement: {
    sessionFrequency: number;            // Sessions per week
    averageSessionDuration: number;      // Minutes
    voluntaryReturnRate: number;         // % of voluntary returns
  } | null;

  // Persistence after failure
  persistence: {
    attemptsBeforeGivingUp: number;      // Average attempts before skipping
    recoveryAfterFailure: number;        // % return after failed session
    challengeSeekingBehavior: number;    // Preference for harder problems
  } | null;

  // Goal orientation
  goalOrientation: 'mastery' | 'performance' | 'avoidance' | 'unknown';

  // Evidence
  evidence: {
    sessionDurations: number[];
    attemptsPerProblem: number[];
    skippedProblems: number;
    requestedHarderProblems: number;
  };
}

/**
 * Behavioral Patterns - Observable behaviors
 */
interface BehavioralPatterns {
  // Time patterns
  averageSessionDuration: number | null;
  preferredTimeOfDay: number | null;     // Hour (0-23)
  mostActiveDay: number | null;          // Day of week (0-6)

  // Response patterns
  averageResponseTime: number | null;    // Ms
  responseTimeVariance: number | null;

  // Hint usage
  hintUsageRate: number | null;          // Hints per problem

  // Error patterns (for misconception detection)
  errorPatterns: ErrorPattern[];

  // Learning velocity
  learningVelocity: number | null;       // Skills mastered per week
}

interface ErrorPattern {
  errorType: string;
  frequency: number;
  affectedSkills: string[];
  recentTrend: 'increasing' | 'decreasing' | 'stable';
}
```

### 2.2 Profile Inference Engine

```typescript
// lib/inverse-profiling/engine.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { InverseProfile, LearnerInteraction } from './types';

export class InverseProfileEngine {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Compute or update the inverse profile for a learner
   * Should be called after significant interactions (batched)
   */
  async computeProfile(
    learnerId: string,
    notebookId: string
  ): Promise<InverseProfile> {
    // Fetch all interactions for this learner/notebook
    const { data: interactions } = await this.supabase
      .from('learner_interactions')
      .select('*')
      .eq('learner_id', learnerId)
      .eq('notebook_id', notebookId)
      .order('created_at', { ascending: true });

    if (!interactions || interactions.length === 0) {
      return this.getDefaultProfile(learnerId, notebookId);
    }

    // Compute each dimension
    const knowledgeState = await this.inferKnowledgeState(learnerId, notebookId, interactions);
    const cognitiveIndicators = this.inferCognitiveIndicators(interactions);
    const metacognitiveIndicators = this.inferMetacognitiveIndicators(interactions);
    const motivationalIndicators = this.inferMotivationalIndicators(interactions);
    const behavioralPatterns = this.inferBehavioralPatterns(interactions);

    // Calculate confidence scores based on evidence quantity
    const confidenceScores = this.calculateConfidenceScores(interactions);

    const profile: InverseProfile = {
      learnerId,
      notebookId,
      version: 1,
      computedAt: Date.now(),
      knowledgeState,
      cognitiveIndicators,
      metacognitiveIndicators,
      motivationalIndicators,
      behavioralPatterns,
      confidenceScores,
    };

    // Persist to database
    await this.persistProfile(profile);

    return profile;
  }

  /**
   * Infer knowledge state from BKT data + interaction patterns
   */
  private async inferKnowledgeState(
    learnerId: string,
    notebookId: string,
    interactions: LearnerInteraction[]
  ): Promise<KnowledgeState> {
    // Get current BKT states from Neo4J via API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/notebooks/${notebookId}/learner?action=states`
    );
    const { states } = await response.json();

    // Build skill mastery map
    const skillMastery = new Map<string, number>();
    let totalMastery = 0;
    let masteredCount = 0;
    let inProgressCount = 0;

    for (const state of states) {
      skillMastery.set(state.skillId, state.pMastery);
      totalMastery += state.pMastery;
      if (state.masteryStatus === 'mastered') masteredCount++;
      if (state.masteryStatus === 'learning') inProgressCount++;
    }

    // Detect knowledge gaps (low mastery prerequisites)
    const knowledgeGaps = await this.detectKnowledgeGaps(notebookId, skillMastery);

    // Get current ZPD
    const zpdResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/notebooks/${notebookId}/learner?action=zpd`
    );
    const { zpdSkills } = await zpdResponse.json();
    const currentZPD = zpdSkills.map((s: { id: string }) => s.id);

    // Detect misconceptions from error patterns
    const misconceptions = this.detectMisconceptions(interactions);

    return {
      skillMastery,
      averageMastery: states.length > 0 ? totalMastery / states.length : 0,
      skillsMastered: masteredCount,
      skillsInProgress: inProgressCount,
      knowledgeGaps,
      currentZPD,
      misconceptions,
    };
  }

  /**
   * Infer cognitive indicators from response patterns
   */
  private inferCognitiveIndicators(
    interactions: LearnerInteraction[]
  ): CognitiveIndicators {
    const practiceAttempts = interactions.filter(
      i => i.event_type === 'practice_attempt'
    );

    if (practiceAttempts.length < 10) {
      return {
        workingMemoryIndicator: 'unknown',
        expertiseLevel: 'novice',
        cognitiveLoadThreshold: null,
        optimalComplexityLevel: null,
        evidence: {
          avgResponseTimeByDifficulty: new Map(),
          successRateByComplexity: new Map(),
          hintRequestRateByDifficulty: new Map(),
        },
      };
    }

    // Group by difficulty
    const byDifficulty = new Map<number, LearnerInteraction[]>();
    for (const attempt of practiceAttempts) {
      const difficulty = attempt.payload.questionDifficulty || 5; // Default medium
      if (!byDifficulty.has(difficulty)) {
        byDifficulty.set(difficulty, []);
      }
      byDifficulty.get(difficulty)!.push(attempt);
    }

    // Calculate success rates by difficulty
    const successRateByComplexity = new Map<number, number>();
    for (const [diff, attempts] of byDifficulty) {
      const correct = attempts.filter(a => a.payload.isCorrect).length;
      successRateByComplexity.set(diff, correct / attempts.length);
    }

    // Find optimal complexity (where success rate ~75%)
    let optimalComplexityLevel: number | null = null;
    for (const [diff, rate] of successRateByComplexity) {
      if (rate >= 0.70 && rate <= 0.85) {
        optimalComplexityLevel = diff;
        break;
      }
    }

    // Infer expertise level
    let expertiseLevel: 'novice' | 'intermediate' | 'advanced' = 'novice';
    const avgSuccessRate = practiceAttempts.filter(a => a.payload.isCorrect).length / practiceAttempts.length;
    const avgHintUsage = practiceAttempts.reduce((sum, a) => sum + (a.payload.hintUsedCount || 0), 0) / practiceAttempts.length;

    if (avgSuccessRate > 0.8 && avgHintUsage < 0.2) {
      expertiseLevel = 'advanced';
    } else if (avgSuccessRate > 0.6 && avgHintUsage < 0.5) {
      expertiseLevel = 'intermediate';
    }

    // Infer working memory from performance on complex problems
    const complexAttempts = practiceAttempts.filter(
      a => (a.payload.questionDifficulty || 5) >= 7
    );
    const complexSuccessRate = complexAttempts.length > 0
      ? complexAttempts.filter(a => a.payload.isCorrect).length / complexAttempts.length
      : null;

    let workingMemoryIndicator: 'low' | 'average' | 'high' | 'unknown' = 'unknown';
    if (complexSuccessRate !== null) {
      if (complexSuccessRate > 0.7) workingMemoryIndicator = 'high';
      else if (complexSuccessRate > 0.4) workingMemoryIndicator = 'average';
      else workingMemoryIndicator = 'low';
    }

    return {
      workingMemoryIndicator,
      expertiseLevel,
      cognitiveLoadThreshold: optimalComplexityLevel ? optimalComplexityLevel + 2 : null,
      optimalComplexityLevel,
      evidence: {
        avgResponseTimeByDifficulty: new Map(),
        successRateByComplexity,
        hintRequestRateByDifficulty: new Map(),
      },
    };
  }

  /**
   * Infer metacognitive indicators from confidence ratings
   */
  private inferMetacognitiveIndicators(
    interactions: LearnerInteraction[]
  ): MetacognitiveIndicators {
    const confidenceRatings = interactions.filter(
      i => i.event_type === 'confidence_rated'
    );

    const practiceAttempts = interactions.filter(
      i => i.event_type === 'practice_attempt'
    );

    const hintRequests = interactions.filter(
      i => i.event_type === 'hint_requested'
    );

    // Analyze help-seeking pattern
    const hintsPerProblem = practiceAttempts.length > 0
      ? hintRequests.length / practiceAttempts.length
      : 0;

    let helpSeekingPattern: 'avoidant' | 'appropriate' | 'dependent' | 'unknown' = 'unknown';
    if (practiceAttempts.length >= 10) {
      // Look at hint usage on problems they got wrong
      const wrongAttempts = practiceAttempts.filter(a => !a.payload.isCorrect);
      const wrongWithHints = wrongAttempts.filter(a => (a.payload.hintUsedCount || 0) > 0);
      const hintUseOnWrong = wrongAttempts.length > 0
        ? wrongWithHints.length / wrongAttempts.length
        : 0;

      if (hintUseOnWrong < 0.2 && hintsPerProblem < 0.1) {
        helpSeekingPattern = 'avoidant'; // Rarely asks for help even when wrong
      } else if (hintsPerProblem > 1.5) {
        helpSeekingPattern = 'dependent'; // Asks too often
      } else {
        helpSeekingPattern = 'appropriate';
      }
    }

    // Calculate calibration if we have confidence data
    let calibrationAccuracy: number | null = null;
    let confidenceVsPerformance = null;

    if (confidenceRatings.length >= 10) {
      // Match confidence ratings to outcomes
      const calibrationData = confidenceRatings.map(cr => ({
        confidence: cr.payload.confidenceLevel,
        wasCorrect: cr.payload.actualOutcome,
      })).filter(d => d.wasCorrect !== undefined);

      if (calibrationData.length >= 10) {
        // Calculate over/under confidence
        let overconfident = 0;
        let underconfident = 0;
        let calibrated = 0;

        for (const { confidence, wasCorrect } of calibrationData) {
          const confNorm = confidence / 5; // Normalize to 0-1
          if (confNorm > 0.6 && !wasCorrect) overconfident++;
          else if (confNorm < 0.4 && wasCorrect) underconfident++;
          else calibrated++;
        }

        const total = calibrationData.length;
        confidenceVsPerformance = {
          overconfident: overconfident / total,
          underconfident: underconfident / total,
          calibrated: calibrated / total,
        };

        // Simple calibration metric
        calibrationAccuracy = calibrated / total;
      }
    }

    return {
      calibrationAccuracy,
      helpSeekingPattern,
      selfMonitoringAccuracy: null, // Would need self-correction events to measure
      confidenceVsPerformance,
      evidence: {
        confidenceRatings: confidenceRatings.map(cr => ({
          confidence: cr.payload.confidenceLevel,
          wasCorrect: cr.payload.actualOutcome,
        })),
        hintRequestTiming: hintRequests.map(h => h.payload.timeBeforeRequest || 0),
        selfCorrectionRate: 0,
      },
    };
  }

  /**
   * Infer motivational indicators from engagement patterns
   */
  private inferMotivationalIndicators(
    interactions: LearnerInteraction[]
  ): MotivationalIndicators {
    const sessions = interactions.filter(
      i => i.event_type === 'session_started' || i.event_type === 'session_ended'
    );

    const practiceAttempts = interactions.filter(
      i => i.event_type === 'practice_attempt'
    );

    const skippedProblems = interactions.filter(
      i => i.event_type === 'practice_skipped'
    ).length;

    // Calculate session durations
    const sessionDurations: number[] = [];
    const sessionStarts = interactions.filter(i => i.event_type === 'session_started');

    for (const start of sessionStarts) {
      const end = interactions.find(
        i => i.event_type === 'session_ended' &&
        i.session_id === start.session_id
      );
      if (end) {
        sessionDurations.push(
          new Date(end.created_at).getTime() - new Date(start.created_at).getTime()
        );
      }
    }

    // Calculate attempts per problem (persistence)
    const attemptsByQuestion = new Map<string, number>();
    for (const attempt of practiceAttempts) {
      const qId = attempt.payload.questionId || 'unknown';
      attemptsByQuestion.set(qId, (attemptsByQuestion.get(qId) || 0) + 1);
    }
    const attemptsPerProblem = Array.from(attemptsByQuestion.values());
    const avgAttemptsBeforeGivingUp = attemptsPerProblem.length > 0
      ? attemptsPerProblem.reduce((a, b) => a + b, 0) / attemptsPerProblem.length
      : 0;

    // Infer goal orientation
    // Mastery-oriented: requests harder problems, persists after failure
    // Performance-oriented: avoids hard problems, gives up easily
    // Avoidance: minimal engagement

    let goalOrientation: 'mastery' | 'performance' | 'avoidance' | 'unknown' = 'unknown';

    if (practiceAttempts.length >= 10) {
      const skipRate = skippedProblems / (skippedProblems + practiceAttempts.length);

      if (avgAttemptsBeforeGivingUp > 2 && skipRate < 0.1) {
        goalOrientation = 'mastery';
      } else if (skipRate > 0.3 || avgAttemptsBeforeGivingUp < 1.2) {
        goalOrientation = 'avoidance';
      } else {
        goalOrientation = 'performance';
      }
    }

    return {
      engagement: sessionDurations.length >= 3 ? {
        sessionFrequency: this.calculateSessionFrequency(interactions),
        averageSessionDuration: sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length / 60000,
        voluntaryReturnRate: 0, // Would need to track voluntary vs required
      } : null,
      persistence: practiceAttempts.length >= 10 ? {
        attemptsBeforeGivingUp: avgAttemptsBeforeGivingUp,
        recoveryAfterFailure: 0, // Would need session-level analysis
        challengeSeekingBehavior: 0, // Would need difficulty request tracking
      } : null,
      goalOrientation,
      evidence: {
        sessionDurations,
        attemptsPerProblem,
        skippedProblems,
        requestedHarderProblems: 0,
      },
    };
  }

  /**
   * Infer behavioral patterns from all interactions
   */
  private inferBehavioralPatterns(
    interactions: LearnerInteraction[]
  ): BehavioralPatterns {
    const practiceAttempts = interactions.filter(
      i => i.event_type === 'practice_attempt'
    );

    // Response times
    const responseTimes = practiceAttempts
      .map(a => a.payload.responseTimeMs)
      .filter((t): t is number => t !== undefined && t > 0);

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : null;

    // Time of day distribution
    const hourCounts = new Map<number, number>();
    for (const interaction of interactions) {
      const hour = new Date(interaction.created_at).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }

    let preferredTimeOfDay: number | null = null;
    let maxCount = 0;
    for (const [hour, count] of hourCounts) {
      if (count > maxCount) {
        maxCount = count;
        preferredTimeOfDay = hour;
      }
    }

    // Day of week distribution
    const dayCounts = new Map<number, number>();
    for (const interaction of interactions) {
      const day = new Date(interaction.created_at).getDay();
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    }

    let mostActiveDay: number | null = null;
    maxCount = 0;
    for (const [day, count] of dayCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostActiveDay = day;
      }
    }

    // Hint usage rate
    const hintRequests = interactions.filter(i => i.event_type === 'hint_requested').length;
    const hintUsageRate = practiceAttempts.length > 0
      ? hintRequests / practiceAttempts.length
      : null;

    // Error patterns
    const errorPatterns = this.extractErrorPatterns(practiceAttempts);

    return {
      averageSessionDuration: null, // Calculated in motivational
      preferredTimeOfDay,
      mostActiveDay,
      averageResponseTime: avgResponseTime,
      responseTimeVariance: null, // Could calculate
      hintUsageRate,
      errorPatterns,
      learningVelocity: null, // Would need mastery timeline
    };
  }

  /**
   * Calculate confidence scores based on evidence quantity
   * More interactions = higher confidence in estimates
   */
  private calculateConfidenceScores(
    interactions: LearnerInteraction[]
  ): InverseProfile['confidenceScores'] {
    const practiceAttempts = interactions.filter(i => i.event_type === 'practice_attempt').length;
    const sessions = new Set(interactions.map(i => i.session_id)).size;
    const confidenceRatings = interactions.filter(i => i.event_type === 'confidence_rated').length;

    // Confidence scales from 0 to 1 based on evidence quantity
    // These thresholds are configurable
    const knowledgeConfidence = Math.min(practiceAttempts / 50, 1);
    const cognitiveConfidence = Math.min(practiceAttempts / 30, 1);
    const metacognitiveConfidence = Math.min(confidenceRatings / 20, 1);
    const motivationalConfidence = Math.min(sessions / 10, 1);
    const behavioralConfidence = Math.min(interactions.length / 100, 1);

    return {
      knowledge: knowledgeConfidence,
      cognitive: cognitiveConfidence,
      metacognitive: metacognitiveConfidence,
      motivational: motivationalConfidence,
      behavioral: behavioralConfidence,
    };
  }

  // Helper methods...

  private async detectKnowledgeGaps(
    notebookId: string,
    skillMastery: Map<string, number>
  ): Promise<KnowledgeGap[]> {
    // Implementation would query prerequisites from Neo4J
    return [];
  }

  private detectMisconceptions(
    interactions: LearnerInteraction[]
  ): Misconception[] {
    // Group errors by type and skill
    const errorsBySkill = new Map<string, Map<string, number>>();

    for (const interaction of interactions) {
      if (interaction.event_type !== 'practice_attempt') continue;
      if (interaction.payload.isCorrect) continue;

      const skillId = interaction.skill_id;
      const errorType = interaction.payload.errorType || 'unknown';

      if (!errorsBySkill.has(skillId)) {
        errorsBySkill.set(skillId, new Map());
      }
      const skillErrors = errorsBySkill.get(skillId)!;
      skillErrors.set(errorType, (skillErrors.get(errorType) || 0) + 1);
    }

    // Find systematic patterns (same error type >= 3 times)
    const misconceptions: Misconception[] = [];

    for (const [skillId, errors] of errorsBySkill) {
      for (const [errorType, frequency] of errors) {
        if (frequency >= 3) {
          misconceptions.push({
            skillId,
            errorType,
            frequency,
            examples: [], // Would need to store wrong answers
            suggestedIntervention: this.getInterventionForError(errorType),
          });
        }
      }
    }

    return misconceptions;
  }

  private extractErrorPatterns(
    practiceAttempts: LearnerInteraction[]
  ): ErrorPattern[] {
    const errorCounts = new Map<string, { count: number; skills: Set<string> }>();

    for (const attempt of practiceAttempts) {
      if (attempt.payload.isCorrect) continue;
      const errorType = attempt.payload.errorType || 'unknown';

      if (!errorCounts.has(errorType)) {
        errorCounts.set(errorType, { count: 0, skills: new Set() });
      }
      const data = errorCounts.get(errorType)!;
      data.count++;
      if (attempt.skill_id) data.skills.add(attempt.skill_id);
    }

    return Array.from(errorCounts.entries()).map(([errorType, data]) => ({
      errorType,
      frequency: data.count,
      affectedSkills: Array.from(data.skills),
      recentTrend: 'stable' as const, // Would need temporal analysis
    }));
  }

  private getInterventionForError(errorType: string): string {
    const interventions: Record<string, string> = {
      computational: 'Practice basic calculations with immediate feedback',
      conceptual: 'Review concept explanation with worked examples',
      procedural: 'Step-by-step walkthrough of procedure',
      careless: 'Slow down and double-check work',
      knowledge_gap: 'Review prerequisite material first',
      misread: 'Practice careful reading of problem statements',
      partial_understanding: 'Fill in conceptual gaps with targeted practice',
    };
    return interventions[errorType] || 'Review relevant material and practice';
  }

  private calculateSessionFrequency(interactions: LearnerInteraction[]): number {
    if (interactions.length < 2) return 0;

    const timestamps = interactions.map(i => new Date(i.created_at).getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const weeks = (maxTime - minTime) / (7 * 24 * 60 * 60 * 1000);

    const sessions = new Set(interactions.map(i => i.session_id)).size;

    return weeks > 0 ? sessions / weeks : sessions;
  }

  private getDefaultProfile(learnerId: string, notebookId: string): InverseProfile {
    return {
      learnerId,
      notebookId,
      version: 0,
      computedAt: Date.now(),
      knowledgeState: {
        skillMastery: new Map(),
        averageMastery: 0,
        skillsMastered: 0,
        skillsInProgress: 0,
        knowledgeGaps: [],
        currentZPD: [],
        misconceptions: [],
      },
      cognitiveIndicators: {
        workingMemoryIndicator: 'unknown',
        expertiseLevel: 'novice',
        cognitiveLoadThreshold: null,
        optimalComplexityLevel: null,
        evidence: {
          avgResponseTimeByDifficulty: new Map(),
          successRateByComplexity: new Map(),
          hintRequestRateByDifficulty: new Map(),
        },
      },
      metacognitiveIndicators: {
        calibrationAccuracy: null,
        helpSeekingPattern: 'unknown',
        selfMonitoringAccuracy: null,
        confidenceVsPerformance: null,
        evidence: {
          confidenceRatings: [],
          hintRequestTiming: [],
          selfCorrectionRate: 0,
        },
      },
      motivationalIndicators: {
        engagement: null,
        persistence: null,
        goalOrientation: 'unknown',
        evidence: {
          sessionDurations: [],
          attemptsPerProblem: [],
          skippedProblems: 0,
          requestedHarderProblems: 0,
        },
      },
      behavioralPatterns: {
        averageSessionDuration: null,
        preferredTimeOfDay: null,
        mostActiveDay: null,
        averageResponseTime: null,
        responseTimeVariance: null,
        hintUsageRate: null,
        errorPatterns: [],
        learningVelocity: null,
      },
      confidenceScores: {
        knowledge: 0,
        cognitive: 0,
        metacognitive: 0,
        motivational: 0,
        behavioral: 0,
      },
    };
  }

  private async persistProfile(profile: InverseProfile): Promise<void> {
    // Upsert to Supabase
    await this.supabase
      .from('inverse_profiles')
      .upsert({
        learner_id: profile.learnerId,
        notebook_id: profile.notebookId,
        version: profile.version,
        computed_at: new Date(profile.computedAt).toISOString(),
        knowledge_state: profile.knowledgeState,
        cognitive_indicators: profile.cognitiveIndicators,
        metacognitive_indicators: profile.metacognitiveIndicators,
        motivational_indicators: profile.motivationalIndicators,
        behavioral_patterns: profile.behavioralPatterns,
        confidence_scores: profile.confidenceScores,
      }, {
        onConflict: 'learner_id,notebook_id',
      });
  }
}
```

---

## Part 3: Making BKT Valuable and Measurable

### 3.1 Current BKT Implementation

The existing BKT in `lib/graph/learner-state.ts` is well-implemented but lacks:
1. **Validation** - How do we know the parameters are calibrated correctly?
2. **Measurement** - How do we prove BKT predictions are accurate?
3. **Adaptive Parameters** - Parameters are static, not learned from data

### 3.2 Enhanced BKT with Validation

```typescript
// lib/graph/learner-state-enhanced.ts

/**
 * Enhanced BKT with validation metrics
 */
interface BKTParameters {
  pL0: number;  // Prior P(mastery)
  pT: number;   // P(learning) - transition probability
  pS: number;   // P(slip) - know but wrong
  pG: number;   // P(guess) - don't know but right
}

interface BKTValidationMetrics {
  // Prediction accuracy
  auc: number;                      // Area Under ROC Curve
  logLoss: number;                  // Negative log-likelihood
  brier: number;                    // Brier score
  calibration: number;              // Calibration error

  // Mastery prediction
  predictedMasteryAccuracy: number; // % of mastery predictions that were correct
  masteryThresholdOptimal: number;  // Optimal mastery threshold from data

  // Sample size
  totalObservations: number;
  uniqueLearners: number;
  uniqueSkills: number;
}

/**
 * Enhanced BKT with parameter fitting and validation
 */
class EnhancedBKT {
  private defaultParams: BKTParameters = {
    pL0: 0.0,
    pT: 0.1,
    pS: 0.1,
    pG: 0.2,
  };

  // Skill-specific learned parameters (from EM algorithm)
  private skillParams: Map<string, BKTParameters> = new Map();

  /**
   * Standard BKT update (existing implementation)
   */
  updateMastery(
    currentPMastery: number,
    isCorrect: boolean,
    params: BKTParameters = this.defaultParams
  ): number {
    const { pS, pG, pT } = params;

    // Posterior P(mastery | observation)
    let posteriorMastery: number;

    if (isCorrect) {
      // P(mastery | correct) using Bayes
      const pCorrectGivenMastery = 1 - pS;
      const pCorrectGivenNotMastery = pG;
      const pCorrect = currentPMastery * pCorrectGivenMastery +
                       (1 - currentPMastery) * pCorrectGivenNotMastery;
      posteriorMastery = (currentPMastery * pCorrectGivenMastery) / pCorrect;
    } else {
      // P(mastery | incorrect) using Bayes
      const pIncorrectGivenMastery = pS;
      const pIncorrectGivenNotMastery = 1 - pG;
      const pIncorrect = currentPMastery * pIncorrectGivenMastery +
                         (1 - currentPMastery) * pIncorrectGivenNotMastery;
      posteriorMastery = (currentPMastery * pIncorrectGivenMastery) / pIncorrect;
    }

    // Account for learning (transition)
    return posteriorMastery + (1 - posteriorMastery) * pT;
  }

  /**
   * Fit BKT parameters using Expectation-Maximization
   * This should be run periodically to calibrate parameters
   */
  async fitParameters(
    interactions: Array<{
      learnerId: string;
      skillId: string;
      isCorrect: boolean;
      attemptNumber: number;
    }>
  ): Promise<Map<string, BKTParameters>> {
    // Group by skill
    const bySkill = new Map<string, typeof interactions>();
    for (const interaction of interactions) {
      if (!bySkill.has(interaction.skillId)) {
        bySkill.set(interaction.skillId, []);
      }
      bySkill.get(interaction.skillId)!.push(interaction);
    }

    const fittedParams = new Map<string, BKTParameters>();

    for (const [skillId, skillInteractions] of bySkill) {
      if (skillInteractions.length < 50) {
        // Not enough data - use defaults
        fittedParams.set(skillId, this.defaultParams);
        continue;
      }

      // Run EM algorithm
      const params = this.emAlgorithm(skillInteractions);
      fittedParams.set(skillId, params);
    }

    this.skillParams = fittedParams;
    return fittedParams;
  }

  /**
   * EM Algorithm for BKT parameter estimation
   */
  private emAlgorithm(
    interactions: Array<{
      learnerId: string;
      isCorrect: boolean;
      attemptNumber: number;
    }>,
    maxIterations: number = 100,
    tolerance: number = 1e-6
  ): BKTParameters {
    // Group by learner
    const byLearner = new Map<string, boolean[]>();
    for (const interaction of interactions) {
      if (!byLearner.has(interaction.learnerId)) {
        byLearner.set(interaction.learnerId, []);
      }
      byLearner.get(interaction.learnerId)!.push(interaction.isCorrect);
    }

    // Initialize parameters
    let params: BKTParameters = { ...this.defaultParams };

    for (let iter = 0; iter < maxIterations; iter++) {
      const { pL0, pT, pS, pG } = params;

      // E-step: compute expected sufficient statistics
      let sumExpectedMastery = 0;
      let sumExpectedTransitions = 0;
      let sumCorrectWhenMastered = 0;
      let sumIncorrectWhenNotMastered = 0;
      let totalMasteredObs = 0;
      let totalNotMasteredObs = 0;
      let totalTransitionOpps = 0;

      for (const [, responses] of byLearner) {
        // Forward-backward algorithm
        const n = responses.length;
        const alpha = new Array(n); // Forward probabilities
        const beta = new Array(n);  // Backward probabilities
        const gamma = new Array(n); // P(mastery | all observations)

        // Forward pass
        alpha[0] = responses[0]
          ? pL0 * (1 - pS) + (1 - pL0) * pG
          : pL0 * pS + (1 - pL0) * (1 - pG);

        for (let t = 1; t < n; t++) {
          const prevMastery = alpha[t-1];
          const currMastery = prevMastery + (1 - prevMastery) * pT;
          alpha[t] = responses[t]
            ? currMastery * (1 - pS) + (1 - currMastery) * pG
            : currMastery * pS + (1 - currMastery) * (1 - pG);
        }

        // Backward pass and compute gamma
        beta[n-1] = 1;
        for (let t = n - 2; t >= 0; t--) {
          const pStayMastered = 1; // Can't unlearn
          const pLearn = pT;
          const nextObs = responses[t+1];
          const emissionMastered = nextObs ? (1 - pS) : pS;
          const emissionNotMastered = nextObs ? pG : (1 - pG);

          beta[t] = (pStayMastered * emissionMastered + pLearn * emissionMastered) * beta[t+1] +
                   ((1 - pLearn) * emissionNotMastered) * beta[t+1];
        }

        // Compute gamma (smoothed marginals)
        for (let t = 0; t < n; t++) {
          const pCorrect = responses[t]
            ? alpha[t] : 1 - alpha[t];
          gamma[t] = Math.min(0.99, Math.max(0.01, pCorrect)); // Clamp

          sumExpectedMastery += gamma[t];
          if (responses[t]) sumCorrectWhenMastered += gamma[t];
          else sumIncorrectWhenNotMastered += (1 - gamma[t]);
          totalMasteredObs += gamma[t];
          totalNotMasteredObs += (1 - gamma[t]);

          if (t > 0) {
            // Transition expectations
            sumExpectedTransitions += (1 - gamma[t-1]) * pT;
            totalTransitionOpps += (1 - gamma[t-1]);
          }
        }
      }

      // M-step: update parameters
      const newPL0 = sumExpectedMastery / byLearner.size /
                     (interactions.length / byLearner.size);
      const newPT = totalTransitionOpps > 0
        ? sumExpectedTransitions / totalTransitionOpps
        : params.pT;
      const newPS = totalMasteredObs > 0
        ? 1 - (sumCorrectWhenMastered / totalMasteredObs)
        : params.pS;
      const newPG = totalNotMasteredObs > 0
        ? 1 - (sumIncorrectWhenNotMastered / totalNotMasteredObs)
        : params.pG;

      // Check convergence
      const delta = Math.abs(newPL0 - pL0) + Math.abs(newPT - pT) +
                   Math.abs(newPS - pS) + Math.abs(newPG - pG);

      params = {
        pL0: Math.max(0.001, Math.min(0.5, newPL0)),
        pT: Math.max(0.001, Math.min(0.5, newPT)),
        pS: Math.max(0.001, Math.min(0.3, newPS)),
        pG: Math.max(0.001, Math.min(0.4, newPG)),
      };

      if (delta < tolerance) break;
    }

    return params;
  }

  /**
   * Validate BKT predictions against held-out data
   */
  validatePredictions(
    testData: Array<{
      learnerId: string;
      skillId: string;
      isCorrect: boolean;
      attemptNumber: number;
    }>
  ): BKTValidationMetrics {
    const predictions: Array<{ predicted: number; actual: boolean }> = [];

    // Group by learner-skill
    const sequences = new Map<string, boolean[]>();
    for (const { learnerId, skillId, isCorrect } of testData) {
      const key = `${learnerId}:${skillId}`;
      if (!sequences.has(key)) sequences.set(key, []);
      sequences.get(key)!.push(isCorrect);
    }

    // Compute predictions
    for (const [key, responses] of sequences) {
      const [, skillId] = key.split(':');
      const params = this.skillParams.get(skillId) || this.defaultParams;

      let pMastery = params.pL0;
      for (let i = 0; i < responses.length; i++) {
        // Predict P(correct) = P(mastery)(1-pS) + P(not mastery)(pG)
        const pCorrect = pMastery * (1 - params.pS) + (1 - pMastery) * params.pG;
        predictions.push({ predicted: pCorrect, actual: responses[i] });

        // Update mastery for next prediction
        pMastery = this.updateMastery(pMastery, responses[i], params);
      }
    }

    // Calculate metrics
    return {
      auc: this.calculateAUC(predictions),
      logLoss: this.calculateLogLoss(predictions),
      brier: this.calculateBrier(predictions),
      calibration: this.calculateCalibration(predictions),
      predictedMasteryAccuracy: this.calculateMasteryAccuracy(predictions),
      masteryThresholdOptimal: this.findOptimalThreshold(predictions),
      totalObservations: predictions.length,
      uniqueLearners: new Set(testData.map(d => d.learnerId)).size,
      uniqueSkills: new Set(testData.map(d => d.skillId)).size,
    };
  }

  private calculateAUC(predictions: Array<{ predicted: number; actual: boolean }>): number {
    // Sort by predicted probability
    const sorted = [...predictions].sort((a, b) => b.predicted - a.predicted);

    let positives = 0;
    let negatives = 0;
    let auc = 0;

    for (const p of sorted) {
      if (p.actual) {
        positives++;
      } else {
        negatives++;
        auc += positives;
      }
    }

    return positives * negatives > 0 ? auc / (positives * negatives) : 0.5;
  }

  private calculateLogLoss(predictions: Array<{ predicted: number; actual: boolean }>): number {
    let sum = 0;
    for (const { predicted, actual } of predictions) {
      const p = Math.max(0.001, Math.min(0.999, predicted));
      sum -= actual ? Math.log(p) : Math.log(1 - p);
    }
    return sum / predictions.length;
  }

  private calculateBrier(predictions: Array<{ predicted: number; actual: boolean }>): number {
    let sum = 0;
    for (const { predicted, actual } of predictions) {
      sum += Math.pow(predicted - (actual ? 1 : 0), 2);
    }
    return sum / predictions.length;
  }

  private calculateCalibration(predictions: Array<{ predicted: number; actual: boolean }>): number {
    // Bin predictions and compare to actual rates
    const bins = new Map<number, { sum: number; correct: number; count: number }>();

    for (const { predicted, actual } of predictions) {
      const bin = Math.floor(predicted * 10); // 10 bins
      if (!bins.has(bin)) bins.set(bin, { sum: 0, correct: 0, count: 0 });
      const b = bins.get(bin)!;
      b.sum += predicted;
      b.correct += actual ? 1 : 0;
      b.count++;
    }

    let calibrationError = 0;
    for (const [, { sum, correct, count }] of bins) {
      if (count > 0) {
        const meanPredicted = sum / count;
        const actualRate = correct / count;
        calibrationError += Math.abs(meanPredicted - actualRate) * count;
      }
    }

    return calibrationError / predictions.length;
  }

  private calculateMasteryAccuracy(
    predictions: Array<{ predicted: number; actual: boolean }>
  ): number {
    // How often does P(mastery) > 0.8 correspond to actual success?
    const highConfidence = predictions.filter(p => p.predicted > 0.8);
    if (highConfidence.length === 0) return 0;
    return highConfidence.filter(p => p.actual).length / highConfidence.length;
  }

  private findOptimalThreshold(
    predictions: Array<{ predicted: number; actual: boolean }>
  ): number {
    // Find threshold that maximizes accuracy
    let bestThreshold = 0.5;
    let bestAccuracy = 0;

    for (let t = 0.1; t <= 0.9; t += 0.05) {
      const correct = predictions.filter(p =>
        (p.predicted >= t && p.actual) || (p.predicted < t && !p.actual)
      ).length;
      const accuracy = correct / predictions.length;
      if (accuracy > bestAccuracy) {
        bestAccuracy = accuracy;
        bestThreshold = t;
      }
    }

    return bestThreshold;
  }
}
```

### 3.3 BKT Validation API Endpoint

```typescript
// app/api/notebooks/[id]/learner/validate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { EnhancedBKT } from '@/lib/graph/learner-state-enhanced';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient();

  // Get all practice attempts for validation
  const { data: interactions } = await supabase
    .from('learner_interactions')
    .select('*')
    .eq('notebook_id', params.id)
    .eq('event_type', 'practice_attempt')
    .order('created_at', { ascending: true });

  if (!interactions || interactions.length < 100) {
    return NextResponse.json({
      error: 'Insufficient data for validation',
      minRequired: 100,
      current: interactions?.length || 0,
    }, { status: 400 });
  }

  // Split into train/test (80/20)
  const splitIndex = Math.floor(interactions.length * 0.8);
  const trainData = interactions.slice(0, splitIndex);
  const testData = interactions.slice(splitIndex);

  // Fit and validate
  const bkt = new EnhancedBKT();
  const fittedParams = await bkt.fitParameters(
    trainData.map(i => ({
      learnerId: i.learner_id,
      skillId: i.skill_id,
      isCorrect: i.payload.isCorrect,
      attemptNumber: i.payload.attemptNumber || 1,
    }))
  );

  const metrics = bkt.validatePredictions(
    testData.map(i => ({
      learnerId: i.learner_id,
      skillId: i.skill_id,
      isCorrect: i.payload.isCorrect,
      attemptNumber: i.payload.attemptNumber || 1,
    }))
  );

  return NextResponse.json({
    validation: metrics,
    fittedParameters: Object.fromEntries(fittedParams),
    interpretation: {
      auc: metrics.auc > 0.7 ? 'Good' : metrics.auc > 0.6 ? 'Fair' : 'Poor',
      calibration: metrics.calibration < 0.1 ? 'Well-calibrated' : 'Needs calibration',
      threshold: `Optimal mastery threshold: ${metrics.masteryThresholdOptimal.toFixed(2)}`,
    },
  });
}
```

---

## Part 4: Implementation Roadmap

### Phase 1: Interaction Capture Infrastructure (Week 1-2)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PHASE 1: INTERACTION CAPTURE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  WEEK 1                                                                     │
│  ───────                                                                    │
│  □ Create Supabase migration for learner_interactions table                 │
│  □ Create Supabase migration for learner_sessions table                     │
│  □ Create Supabase migration for inverse_profiles table                     │
│  □ Implement /api/notebooks/[id]/interactions endpoint (POST/GET)           │
│  □ Add RLS policies for learner data privacy                                │
│                                                                              │
│  WEEK 2                                                                     │
│  ───────                                                                    │
│  □ Create useInteractions() hook for frontend                               │
│  □ Create useSession() hook for session management                          │
│  □ Integrate interaction logging into existing practice flow                │
│  □ Add session start/end events to UI lifecycle                             │
│  □ Test interaction capture end-to-end                                      │
│                                                                              │
│  DELIVERABLES                                                               │
│  ────────────                                                               │
│  ✓ All learner interactions stored in Supabase                             │
│  ✓ Sessions tracked with aggregated stats                                  │
│  ✓ Frontend hooks for easy integration                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 2: BKT Enhancement & Validation (Week 3-4)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PHASE 2: BKT ENHANCEMENT & VALIDATION                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  WEEK 3                                                                     │
│  ───────                                                                    │
│  □ Implement EnhancedBKT class with EM parameter fitting                    │
│  □ Implement BKT validation metrics (AUC, log-loss, Brier, calibration)     │
│  □ Create /api/notebooks/[id]/learner/validate endpoint                     │
│  □ Create skill-specific parameter storage in Neo4J                         │
│                                                                              │
│  WEEK 4                                                                     │
│  ───────                                                                    │
│  □ Build validation dashboard component                                     │
│  □ Implement automatic parameter recalibration (weekly cron)                │
│  □ Add confidence intervals to mastery predictions                          │
│  □ Document BKT validation methodology                                      │
│                                                                              │
│  DELIVERABLES                                                               │
│  ────────────                                                               │
│  ✓ BKT parameters fitted from data (not just defaults)                     │
│  ✓ Validation metrics prove prediction accuracy                            │
│  ✓ Automatic recalibration keeps model accurate                            │
│                                                                              │
│  SUCCESS METRICS                                                            │
│  ───────────────                                                            │
│  • AUC > 0.70 (good discrimination)                                        │
│  • Calibration error < 0.10 (predictions match reality)                    │
│  • Mastery predictions > 80% accurate                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 3: Inverse Profiling Engine (Week 5-7)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PHASE 3: INVERSE PROFILING ENGINE                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  WEEK 5                                                                     │
│  ───────                                                                    │
│  □ Implement InverseProfileEngine class                                     │
│  □ Implement knowledge state inference (integrate with BKT)                 │
│  □ Implement cognitive indicators inference                                  │
│  □ Implement misconception detection from error patterns                    │
│                                                                              │
│  WEEK 6                                                                     │
│  ───────                                                                    │
│  □ Implement metacognitive indicators (confidence calibration)              │
│  □ Implement motivational indicators (engagement/persistence)               │
│  □ Implement behavioral pattern extraction                                   │
│  □ Add confidence scoring for profile estimates                              │
│                                                                              │
│  WEEK 7                                                                     │
│  ───────                                                                    │
│  □ Create /api/notebooks/[id]/profile endpoint                              │
│  □ Implement async profile update job (triggered by interactions)           │
│  □ Create useInverseProfile() hook                                          │
│  □ Build profile visualization dashboard                                    │
│                                                                              │
│  DELIVERABLES                                                               │
│  ────────────                                                               │
│  ✓ Complete inverse profile computed from interactions                     │
│  ✓ Profiles update in real-time as learner interacts                       │
│  ✓ Dashboard shows profile with confidence levels                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 4: Adaptive Learning Integration (Week 8-10)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PHASE 4: ADAPTIVE LEARNING INTEGRATION                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  WEEK 8                                                                     │
│  ───────                                                                    │
│  □ Use cognitive indicators to adjust scaffold level                        │
│  □ Use metacognitive indicators for help-seeking prompts                    │
│  □ Use motivational indicators for engagement interventions                 │
│  □ Implement adaptive difficulty based on optimal complexity                │
│                                                                              │
│  WEEK 9                                                                     │
│  ───────                                                                    │
│  □ Integrate profile into ZPD recommendations                               │
│  □ Add personalized learning path suggestions                               │
│  □ Implement intervention triggers for misconceptions                       │
│  □ Add metacognitive prompts for over/underconfidence                       │
│                                                                              │
│  WEEK 10                                                                    │
│  ────────                                                                   │
│  □ Create personalized dashboard with recommendations                       │
│  □ Add "Why this recommendation?" explanations                              │
│  □ Implement A/B testing framework for interventions                        │
│  □ Document personalization strategies                                      │
│                                                                              │
│  DELIVERABLES                                                               │
│  ────────────                                                               │
│  ✓ System adapts to learner based on inferred profile                      │
│  ✓ Personalized recommendations with explanations                          │
│  ✓ A/B testing validates intervention effectiveness                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 5: Learning Impact Measurement (Week 11-12)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PHASE 5: LEARNING IMPACT MEASUREMENT                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  WEEK 11                                                                    │
│  ────────                                                                   │
│  □ Implement normalized learning gain calculation                           │
│  □ Implement time-to-mastery tracking                                       │
│  □ Implement retention measurement (delayed assessments)                    │
│  □ Implement transfer assessment support                                    │
│                                                                              │
│  WEEK 12                                                                    │
│  ────────                                                                   │
│  □ Create educator dashboard with class-wide analytics                      │
│  □ Implement cohort comparison (experimental vs control)                    │
│  □ Add export functionality for research data                               │
│  □ Document measurement methodology                                         │
│                                                                              │
│  DELIVERABLES                                                               │
│  ────────────                                                               │
│  ✓ Proof points for learning improvement                                   │
│  ✓ Educator dashboard with actionable insights                             │
│  ✓ Research-ready data export                                              │
│                                                                              │
│  SUCCESS METRICS (from whitepaper)                                         │
│  ──────────────────────────────────                                        │
│  • Normalized learning gain: g ≥ 0.50                                      │
│  • Time to mastery: ≤ 70% of traditional (30% faster)                     │
│  • 30-day retention: ≥ 70%                                                 │
│  • Effect size: d = 0.66–1.02                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 5: Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      COMPLETE DATA FLOW ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  USER INTERACTION                                                           │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    FRONTEND (React/Next.js)                          │   │
│  │  • useInteractions() - logs all events                              │   │
│  │  • useSession() - manages session lifecycle                         │   │
│  │  • useLearnerState() - fetches current mastery                      │   │
│  │  • useInverseProfile() - fetches inferred profile                   │   │
│  └───────────────────────────────┬─────────────────────────────────────┘   │
│                                  │                                          │
│       ┌──────────────────────────┼──────────────────────────┐              │
│       │                          │                          │              │
│       ▼                          ▼                          ▼              │
│  ┌─────────────┐         ┌──────────────┐         ┌─────────────────┐     │
│  │ Interactions │         │ Learner      │         │ Inverse Profile │     │
│  │ API          │         │ State API    │         │ API             │     │
│  │              │         │              │         │                 │     │
│  │ POST /inter- │         │ POST /learner│         │ GET /profile    │     │
│  │ actions      │         │ (practice)   │         │ (read profile)  │     │
│  │              │         │              │         │                 │     │
│  │ GET /inter-  │         │ GET /learner │         │ POST /profile/  │     │
│  │ actions      │         │ ?action=...  │         │ recompute       │     │
│  └──────┬──────┘         └──────┬───────┘         └────────┬────────┘     │
│         │                       │                          │               │
│         │                       │                          │               │
│         ▼                       ▼                          ▼               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          SUPABASE                                    │   │
│  │  ┌───────────────────┐  ┌───────────────────┐  ┌─────────────────┐ │   │
│  │  │ learner_          │  │ learner_          │  │ inverse_        │ │   │
│  │  │ interactions      │  │ sessions          │  │ profiles        │ │   │
│  │  │                   │  │                   │  │                 │ │   │
│  │  │ • event_type      │  │ • started_at      │  │ • knowledge_    │ │   │
│  │  │ • skill_id        │  │ • ended_at        │  │   state         │ │   │
│  │  │ • payload (JSONB) │  │ • summary stats   │  │ • cognitive_    │ │   │
│  │  │ • context (JSONB) │  │                   │  │   indicators    │ │   │
│  │  │ • session_id      │  │                   │  │ • metacognitive_│ │   │
│  │  │ • timestamp       │  │                   │  │   indicators    │ │   │
│  │  │                   │  │                   │  │ • motivational_ │ │   │
│  │  │                   │  │                   │  │   indicators    │ │   │
│  │  │                   │  │                   │  │ • behavioral_   │ │   │
│  │  │                   │  │                   │  │   patterns      │ │   │
│  │  └───────────────────┘  └───────────────────┘  └─────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                  │                                          │
│                                  │ Practice attempts also update...        │
│                                  ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                            NEO4J                                     │   │
│  │                                                                      │   │
│  │  (Skill)────────[:PREREQUISITE_OF]────────▶(Skill)                  │   │
│  │     │                                          │                     │   │
│  │     │                                          │                     │   │
│  │  (LearnerSkillState)                    (LearnerSkillState)         │   │
│  │     │                                          │                     │   │
│  │     └──────────────[:TRACKS]──────────────────┘                     │   │
│  │                                                                      │   │
│  │  LearnerSkillState:                                                 │   │
│  │  • pMastery (BKT probability)                                       │   │
│  │  • masteryStatus                                                    │   │
│  │  • srEaseFactor, srInterval (SM-2)                                  │   │
│  │  • currentScaffoldLevel                                             │   │
│  │  • BKT parameters (pL0, pT, pS, pG)                                 │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│                                                                              │
│  ASYNC JOBS (Background Processing)                                        │
│  ───────────────────────────────────                                       │
│                                                                              │
│  ┌───────────────────────┐    ┌───────────────────────┐                   │
│  │ Profile Recompute Job │    │ BKT Calibration Job   │                   │
│  │                       │    │                       │                   │
│  │ Trigger: Every 10     │    │ Trigger: Weekly       │                   │
│  │ interactions OR       │    │                       │                   │
│  │ session end           │    │ • Fit parameters      │                   │
│  │                       │    │   using EM            │                   │
│  │ • Read interactions   │    │ • Validate on held-   │                   │
│  │ • Compute profile     │    │   out data            │                   │
│  │ • Update inverse_     │    │ • Store new params    │                   │
│  │   profiles            │    │   in Neo4J            │                   │
│  └───────────────────────┘    └───────────────────────┘                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary

This plan provides:

1. **Interaction Capture Infrastructure** - Store ALL learner interactions for pattern analysis
2. **Enhanced BKT** - Fitted parameters and validation metrics to prove predictions work
3. **Inverse Profiling Engine** - Infer learner characteristics from behavior, not assessments
4. **Adaptive Integration** - Use profiles to personalize scaffolding, difficulty, recommendations
5. **Impact Measurement** - Prove learning improved with normalized gains, retention, effect sizes

**Key Innovation**: Zero friction onboarding. The system learns about learners from natural interactions, building an increasingly accurate profile over time without requiring diagnostic assessments.

**Expected Outcomes** (from research):
- Effect size d = 0.66–1.02 compared to traditional instruction
- 30%+ faster time to mastery
- 70%+ retention at 30 days
- Continuous adaptation as learner state changes

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/XXX_learner_interactions.sql` | Database schema for interactions |
| `lib/types/interactions.ts` | Type definitions for interaction events |
| `lib/inverse-profiling/types.ts` | Type definitions for inverse profiles |
| `lib/inverse-profiling/engine.ts` | Profile inference engine |
| `lib/graph/learner-state-enhanced.ts` | Enhanced BKT with validation |
| `app/api/notebooks/[id]/interactions/route.ts` | Interaction capture API |
| `app/api/notebooks/[id]/profile/route.ts` | Inverse profile API |
| `app/api/notebooks/[id]/learner/validate/route.ts` | BKT validation API |
| `hooks/useInteractions.ts` | Frontend hook for interaction logging |
| `hooks/useSession.ts` | Frontend hook for session management |
| `hooks/useInverseProfile.ts` | Frontend hook for profile access |
