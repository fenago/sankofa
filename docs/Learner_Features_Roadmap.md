# Learner Features & Inverse Profiling - Complete Roadmap

## Foundation Dependencies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FOUNDATION LAYER (Phase 1-2)                         │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    INTERACTION CAPTURE                               │    │
│  │  • learner_interactions table                                       │    │
│  │  • learner_sessions table                                           │    │
│  │  • Event logging API                                                │    │
│  │  • Session management hooks                                         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                    ┌───────────────┴───────────────┐                       │
│                    ▼                               ▼                       │
│  ┌──────────────────────────────┐   ┌──────────────────────────────┐      │
│  │      ENHANCED BKT            │   │    INVERSE PROFILES          │      │
│  │  • Parameter fitting         │   │  • Profile computation       │      │
│  │  • Validation metrics        │   │  • 5 dimension inference     │      │
│  │  • Calibrated predictions    │   │  • Confidence scores         │      │
│  └──────────────────────────────┘   └──────────────────────────────┘      │
│                    │                               │                       │
│                    └───────────────┬───────────────┘                       │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    ALL LEARNER FEATURES                              │    │
│  │  • Mastery Tracking    • Spaced Repetition    • ZPD                 │    │
│  │  • Scaffolding         • Progress Dashboard   • Learning Paths      │    │
│  │  • Adaptive Difficulty • Misconception Detection • Impact Metrics   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Complete Feature Matrix

### Database Tables

| Table | Purpose | Phase | Status | Dependencies |
|-------|---------|-------|--------|--------------|
| `learner_interactions` | Store ALL learner events | 1 | **NEW** | None |
| `learner_sessions` | Session-level aggregates | 1 | **NEW** | None |
| `inverse_profiles` | Computed learner profiles | 1 | **NEW** | learner_interactions |
| `assessments` | Formal assessment records | 3 | **NEW** | learner_interactions |
| `learning_goals` | User-set learning goals | 4 | **NEW** | None |
| `cohort_analytics` | Class-wide aggregates | 5 | **NEW** | inverse_profiles |
| `LearnerSkillState` (Neo4J) | Skill mastery state | - | EXISTS | Enhanced in Phase 2 |

---

### API Endpoints

| Endpoint | Method | Purpose | Phase | Status |
|----------|--------|---------|-------|--------|
| `/api/notebooks/[id]/learner` | GET/POST/DELETE | Mastery tracking | - | EXISTS |
| `/api/notebooks/[id]/interactions` | POST | Log interaction event | 1 | **NEW** |
| `/api/notebooks/[id]/interactions` | GET | Query interaction history | 1 | **NEW** |
| `/api/notebooks/[id]/sessions` | GET/POST | Session management | 1 | **NEW** |
| `/api/notebooks/[id]/sessions/[sid]` | PATCH | End/update session | 1 | **NEW** |
| `/api/notebooks/[id]/learner/validate` | GET | BKT validation metrics | 2 | **NEW** |
| `/api/notebooks/[id]/learner/calibrate` | POST | Trigger BKT recalibration | 2 | **NEW** |
| `/api/notebooks/[id]/profile` | GET | Get inverse profile | 3 | **NEW** |
| `/api/notebooks/[id]/profile/recompute` | POST | Force profile recompute | 3 | **NEW** |
| `/api/notebooks/[id]/profile/insights` | GET | Actionable recommendations | 3 | **NEW** |
| `/api/notebooks/[id]/practice` | GET | Get practice problems | 4 | **NEW** |
| `/api/notebooks/[id]/practice/adaptive` | GET | Adaptive difficulty problems | 4 | **NEW** |
| `/api/notebooks/[id]/assessments` | GET/POST | Formal assessments | 4 | **NEW** |
| `/api/notebooks/[id]/analytics` | GET | Learning impact metrics | 5 | **NEW** |
| `/api/notebooks/[id]/analytics/cohort` | GET | Class-wide analytics | 5 | **NEW** |

---

### React Hooks

| Hook | Purpose | Phase | Status |
|------|---------|-------|--------|
| `useNotebooks()` | Notebook CRUD | - | EXISTS |
| `useSources()` | Source management | - | EXISTS |
| `useGraph()` | Knowledge graph | - | EXISTS |
| `useLearningPath()` | Learning path/curriculum | - | EXISTS |
| `useInteractions()` | Log learner interactions | 1 | **NEW** |
| `useSession()` | Session lifecycle management | 1 | **NEW** |
| `useLearnerState()` | Mastery state (enhanced) | 2 | **NEW** |
| `useSpacedRepetition()` | Due items for review | 2 | **NEW** |
| `useInverseProfile()` | Inverse profile data | 3 | **NEW** |
| `useRecommendations()` | What to learn next | 3 | **NEW** |
| `usePractice()` | Practice session management | 4 | **NEW** |
| `useAssessment()` | Assessment management | 4 | **NEW** |
| `useLearningAnalytics()` | Impact metrics | 5 | **NEW** |

---

### Pages & UI Components

#### Phase 1: Foundation Pages

| Page/Component | Route | Purpose | Phase |
|----------------|-------|---------|-------|
| **Session Provider** | (context) | Wrap app, auto-track sessions | 1 |
| **Interaction Logger** | (utility) | Auto-log UI interactions | 1 |

#### Phase 2: Core Learner State Pages

| Page/Component | Route | Purpose | Phase |
|----------------|-------|---------|-------|
| **Progress Dashboard** | `/notebooks/[id]/progress` | Overall mastery overview | 2 |
| ├─ MasteryOverview | (component) | Mastered/learning/not-started counts | 2 |
| ├─ SkillMasteryList | (component) | List skills with mastery bars | 2 |
| ├─ MasteryChart | (component) | Mastery progression over time | 2 |
| └─ StreakTracker | (component) | Consecutive days practiced | 2 |
| **Review Queue** | `/notebooks/[id]/review` | Spaced repetition due items | 2 |
| ├─ DueSkillsList | (component) | Skills due for review | 2 |
| ├─ ReviewCard | (component) | Individual review item | 2 |
| ├─ QualityRating | (component) | SM-2 quality input (0-5) | 2 |
| └─ ReviewCalendar | (component) | Upcoming review schedule | 2 |
| **BKT Validation** | `/notebooks/[id]/admin/bkt` | Model validation dashboard | 2 |
| ├─ ValidationMetrics | (component) | AUC, calibration, etc. | 2 |
| └─ ParameterTable | (component) | Fitted BKT parameters | 2 |

#### Phase 3: Inverse Profiling Pages

| Page/Component | Route | Purpose | Phase |
|----------------|-------|---------|-------|
| **Learner Profile** | `/notebooks/[id]/profile` | View inferred profile | 3 |
| ├─ KnowledgeStateCard | (component) | Mastery summary + gaps | 3 |
| ├─ CognitiveIndicators | (component) | Expertise level, complexity | 3 |
| ├─ MetacognitiveIndicators | (component) | Calibration, help-seeking | 3 |
| ├─ MotivationalIndicators | (component) | Engagement, persistence | 3 |
| ├─ BehavioralPatterns | (component) | Time preferences, patterns | 3 |
| └─ ProfileConfidence | (component) | Confidence in estimates | 3 |
| **Insights & Recommendations** | `/notebooks/[id]/insights` | Actionable next steps | 3 |
| ├─ ZPDRecommendations | (component) | What to learn next | 3 |
| ├─ MisconceptionAlerts | (component) | Detected misconceptions | 3 |
| ├─ StrengthsWeaknesses | (component) | Strong/weak areas | 3 |
| └─ LearningTips | (component) | Personalized suggestions | 3 |

#### Phase 4: Adaptive Learning Pages

| Page/Component | Route | Purpose | Phase |
|----------------|-------|---------|-------|
| **Practice Mode** | `/notebooks/[id]/practice` | Adaptive practice session | 4 |
| ├─ PracticeQuestion | (component) | Question display + input | 4 |
| ├─ ScaffoldedHints | (component) | Progressive hint reveal | 4 |
| ├─ WorkedExample | (component) | Full solution walkthrough | 4 |
| ├─ FeedbackPanel | (component) | Correct/incorrect feedback | 4 |
| ├─ ConfidenceRating | (component) | Pre-answer confidence | 4 |
| └─ DifficultyIndicator | (component) | Current difficulty level | 4 |
| **Skill Detail** | `/notebooks/[id]/skills/[skillId]` | Deep dive on one skill | 4 |
| ├─ SkillMasteryGauge | (component) | Current P(mastery) | 4 |
| ├─ PrerequisiteTree | (component) | What's needed first | 4 |
| ├─ PracticeHistory | (component) | Past attempts on skill | 4 |
| ├─ ScaffoldLevel | (component) | Current scaffold level | 4 |
| └─ NextReview | (component) | When to review next | 4 |
| **Assessment Mode** | `/notebooks/[id]/assess` | Formal assessment | 4 |
| ├─ AssessmentTimer | (component) | Timed assessment | 4 |
| ├─ AssessmentResults | (component) | Results summary | 4 |
| └─ TransferQuestions | (component) | Novel application | 4 |
| **Learning Path** | `/notebooks/[id]/path` | Personalized path view | 4 |
| ├─ PathVisualization | (component) | Visual learning journey | 4 |
| ├─ SkippedSkills | (component) | Already mastered | 4 |
| ├─ CurrentGoal | (component) | Current target skill | 4 |
| └─ TimeEstimate | (component) | Remaining time estimate | 4 |

#### Phase 5: Analytics & Impact Pages

| Page/Component | Route | Purpose | Phase |
|----------------|-------|---------|-------|
| **Learning Analytics** | `/notebooks/[id]/analytics` | Impact measurement | 5 |
| ├─ LearningGainChart | (component) | Normalized gain over time | 5 |
| ├─ TimeToMastery | (component) | Efficiency metrics | 5 |
| ├─ RetentionCurve | (component) | Retention over time | 5 |
| └─ TransferSuccess | (component) | Novel problem performance | 5 |
| **Educator Dashboard** | `/notebooks/[id]/educator` | Class-wide view | 5 |
| ├─ ClassProgress | (component) | Cohort mastery overview | 5 |
| ├─ StruggleSpots | (component) | Common difficulties | 5 |
| ├─ StudentList | (component) | Individual student status | 5 |
| ├─ MisconceptionReport | (component) | Class-wide misconceptions | 5 |
| └─ InterventionAlerts | (component) | Students needing help | 5 |
| **Research Export** | `/notebooks/[id]/export` | Data export for research | 5 |
| ├─ ExportOptions | (component) | Format selection | 5 |
| └─ AnonymizationSettings | (component) | Privacy controls | 5 |

---

## Feature-to-Infrastructure Mapping

### Learner State Features (from docs)

| Feature | Backend | API | Database | UI | Phase | Foundation Needed |
|---------|---------|-----|----------|-----|-------|-------------------|
| **Mastery Tracking (BKT)** | EXISTS | EXISTS | Neo4J | NEW | 2 | Interactions for validation |
| **Spaced Repetition (SM-2)** | EXISTS | EXISTS | Neo4J | NEW | 2 | Interactions for optimization |
| **Zone of Proximal Development** | EXISTS | EXISTS | Neo4J | NEW | 3 | Profile for personalization |
| **Adaptive Scaffolding** | EXISTS | EXISTS | Neo4J | NEW | 4 | Profile cognitive indicators |
| **Progress Dashboard** | EXISTS | EXISTS | Neo4J | NEW | 2 | Interactions for trends |
| **Personalized Learning Paths** | EXISTS | EXISTS | Neo4J | NEW | 4 | Profile + mastery state |

### Inverse Profiling Features (from whitepaper)

| Feature | Backend | API | Database | UI | Phase | Foundation Needed |
|---------|---------|-----|----------|-----|-------|-------------------|
| **Interaction Logging** | NEW | NEW | Supabase | - | 1 | None (IS foundation) |
| **Session Tracking** | NEW | NEW | Supabase | - | 1 | None (IS foundation) |
| **BKT Validation** | NEW | NEW | - | NEW | 2 | Interactions |
| **BKT Parameter Fitting** | NEW | NEW | Neo4J | NEW | 2 | Interactions |
| **Knowledge State Inference** | NEW | NEW | Supabase | NEW | 3 | BKT + Interactions |
| **Cognitive Indicators** | NEW | NEW | Supabase | NEW | 3 | Interactions |
| **Metacognitive Indicators** | NEW | NEW | Supabase | NEW | 3 | Interactions + Confidence |
| **Motivational Indicators** | NEW | NEW | Supabase | NEW | 3 | Sessions + Interactions |
| **Behavioral Patterns** | NEW | NEW | Supabase | NEW | 3 | Interactions |
| **Misconception Detection** | NEW | NEW | Supabase | NEW | 3 | Error-typed interactions |
| **Adaptive Difficulty** | NEW | NEW | - | NEW | 4 | Cognitive indicators |
| **Personalized Recommendations** | NEW | NEW | - | NEW | 4 | Full profile |
| **Impact Measurement** | NEW | NEW | Supabase | NEW | 5 | Full interaction history |

### Educational Psychology Features

| Feature | Research Basis | Phase | Implementation |
|---------|---------------|-------|----------------|
| **Bloom's Taxonomy Classification** | Anderson & Krathwohl (2001) | - | EXISTS in Skill nodes |
| **Cognitive Load Estimation** | Sweller (1988) | - | EXISTS in Skill nodes |
| **Threshold Concepts** | Meyer & Land (2003) | - | EXISTS in Skill nodes |
| **IRT Difficulty/Discrimination** | Lord (1980) | 4 | EXISTS, needs activation |
| **Expertise Reversal Detection** | Kalyuga et al. (2003) | 4 | Uses cognitive indicators |
| **Desirable Difficulties** | Bjork (1994) | 4 | Uses profile + difficulty |
| **Confidence Calibration** | Dunlosky & Rawson (2012) | 3 | Metacognitive indicators |
| **Help-Seeking Behavior** | Nelson-Le Gall (1981) | 3 | Metacognitive indicators |
| **Goal Orientation** | Dweck (1986) | 3 | Motivational indicators |
| **Self-Regulated Learning** | Zimmerman (2002) | 4 | Full profile + prompts |

---

## Phase-by-Phase Deliverables

### Phase 1: Interaction Capture (Week 1-2)

**Database:**
- [ ] `learner_interactions` table
- [ ] `learner_sessions` table
- [ ] `inverse_profiles` table (schema only)
- [ ] RLS policies

**API:**
- [ ] POST `/api/notebooks/[id]/interactions`
- [ ] GET `/api/notebooks/[id]/interactions`
- [ ] POST `/api/notebooks/[id]/sessions`
- [ ] PATCH `/api/notebooks/[id]/sessions/[sid]`

**Hooks:**
- [ ] `useInteractions()` - log events
- [ ] `useSession()` - session lifecycle

**Components:**
- [ ] `SessionProvider` - context wrapper
- [ ] `InteractionLogger` - auto-logging utility

**Files to Create:**
```
supabase/migrations/XXX_learner_interactions.sql
lib/types/interactions.ts
lib/interactions/logger.ts
lib/interactions/session.ts
app/api/notebooks/[id]/interactions/route.ts
app/api/notebooks/[id]/sessions/route.ts
app/api/notebooks/[id]/sessions/[sessionId]/route.ts
hooks/useInteractions.ts
hooks/useSession.ts
components/providers/SessionProvider.tsx
```

---

### Phase 2: Enhanced BKT & Core UI (Week 3-4)

**Backend:**
- [ ] `EnhancedBKT` class with EM fitting
- [ ] Validation metrics calculation
- [ ] Skill-specific parameter storage

**API:**
- [ ] GET `/api/notebooks/[id]/learner/validate`
- [ ] POST `/api/notebooks/[id]/learner/calibrate`

**Hooks:**
- [ ] `useLearnerState()` - enhanced with confidence
- [ ] `useSpacedRepetition()` - due items

**Pages:**
- [ ] `/notebooks/[id]/progress` - Progress Dashboard
- [ ] `/notebooks/[id]/review` - Review Queue
- [ ] `/notebooks/[id]/admin/bkt` - BKT Validation (admin)

**Components:**
- [ ] `MasteryOverview`
- [ ] `SkillMasteryList`
- [ ] `MasteryChart`
- [ ] `StreakTracker`
- [ ] `DueSkillsList`
- [ ] `ReviewCard`
- [ ] `QualityRating`
- [ ] `ReviewCalendar`
- [ ] `ValidationMetrics`

**Files to Create:**
```
lib/graph/learner-state-enhanced.ts
lib/graph/bkt-validation.ts
app/api/notebooks/[id]/learner/validate/route.ts
app/api/notebooks/[id]/learner/calibrate/route.ts
hooks/useLearnerState.ts
hooks/useSpacedRepetition.ts
app/(dashboard)/notebooks/[id]/progress/page.tsx
app/(dashboard)/notebooks/[id]/review/page.tsx
app/(dashboard)/notebooks/[id]/admin/bkt/page.tsx
components/learner/MasteryOverview.tsx
components/learner/SkillMasteryList.tsx
components/learner/MasteryChart.tsx
components/learner/StreakTracker.tsx
components/learner/DueSkillsList.tsx
components/learner/ReviewCard.tsx
components/learner/QualityRating.tsx
components/learner/ReviewCalendar.tsx
components/admin/ValidationMetrics.tsx
```

---

### Phase 3: Inverse Profiling (Week 5-7)

**Backend:**
- [ ] `InverseProfileEngine` class
- [ ] Knowledge state inference
- [ ] Cognitive indicators inference
- [ ] Metacognitive indicators inference
- [ ] Motivational indicators inference
- [ ] Behavioral pattern extraction
- [ ] Misconception detection

**API:**
- [ ] GET `/api/notebooks/[id]/profile`
- [ ] POST `/api/notebooks/[id]/profile/recompute`
- [ ] GET `/api/notebooks/[id]/profile/insights`

**Hooks:**
- [ ] `useInverseProfile()`
- [ ] `useRecommendations()`

**Pages:**
- [ ] `/notebooks/[id]/profile` - Learner Profile
- [ ] `/notebooks/[id]/insights` - Recommendations

**Components:**
- [ ] `KnowledgeStateCard`
- [ ] `CognitiveIndicators`
- [ ] `MetacognitiveIndicators`
- [ ] `MotivationalIndicators`
- [ ] `BehavioralPatterns`
- [ ] `ProfileConfidence`
- [ ] `ZPDRecommendations`
- [ ] `MisconceptionAlerts`
- [ ] `StrengthsWeaknesses`
- [ ] `LearningTips`

**Files to Create:**
```
lib/inverse-profiling/types.ts
lib/inverse-profiling/engine.ts
lib/inverse-profiling/knowledge-state.ts
lib/inverse-profiling/cognitive.ts
lib/inverse-profiling/metacognitive.ts
lib/inverse-profiling/motivational.ts
lib/inverse-profiling/behavioral.ts
lib/inverse-profiling/misconceptions.ts
app/api/notebooks/[id]/profile/route.ts
app/api/notebooks/[id]/profile/recompute/route.ts
app/api/notebooks/[id]/profile/insights/route.ts
hooks/useInverseProfile.ts
hooks/useRecommendations.ts
app/(dashboard)/notebooks/[id]/profile/page.tsx
app/(dashboard)/notebooks/[id]/insights/page.tsx
components/profile/KnowledgeStateCard.tsx
components/profile/CognitiveIndicators.tsx
components/profile/MetacognitiveIndicators.tsx
components/profile/MotivationalIndicators.tsx
components/profile/BehavioralPatterns.tsx
components/profile/ProfileConfidence.tsx
components/insights/ZPDRecommendations.tsx
components/insights/MisconceptionAlerts.tsx
components/insights/StrengthsWeaknesses.tsx
components/insights/LearningTips.tsx
```

---

### Phase 4: Adaptive Learning (Week 8-10)

**Backend:**
- [ ] Adaptive difficulty selection
- [ ] Scaffolded practice generation
- [ ] Assessment engine
- [ ] Personalized path generation

**API:**
- [ ] GET `/api/notebooks/[id]/practice`
- [ ] GET `/api/notebooks/[id]/practice/adaptive`
- [ ] GET/POST `/api/notebooks/[id]/assessments`

**Hooks:**
- [ ] `usePractice()`
- [ ] `useAssessment()`

**Pages:**
- [ ] `/notebooks/[id]/practice` - Practice Mode
- [ ] `/notebooks/[id]/skills/[skillId]` - Skill Detail
- [ ] `/notebooks/[id]/assess` - Assessment Mode
- [ ] `/notebooks/[id]/path` - Learning Path

**Components:**
- [ ] `PracticeQuestion`
- [ ] `ScaffoldedHints`
- [ ] `WorkedExample`
- [ ] `FeedbackPanel`
- [ ] `ConfidenceRating`
- [ ] `DifficultyIndicator`
- [ ] `SkillMasteryGauge`
- [ ] `PrerequisiteTree`
- [ ] `PracticeHistory`
- [ ] `ScaffoldLevel`
- [ ] `NextReview`
- [ ] `AssessmentTimer`
- [ ] `AssessmentResults`
- [ ] `PathVisualization`

**Files to Create:**
```
lib/practice/adaptive-difficulty.ts
lib/practice/scaffold-generator.ts
lib/practice/assessment-engine.ts
lib/practice/path-generator.ts
app/api/notebooks/[id]/practice/route.ts
app/api/notebooks/[id]/practice/adaptive/route.ts
app/api/notebooks/[id]/assessments/route.ts
hooks/usePractice.ts
hooks/useAssessment.ts
app/(dashboard)/notebooks/[id]/practice/page.tsx
app/(dashboard)/notebooks/[id]/skills/[skillId]/page.tsx
app/(dashboard)/notebooks/[id]/assess/page.tsx
app/(dashboard)/notebooks/[id]/path/page.tsx
components/practice/PracticeQuestion.tsx
components/practice/ScaffoldedHints.tsx
components/practice/WorkedExample.tsx
components/practice/FeedbackPanel.tsx
components/practice/ConfidenceRating.tsx
components/practice/DifficultyIndicator.tsx
components/skills/SkillMasteryGauge.tsx
components/skills/PrerequisiteTree.tsx
components/skills/PracticeHistory.tsx
components/skills/ScaffoldLevel.tsx
components/skills/NextReview.tsx
components/assessment/AssessmentTimer.tsx
components/assessment/AssessmentResults.tsx
components/path/PathVisualization.tsx
```

---

### Phase 5: Analytics & Impact (Week 11-12)

**Backend:**
- [ ] Learning gain calculation
- [ ] Retention measurement
- [ ] Transfer assessment scoring
- [ ] Cohort analytics aggregation

**API:**
- [ ] GET `/api/notebooks/[id]/analytics`
- [ ] GET `/api/notebooks/[id]/analytics/cohort`
- [ ] GET `/api/notebooks/[id]/export`

**Hooks:**
- [ ] `useLearningAnalytics()`

**Pages:**
- [ ] `/notebooks/[id]/analytics` - Learning Analytics
- [ ] `/notebooks/[id]/educator` - Educator Dashboard
- [ ] `/notebooks/[id]/export` - Research Export

**Components:**
- [ ] `LearningGainChart`
- [ ] `TimeToMastery`
- [ ] `RetentionCurve`
- [ ] `TransferSuccess`
- [ ] `ClassProgress`
- [ ] `StruggleSpots`
- [ ] `StudentList`
- [ ] `MisconceptionReport`
- [ ] `InterventionAlerts`
- [ ] `ExportOptions`

**Files to Create:**
```
lib/analytics/learning-gain.ts
lib/analytics/retention.ts
lib/analytics/transfer.ts
lib/analytics/cohort.ts
app/api/notebooks/[id]/analytics/route.ts
app/api/notebooks/[id]/analytics/cohort/route.ts
app/api/notebooks/[id]/export/route.ts
hooks/useLearningAnalytics.ts
app/(dashboard)/notebooks/[id]/analytics/page.tsx
app/(dashboard)/notebooks/[id]/educator/page.tsx
app/(dashboard)/notebooks/[id]/export/page.tsx
components/analytics/LearningGainChart.tsx
components/analytics/TimeToMastery.tsx
components/analytics/RetentionCurve.tsx
components/analytics/TransferSuccess.tsx
components/educator/ClassProgress.tsx
components/educator/StruggleSpots.tsx
components/educator/StudentList.tsx
components/educator/MisconceptionReport.tsx
components/educator/InterventionAlerts.tsx
components/export/ExportOptions.tsx
```

---

## Summary Statistics

| Category | Existing | New | Total |
|----------|----------|-----|-------|
| **Database Tables** | 6 (Supabase) + Neo4J | 5 | 11+ |
| **API Endpoints** | 8 | 16 | 24 |
| **React Hooks** | 4 | 10 | 14 |
| **Pages** | 3 | 12 | 15 |
| **Components** | ~20 | ~50 | ~70 |
| **Lib Files** | ~15 | ~25 | ~40 |

---

## Navigation Structure

```
/notebooks/[id]/
├── (existing pages)
│   ├── page.tsx                    # Main workspace
│   ├── curriculum/                 # Curriculum features
│   ├── for-teachers/               # Teacher tools
│   └── for-students/               # Student tools
│
├── progress/                       # Phase 2 - Progress Dashboard
│   └── page.tsx
│
├── review/                         # Phase 2 - Spaced Repetition
│   └── page.tsx
│
├── profile/                        # Phase 3 - Inverse Profile
│   └── page.tsx
│
├── insights/                       # Phase 3 - Recommendations
│   └── page.tsx
│
├── practice/                       # Phase 4 - Adaptive Practice
│   └── page.tsx
│
├── skills/[skillId]/               # Phase 4 - Skill Deep Dive
│   └── page.tsx
│
├── assess/                         # Phase 4 - Formal Assessment
│   └── page.tsx
│
├── path/                           # Phase 4 - Learning Path
│   └── page.tsx
│
├── analytics/                      # Phase 5 - Impact Metrics
│   └── page.tsx
│
├── educator/                       # Phase 5 - Class Dashboard
│   └── page.tsx
│
├── export/                         # Phase 5 - Research Export
│   └── page.tsx
│
└── admin/
    └── bkt/                        # Phase 2 - BKT Validation
        └── page.tsx
```

---

## Confirmation: Foundation Enables Everything

**YES** - Phase 1-2 (Interaction Capture + Enhanced BKT) provides the foundation for ALL subsequent features:

| Feature | Depends on Interactions | Depends on BKT | Depends on Profile |
|---------|------------------------|----------------|-------------------|
| Progress Dashboard | ✅ For trends | ✅ For mastery | ❌ |
| Spaced Repetition | ✅ For optimization | ✅ For scheduling | ❌ |
| Inverse Profile | ✅ **Required** | ✅ For knowledge | ❌ |
| ZPD Recommendations | ✅ For personalization | ✅ For readiness | ✅ For cognitive |
| Adaptive Scaffolding | ✅ For history | ✅ For level | ✅ For expertise |
| Misconception Detection | ✅ **Required** | ❌ | ❌ |
| Adaptive Difficulty | ✅ For history | ✅ For success rate | ✅ For optimal level |
| Impact Measurement | ✅ **Required** | ✅ For gains | ✅ For analysis |
| Educator Dashboard | ✅ For aggregation | ✅ For class mastery | ✅ For insights |

**Without interaction capture, we cannot:**
- Detect misconceptions (need error patterns)
- Infer cognitive/metacognitive/motivational indicators
- Measure learning impact over time
- Validate that BKT predictions are accurate
- Provide evidence that the system improves learning

The foundation is **essential** and **enables everything else**.
