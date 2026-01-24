# Modern Educational Psychology Frameworks - Implementation Plan

## Overview

This document details the implementation plan for 8 cutting-edge educational psychology frameworks (2020-2025 research) identified for integration into LearnGraph.

| # | Framework | Effect Size | Implementation Complexity | Priority |
|---|-----------|-------------|---------------------------|----------|
| 22 | Desirable Difficulties | d=0.5-0.8 | Medium | **HIGH** |
| 23 | Productive Failure | d=0.68 | Medium | **HIGH** |
| 26 | AI Socratic Tutoring | 2x improvement | Medium | **HIGH** |
| 28 | Microbreaks for Attention | 76% better | Low | **HIGH** |
| 24 | Self-Determination Theory | d=0.49-0.61 | Medium | MEDIUM |
| 27 | Attention Contagion | 15-25% | Low | MEDIUM |
| 25 | Embodied Cognition | d=0.32-0.55 | High | LOW |
| 29 | Handwriting vs. Typing | 25-40% | High | LOW |

---

## Tier 1: High Priority (High Impact, Achievable Now)

### Framework 22: Desirable Difficulties (Bjork & Bjork)

**Research:** d=0.5-0.8 effect sizes for long-term retention

**Core Principles:**
1. **Interleaving** - Mix topics instead of blocking
2. **Spacing** - Already implemented via SM-2
3. **Retrieval Practice** - Testing > re-reading
4. **Variation** - Vary problem contexts/formats

**Implementation:**

```
lib/practice/desirable-difficulties.ts
├── InterleaveScheduler
│   ├── generateInterleavedSession(skills[], count)
│   ├── calculateOptimalMixRatio(learnerProfile)
│   └── trackInterleavingEffectiveness()
├── VariationEngine
│   ├── generateVariation(question, variationType)
│   ├── contextualizeQuestion(question, newContext)
│   └── varyProblemFormat(question)
└── RetrievalBooster
    ├── convertToRetrievalFormat(content)
    ├── generateRecallPrompts(skill)
    └── measureRetrievalStrength()
```

**UI Changes:**
- Add "Interleaved Practice" mode to Practice page
- Show "Desirable Difficulty" indicator when enabled
- Track and display retrieval strength per skill

**Database:**
```sql
-- Add to learner_skill_state
ALTER TABLE learner_skill_state ADD COLUMN retrieval_strength FLOAT DEFAULT 0;
ALTER TABLE learner_skill_state ADD COLUMN last_retrieval_test TIMESTAMP;
ALTER TABLE learner_skill_state ADD COLUMN interleave_exposure_count INTEGER DEFAULT 0;
```

**Files to Create:**
```
lib/practice/desirable-difficulties.ts
lib/practice/interleave-scheduler.ts
lib/practice/variation-engine.ts
components/practice/InterleavedModeToggle.tsx
components/practice/DesirableDifficultyIndicator.tsx
```

---

### Framework 23: Productive Failure (Kapur)

**Research:** d=0.68 meta-analytic effect

**Core Principles:**
1. Present challenging problem BEFORE instruction
2. Allow struggle (but not frustration)
3. Consolidate learning after attempt
4. Compare failed approaches to correct solution

**Implementation:**

```
lib/practice/productive-failure.ts
├── ExploreFirstGenerator
│   ├── generateExplorationProblem(skill)
│   ├── scaffoldExploration(attempts[])
│   └── detectFrustrationThreshold()
├── ConsolidationEngine
│   ├── analyzeAttempts(attempts[])
│   ├── generateComparisonView(failedApproaches, correctSolution)
│   └── extractLearningMoments(attempts[])
└── FailureAnalyzer
    ├── categorizeFailureType(attempt)
    ├── identifyProductiveStruggle(session)
    └── measureConceptualGain()
```

**UI Flow:**
```
1. "Explore First" Challenge Screen
   ├── Problem presentation (no hints initially)
   ├── Multiple attempt tracker
   ├── Struggle timer (not visible to learner)
   └── Frustration detector (intervenes if needed)

2. Consolidation Screen (after attempts)
   ├── "What you tried" - visualize attempts
   ├── "The key insight" - highlight missing concept
   ├── "Correct approach" - worked example
   └── "Why this works" - connect to exploration
```

**Integration with Existing:**
- Add `explore_first` mode to Practice API
- Track attempt patterns in learner_interactions
- Use InterventionHandler for frustration detection

**Files to Create:**
```
lib/practice/productive-failure.ts
lib/practice/exploration-generator.ts
lib/practice/consolidation-engine.ts
components/practice/ExploreFirstMode.tsx
components/practice/ConsolidationView.tsx
components/practice/AttemptTimeline.tsx
app/api/notebooks/[id]/practice/explore/route.ts
```

---

### Framework 26: AI Socratic Tutoring

**Research:** 2x improvement over answer-giving (Ma et al., Nature 2025)

**Core Principles:**
1. Ask questions instead of telling answers
2. Guide through reasoning with prompts
3. Help learner discover insight themselves
4. Celebrate self-discovery moments

**Implementation:**

```
lib/tutoring/socratic-tutor.ts
├── QuestionGenerator
│   ├── generateGuidingQuestion(context, misconception)
│   ├── generateClarifyingQuestion(response)
│   ├── generateScaffoldingQuestion(gap)
│   └── generateReflectionQuestion(insight)
├── ResponseAnalyzer
│   ├── identifyMisconception(response)
│   ├── detectPartialUnderstanding(response)
│   ├── measureConfidenceLevel(response)
│   └── findTeachableMoment(response)
├── DialogueManager
│   ├── planDialoguePath(startState, goalState)
│   ├── adaptToResponse(dialoguePath, response)
│   └── celebrateDiscovery(insight)
└── PromptTemplates
    ├── CLARIFYING_PROMPTS[]
    ├── SCAFFOLDING_PROMPTS[]
    ├── REFLECTION_PROMPTS[]
    └── CELEBRATION_PROMPTS[]
```

**Gemini Prompt Strategy:**
```typescript
const SOCRATIC_SYSTEM_PROMPT = `
You are a Socratic tutor. NEVER give direct answers.
Instead:
1. Ask clarifying questions to understand the student's thinking
2. Point out contradictions gently
3. Guide toward the answer with leading questions
4. When they get it, celebrate their discovery

Current skill: {skill}
Known misconception: {misconception}
Student's current understanding: {context}
`
```

**UI Components:**
- `SocraticTutor.tsx` - Chat-based tutoring interface
- `ThinkingPrompt.tsx` - Displays guiding questions
- `DiscoveryMoment.tsx` - Celebrates self-discovery
- `ReasoningChain.tsx` - Visualizes student's reasoning path

**Integration:**
- Add "Socratic Mode" to practice feedback
- Replace "Show Answer" with "Get a Hint Question"
- Track question-answer exchanges in interactions

**Files to Create:**
```
lib/tutoring/socratic-tutor.ts
lib/tutoring/dialogue-manager.ts
lib/tutoring/prompt-templates.ts
components/tutoring/SocraticTutor.tsx
components/tutoring/ThinkingPrompt.tsx
components/tutoring/DiscoveryMoment.tsx
app/api/notebooks/[id]/tutor/route.ts
```

---

### Framework 28: Microbreaks for Attention

**Research:** 76% better post-test performance with strategic breaks

**Core Principles:**
1. 60-90 second breaks every 10-15 minutes
2. Complete cognitive disengagement during break
3. Brief physical movement or mindfulness
4. Gradual return to task

**Implementation:**

```
lib/attention/microbreak-scheduler.ts
├── BreakScheduler
│   ├── calculateOptimalBreakTime(sessionDuration, cognitiveLoad)
│   ├── detectAttentionFatigue(responsePatterns)
│   └── scheduleNextBreak()
├── BreakContent
│   ├── generateBreathingExercise()
│   ├── generateMicroMovement()
│   ├── generateMindfulnessMoment()
│   └── generateGazeShift()
└── AttentionMonitor
    ├── trackResponseLatency()
    ├── detectWanderingAttention()
    └── measurePostBreakRecovery()
```

**UI Components:**
```tsx
// MicrobreakOverlay.tsx
<MicrobreakOverlay
  duration={75} // seconds
  activity="breathing" | "movement" | "mindfulness"
  onComplete={resumeSession}
/>

// BreakReminder.tsx (non-intrusive)
<BreakReminder
  suggestedIn={120} // seconds
  onDismiss={snoozeBreak}
  onAccept={startBreak}
/>
```

**Session Integration:**
- Track continuous practice time in SessionProvider
- Trigger soft reminder at 10 min, stronger at 15 min
- Log break acceptance/rejection in interactions
- Measure pre/post break performance

**Files to Create:**
```
lib/attention/microbreak-scheduler.ts
lib/attention/break-content.ts
components/attention/MicrobreakOverlay.tsx
components/attention/BreakReminder.tsx
components/attention/BreathingExercise.tsx
components/attention/MicroMovement.tsx
```

---

## Tier 2: Medium Priority (Good Impact, Moderate Effort)

### Framework 24: Self-Determination Theory (Ryan & Deci)

**Research:** d=0.49-0.61 across autonomy, competence, relatedness

**Three Needs:**
1. **Autonomy** - Choice in learning path
2. **Competence** - Optimal challenge level
3. **Relatedness** - Social connection

**Implementation:**

**Autonomy Features:**
- Allow learners to choose practice topics
- Offer multiple paths to same goal
- "Skip for now" without penalty
- Custom goal setting

**Competence Features:**
- Already implemented via adaptive difficulty
- Add clearer progress visualization
- Celebrate mastery moments
- "Just-right" challenge selection

**Relatedness Features (Future):**
- Study groups
- Leaderboards (opt-in)
- Peer explanations
- Mentor matching

**Files to Create:**
```
lib/motivation/autonomy-tracker.ts
components/motivation/LearnerChoicePanel.tsx
components/motivation/GoalSetter.tsx
components/motivation/CompetenceMeter.tsx
```

---

### Framework 27: Attention Contagion

**Research:** 15-25% performance impact from peer attention states

**For Solo Learners:**
- "Focus mode" with distraction blocking
- Ambient "study with me" audio/video
- Virtual study room concept
- Focus streaks and accountability

**For Future Group Features:**
- Sync focus sessions
- Shared concentration metrics
- "Don't break the chain" group challenges

**Files to Create:**
```
lib/attention/focus-mode.ts
components/attention/FocusMode.tsx
components/attention/VirtualStudyRoom.tsx
components/attention/FocusStreak.tsx
```

---

## Tier 3: Lower Priority (High Effort or Specialized)

### Framework 25: Embodied Cognition

**Research:** d=0.32-0.55 for gesture-based learning

**Potential Features:**
- Drawing/sketching tools for math/science
- Gesture recognition for concept mapping
- Physical manipulation simulations
- AR/VR explorations (future)

**Complexity:** Requires significant UI investment, specialized hardware consideration

**Deferred to:** Future mobile app or specialized subjects

---

### Framework 29: Handwriting vs. Typing

**Research:** 25-40% better recall with handwriting

**Potential Features:**
- Handwriting input for notes
- Sketch-to-text conversion
- Stylus support for diagrams
- "Write it out" practice mode

**Complexity:** Requires canvas/handwriting recognition, best on tablet devices

**Deferred to:** Future tablet-optimized version

---

## Implementation Roadmap

### Phase A: Quick Wins (1-2 weeks)
- [ ] Microbreaks for Attention (Framework 28)
  - BreakScheduler
  - MicrobreakOverlay component
  - Integration with SessionProvider

### Phase B: Core Enhancements (3-4 weeks)
- [ ] Desirable Difficulties (Framework 22)
  - Interleaved practice mode
  - Variation engine
  - Retrieval strength tracking

- [ ] Productive Failure (Framework 23)
  - Explore-first mode
  - Consolidation view
  - Attempt timeline

### Phase C: AI Tutoring (2-3 weeks)
- [ ] Socratic Tutoring (Framework 26)
  - Question generator
  - Dialogue manager
  - Tutoring UI components

### Phase D: Motivation & Focus (2 weeks)
- [ ] Self-Determination Theory (Framework 24)
  - Autonomy choice panel
  - Goal setter
  - Enhanced competence feedback

- [ ] Attention/Focus Features (Framework 27)
  - Focus mode
  - Focus streaks

### Phase E: Advanced (Future)
- [ ] Embodied Cognition (Framework 25)
- [ ] Handwriting Integration (Framework 29)

---

## Database Additions

```sql
-- Migration: modern_edpsych_frameworks.sql

-- Desirable Difficulties tracking
ALTER TABLE learner_skill_state ADD COLUMN IF NOT EXISTS retrieval_strength FLOAT DEFAULT 0;
ALTER TABLE learner_skill_state ADD COLUMN IF NOT EXISTS last_retrieval_test TIMESTAMPTZ;
ALTER TABLE learner_skill_state ADD COLUMN IF NOT EXISTS interleave_count INTEGER DEFAULT 0;
ALTER TABLE learner_skill_state ADD COLUMN IF NOT EXISTS variation_exposure JSONB DEFAULT '[]';

-- Productive Failure tracking
CREATE TABLE IF NOT EXISTS exploration_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES learner_sessions(id),
  skill_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  attempt_content TEXT,
  attempt_category TEXT, -- 'partial_correct', 'misconception', 'creative_wrong', etc.
  duration_ms INTEGER,
  led_to_insight BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Microbreak tracking
CREATE TABLE IF NOT EXISTS microbreaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES learner_sessions(id),
  break_type TEXT NOT NULL, -- 'breathing', 'movement', 'mindfulness'
  suggested_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  was_skipped BOOLEAN DEFAULT FALSE,
  pre_break_response_time_avg INTEGER,
  post_break_response_time_avg INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Socratic tutoring sessions
CREATE TABLE IF NOT EXISTS tutoring_exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES learner_sessions(id),
  skill_id TEXT NOT NULL,
  exchange_type TEXT NOT NULL, -- 'clarifying', 'scaffolding', 'reflection', 'celebration'
  tutor_question TEXT NOT NULL,
  student_response TEXT,
  detected_understanding TEXT, -- 'none', 'partial', 'correct', 'misconception'
  led_to_discovery BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Focus/attention tracking
CREATE TABLE IF NOT EXISTS focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  focus_mode_enabled BOOLEAN DEFAULT FALSE,
  distraction_count INTEGER DEFAULT 0,
  attention_score FLOAT, -- computed from response patterns
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learner autonomy choices
CREATE TABLE IF NOT EXISTS learner_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  notebook_id UUID REFERENCES notebooks(id),
  goal_type TEXT NOT NULL, -- 'skill_mastery', 'time_based', 'streak', 'custom'
  target_skill_id TEXT,
  target_value FLOAT,
  current_value FLOAT DEFAULT 0,
  deadline TIMESTAMPTZ,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'abandoned'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

---

## API Endpoints

```
# Desirable Difficulties
GET  /api/notebooks/[id]/practice?mode=interleaved&count=10
POST /api/notebooks/[id]/practice/variation { questionId, variationType }

# Productive Failure
GET  /api/notebooks/[id]/practice/explore { skillId }
POST /api/notebooks/[id]/practice/explore/attempt { attemptContent }
GET  /api/notebooks/[id]/practice/explore/consolidate { sessionId }

# Socratic Tutoring
POST /api/notebooks/[id]/tutor { skillId, context }
POST /api/notebooks/[id]/tutor/respond { exchangeId, response }

# Microbreaks
GET  /api/notebooks/[id]/session/break-status
POST /api/notebooks/[id]/session/break { breakType, action: 'start'|'complete'|'skip' }

# Goals & Autonomy
GET  /api/notebooks/[id]/goals
POST /api/notebooks/[id]/goals { type, target }
PATCH /api/notebooks/[id]/goals/[goalId] { progress }

# Focus Mode
POST /api/notebooks/[id]/session/focus { enabled: boolean }
GET  /api/notebooks/[id]/session/focus-stats
```

---

## Success Metrics

| Framework | Metric | Target |
|-----------|--------|--------|
| Desirable Difficulties | Long-term retention (30-day) | +20% |
| Productive Failure | Conceptual understanding score | +15% |
| Socratic Tutoring | Self-discovery rate | >60% |
| Microbreaks | Session duration increase | +25% |
| Self-Determination | Voluntary return rate | +30% |
| Attention Features | Focus session completion | >80% |

---

## Research References

- Bjork, R. A., & Bjork, E. L. (2024). Desirable difficulties in learning. In Learning and Memory.
- Kapur, M. (2024). Productive failure: A systematic review and meta-analysis.
- Ma, X., et al. (2025). AI tutoring with Socratic questioning. Nature.
- Ryan, R. M., & Deci, E. L. (2020). Self-determination theory: Basic psychological needs in motivation.
- Stojic, H., et al. (2024). Attention contagion in learning environments.
- 2024-2025 studies on microbreaks and cognitive performance.
