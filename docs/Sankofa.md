# Sankofa - LearnGraph Capabilities

> "Sankofa" (Akan): "Go back and get it" - the wisdom of learning from the past to move forward.

---

## Documentation

| Document | Description |
|----------|-------------|
| [Content-Only Features](./Content-Only-Features.md) | 10 features that work without learner tracking (curriculum, prerequisites, IRT, etc.) |
| [For Teachers](./For-Teachers.md) | 6 AI-powered teaching tools (lesson plans, questions, study guides) |
| [For Students](./For-Students.md) | 6 AI-powered learning tools (practice questions, explanations, misconceptions) |
| [Learner State Features](./Learner-State-Features.md) | Progress tracking features - BKT, SM-2, ZPD (backend ready, UI TBD) |
| [Neo4J Architecture](./Neo4J_Educational_Architecture.md) | Technical implementation details |

---

## Feature Overview

### Content-Only Features (10)
*Work immediately after extracting a knowledge graph*

| Feature | Educational Psychology |
|---------|------------------------|
| Curriculum Overview | Bloom's Taxonomy (Anderson & Krathwohl) |
| Prerequisite Visualization | Learning Hierarchies (Gagné) |
| Learning Path Generation | Instructional Sequencing (Reigeluth) |
| Threshold Concept Identification | Threshold Concepts (Meyer & Land) |
| Cognitive Load Estimation | Cognitive Load Theory (Sweller) |
| Assessment Suggestions | Constructive Alignment (Biggs) |
| Scaffolding Guidance | Scaffolding (Vygotsky, Bruner) |
| Common Misconceptions | Conceptual Change (Posner) |
| Transfer Domains | Transfer of Learning (Perkins & Salomon) |
| IRT-based Difficulty | Item Response Theory (Lord) |

### AI-Powered Tools (6)
*Generate materials for teachers and students*

| Feature | For Teachers | For Students |
|---------|--------------|--------------|
| **Study Guide Generator** | See what students need to know | Structured notes for each skill |
| **Practice Question Generator** | Create assessments at specific Bloom levels | Self-test with IRT-calibrated difficulty |
| **Lesson Plan Generator** | Objectives, activities, timing based on cognitive load | — |
| **Concept Explainer** | Explanations at different levels for differentiation | "Explain like I'm 5" to expert level |
| **Misconception Addresser** | Know what to proactively teach against | Avoid common pitfalls |
| **Prerequisite Checker** | Identify gaps before teaching | "Before learning X, review Y" |

### Learner State Features (6)
*Require progress tracking - backend ready, UI TBD*

| Feature | Educational Psychology |
|---------|------------------------|
| Mastery Tracking | Bayesian Knowledge Tracing |
| Spaced Repetition | SM-2 Algorithm |
| Zone of Proximal Development | Vygotsky's ZPD |
| Adaptive Scaffolding | Gradual Release of Responsibility |
| Progress Dashboard | Mastery Learning (Bloom) |
| Personalized Learning Paths | Prerequisite-based sequencing |

---

## Summary Checklist

### Content Analysis (Ready Now)
1. ✅ Visualize skill prerequisites
2. ✅ Generate learning paths to any goal
3. ✅ Identify threshold concepts
4. ✅ Estimate cognitive load
5. ✅ Suggest Bloom-aligned assessments
6. ✅ Show scaffolding guidance
7. ✅ Warn about common misconceptions
8. ✅ Highlight transfer opportunities
9. ✅ IRT-calibrated difficulty for question banks
10. ✅ Full curriculum overview by cognitive level

### AI-Powered Tools (Ready Now)
11. ✅ Generate study guides
12. ✅ Generate practice questions
13. ✅ Generate lesson plans
14. ✅ Explain concepts at multiple levels
15. ✅ Address common misconceptions
16. ✅ Check prerequisites with diagnostics

### Learner Tracking (Backend Ready, UI TBD)
17. ✅ Track individual mastery (BKT)
18. ✅ Schedule spaced repetition reviews (SM-2)
19. ✅ Calculate true ZPD based on mastery
20. ✅ Adapt scaffolding automatically
21. ✅ Personalize learning paths (skip mastered)
22. ✅ Dashboard with progress metrics

---

## Quick Start

### 1. Extract Knowledge Graph
```bash
POST /api/notebooks/[id]/graph
{ "rebuild": true }
```

### 2. Get Learning Path Overview
```bash
GET /api/notebooks/[id]/graph/learning-path?action=overview
```

### 3. Start Tracking Progress
```bash
POST /api/notebooks/[id]/learner
{
  "skillId": "skill_xxx",
  "isCorrect": true
}
```

### 4. Check What to Learn Next (ZPD)
```bash
GET /api/notebooks/[id]/learner?action=zpd
```

### 5. Get Skills Due for Review
```bash
GET /api/notebooks/[id]/learner?action=due
```
