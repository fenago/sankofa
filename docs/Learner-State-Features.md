# Learner State Features

> Personalized learning powered by progress tracking.

## Overview

These features require tracking individual learner progress over time. By recording practice attempts and measuring mastery, LearnGraph can provide truly personalized learning experiences.

**Status: Backend implemented, UI components TBD**

---

## Feature Status

| Feature | Backend | API | UI | Status |
|---------|---------|-----|-----|--------|
| Mastery Tracking (BKT) | Done | Done | TBD | Backend Ready |
| Spaced Repetition (SM-2) | Done | Done | TBD | Backend Ready |
| Zone of Proximal Development | Done | Done | TBD | Backend Ready |
| Adaptive Scaffolding | Done | Done | TBD | Backend Ready |
| Progress Dashboard | Done | Done | TBD | Backend Ready |
| Personalized Learning Paths | Done | Done | TBD | Backend Ready |

---

## 1. Mastery Tracking (Bayesian Knowledge Tracing)

### Status: TBD - Backend implemented, needs UI

### What It Will Do
Track probabilistic mastery of each skill using Bayesian Knowledge Tracing (BKT). Instead of simple "correct/incorrect" counting, BKT estimates the true probability that a learner has mastered a skill.

### How It Will Work

```
Student answers question about Skill X
        │
        ▼
┌─────────────────────────┐
│ BKT Algorithm Updates   │
│ P(mastery) based on:    │
│ - Was answer correct?   │
│ - Could they have       │
│   guessed? (pG)         │
│ - Could they have       │
│   slipped? (pS)         │
│ - Learning rate (pT)    │
└───────────┬─────────────┘
            │
            ▼
    New P(mastery) estimate
    e.g., 0.32 → 0.45
```

### The Science
**Bayesian Knowledge Tracing** models learning as a hidden Markov process:
- **pL0** (0.0): Prior probability of already knowing the skill
- **pT** (0.1): Probability of learning from each attempt
- **pS** (0.1): Probability of "slipping" (wrong despite knowing)
- **pG** (0.2): Probability of guessing correctly

### User Experience (Planned)
- See mastery percentage for each skill
- Visual progress indicators (not started → learning → mastered)
- Skill mastery automatically updates after each practice attempt

### API (Implemented)
```bash
# Record a practice attempt
POST /api/notebooks/[id]/learner
{
  "skillId": "skill_xxx",
  "isCorrect": true
}

# Response includes updated mastery
{
  "updatedState": {
    "pMastery": 0.65,
    "masteryStatus": "learning"
  }
}
```

---

## 2. Spaced Repetition (SM-2 Algorithm)

### Status: TBD - Backend implemented, needs UI

### What It Will Do
Schedule optimal review times for each skill based on the SM-2 algorithm (used by Anki, SuperMemo). Reviews are timed to occur just before you would forget, maximizing long-term retention with minimal study time.

### How It Will Work

```
Student completes review of Skill X
        │
        ▼
┌─────────────────────────┐
│ Rate quality (0-5):     │
│ 0 = Complete blackout   │
│ 3 = Correct with effort │
│ 5 = Perfect recall      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ SM-2 Algorithm:         │
│ - Adjust ease factor    │
│ - Calculate interval    │
│ - Set next review date  │
└───────────┬─────────────┘
            │
            ▼
    Next review in X days
    e.g., 1 → 6 → 15 → 35 days
```

### The Science
The **SM-2 algorithm** is based on the forgetting curve research:
- **Ease Factor**: How easy this skill is for this learner (min 1.3)
- **Interval**: Days until next review (grows exponentially)
- **Repetitions**: Consecutive successful reviews

Formula:
```
if quality < 3:
    reset (start over)
else:
    interval = interval × easeFactor
    easeFactor += 0.1 - (5-quality) × 0.08
```

### User Experience (Planned)
- Daily "Review Due" list showing skills ready for review
- Notification when reviews are available
- Review session interface with quality rating
- Calendar view of upcoming reviews

### API (Implemented)
```bash
# Get skills due for review
GET /api/notebooks/[id]/learner?action=due&limit=10

# Response
{
  "dueSkills": [
    {
      "skillId": "skill_xxx",
      "skillName": "Derivatives",
      "pMastery": 0.85,
      "daysSinceReview": 7,
      "nextReviewAt": 1737504000000
    }
  ]
}
```

---

## 3. Zone of Proximal Development (ZPD)

### Status: TBD - Backend implemented, needs UI

### What It Will Do
Recommend what to learn next based on what you've already mastered. Skills in your ZPD have all required prerequisites mastered—they're challenging but achievable.

### How It Will Work

```
┌─────────────────────────┐
│ Check each skill:       │
│                         │
│ All REQUIRED prereqs    │
│ mastered?               │
│    │                    │
│    ├─ No → Not ready    │
│    │                    │
│    └─ Yes → In ZPD!     │
│         │               │
│         ▼               │
│    Calculate readiness: │
│    - Required: 60%      │
│    - Recommended: 30%   │
│    - Helpful: 10%       │
└───────────┬─────────────┘
            │
            ▼
    Ranked list of "Learn Next"
```

### The Science
**Vygotsky's Zone of Proximal Development** is the sweet spot between:
- **Too easy**: Already mastered (boredom)
- **ZPD**: Can learn with appropriate support (growth)
- **Too hard**: Prerequisites not met (frustration)

### User Experience (Planned)
- "What to Learn Next" recommendations
- Skills ranked by readiness score
- Visual indicator of ZPD on skill graph
- Explanation of why each skill is recommended

### API (Implemented)
```bash
# Get ZPD skills (using actual mastery from learner state)
GET /api/notebooks/[id]/learner?action=zpd

# Response
{
  "zpdSkills": [
    {
      "id": "skill_xxx",
      "name": "Chain Rule",
      "readinessScore": 0.92,
      "missingPrereqs": []
    }
  ],
  "masteredCount": 8
}
```

---

## 4. Adaptive Scaffolding

### Status: TBD - Backend implemented, needs UI

### What It Will Do
Automatically adjust the level of support provided based on current mastery. As you improve, scaffolding fades—moving from worked examples to independent practice.

### How It Will Work

```
Current P(mastery) determines scaffold level:

┌────────────┬─────────────────────────────┐
│ P(mastery) │ Scaffold Level              │
├────────────┼─────────────────────────────┤
│ < 0.30     │ Level 1: Full worked        │
│            │          examples           │
├────────────┼─────────────────────────────┤
│ 0.30-0.50  │ Level 2: Partial solutions  │
│            │          (fill in blanks)   │
├────────────┼─────────────────────────────┤
│ 0.50-0.70  │ Level 3: Hints available    │
│            │          on request         │
├────────────┼─────────────────────────────┤
│ > 0.70     │ Level 4: Independent        │
│            │          practice           │
└────────────┴─────────────────────────────┘
```

### The Science
Based on **Vygotsky's scaffolding** and **gradual release of responsibility**:
- Too much help → learned helplessness
- Too little help → frustration and giving up
- Just right → optimal learning

### User Experience (Planned)
- Practice problems automatically adapt to your level
- Level 1: See full solution, then similar problem
- Level 2: Solution with blanks to fill
- Level 3: Try first, hint button available
- Level 4: Solve independently, check answer

### API (Implemented)
```bash
# Scaffold level returned with each state update
POST /api/notebooks/[id]/learner
{
  "skillId": "skill_xxx",
  "isCorrect": true
}

# Response includes scaffold level
{
  "updatedState": {
    "pMastery": 0.55,
    "currentScaffoldLevel": 3
  }
}
```

---

## 5. Progress Dashboard

### Status: TBD - Backend implemented, needs UI

### What It Will Do
Provide an overview of learning progress across all skills in a notebook: how many mastered, how many in progress, and overall mastery percentage.

### How It Will Work

```
┌─────────────────────────────────────┐
│         Progress Dashboard          │
├─────────────────────────────────────┤
│                                     │
│  Mastered:     ████████░░░  8/25    │
│  Learning:     █████░░░░░░  5/25    │
│  Not Started:  ████████████ 12/25   │
│                                     │
│  Average Mastery: 42%               │
│  Due for Review:  3 skills          │
│                                     │
│  [View Details] [Start Review]      │
│                                     │
└─────────────────────────────────────┘
```

### User Experience (Planned)
- Visual progress bars/charts
- Mastered/learning/not-started breakdown
- Average mastery across all skills
- Count of skills due for review
- Time spent learning (if tracked)
- Streak tracking (consecutive days)

### API (Implemented)
```bash
GET /api/notebooks/[id]/learner?action=progress

# Response
{
  "progress": {
    "totalSkills": 25,
    "masteredSkills": 8,
    "learningSkills": 5,
    "notStartedSkills": 12,
    "averageMastery": 0.42,
    "skillsDueForReview": 3
  }
}
```

---

## 6. Personalized Learning Paths

### Status: TBD - Backend implemented, needs UI

### What It Will Do
Generate learning paths that skip already-mastered skills, creating a personalized route to any goal.

### How It Will Work

```
Standard Path to "Advanced Topic":
  Skill A → Skill B → Skill C → Skill D → Goal

Personalized Path (Skill A, B already mastered):
  Skill C → Skill D → Goal

Time saved: 40%
```

### The Science
Combines:
- **Prerequisite analysis** (what's required)
- **Mastery data** (what's already known)
- **Topological sorting** (optimal ordering)

### User Experience (Planned)
- Select a goal skill
- See personalized path (grayed out = already mastered)
- Estimated time based on remaining skills
- "Resume Learning" button to continue where you left off

### API (Implemented)
```bash
POST /api/notebooks/[id]/graph/learning-path
{
  "goalSkillId": "skill_xxx",
  "useLearnerState": true
}

# Response filters out mastered skills
{
  "path": [
    { "id": "skill_c", "name": "Skill C", "estimatedMinutes": 30 },
    { "id": "skill_d", "name": "Skill D", "estimatedMinutes": 45 },
    { "id": "skill_xxx", "name": "Goal", "estimatedMinutes": 60 }
  ],
  "totalMinutes": 135,
  "skippedMasteredCount": 2
}
```

---

## Implementation Priority

### Phase 1: Core Loop
1. **Progress Dashboard** - See overall progress
2. **Mastery Tracking** - Record practice, update mastery
3. **Spaced Repetition** - Review due list

### Phase 2: Personalization
4. **ZPD Recommendations** - What to learn next
5. **Personalized Paths** - Skip mastered skills

### Phase 3: Adaptation
6. **Adaptive Scaffolding** - Dynamic support levels

---

## Technical Notes

### Data Storage
Learner state is stored in Neo4J as `LearnerSkillState` nodes with `TRACKS` relationships to `Skill` nodes.

### Privacy
- Learner data is isolated by user ID
- No cross-user data sharing
- Delete endpoint available to reset all progress

### Performance
- BKT and SM-2 calculations happen server-side
- State updates are atomic
- Indexes on `learnerId` and `skillId` for fast queries

---

## See Also

- [For Teachers](./For-Teachers.md) – Teacher tools (content-only features)
- [For Students](./For-Students.md) – Student tools (content-only features)
- [Neo4J Architecture](./Neo4J_Educational_Architecture.md) – Technical implementation details
