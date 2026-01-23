# LearnGraph: Educational Psychology Theoretical Foundations

This document describes the educational psychology frameworks and learning theories integrated into LearnGraph, how they work together, and their practical applications for learners and educators.

---

## Overview

LearnGraph integrates **13 research-backed educational psychology frameworks** that work together to create a comprehensive adaptive learning system. These frameworks are divided into two categories:

1. **Content Analysis Features** (9 frameworks) - Applied during source processing to build an educationally-grounded knowledge graph
2. **Inverse Profiling Features** (12 frameworks) - Applied during learning to analyze behavior and personalize the experience

---

## Part 1: Content Analysis Features

These frameworks are applied when processing source materials to build the knowledge graph.

### 1. Bloom's Taxonomy (Revised 2001)
**Researchers:** Anderson & Krathwohl

| Aspect | Details |
|--------|---------|
| **How It's Used** | Every skill is classified into 6 cognitive levels: Remember (L1), Understand (L2), Apply (L3), Analyze (L4), Evaluate (L5), Create (L6) |
| **Value Provided** | Ensures curriculum covers all thinking levels; reveals cognitive complexity of each skill |
| **For Learners** | Understand what "knowing" a skill actually means—is it memorization or synthesis? Plan study approach accordingly |
| **For Educators** | Audit curriculum for cognitive balance; match assessments to intended level; scaffold instruction from lower to higher levels |

### 2. Item Response Theory (IRT) - 3-Parameter Logistic Model
**Researcher:** Lord (1980)

| Aspect | Details |
|--------|---------|
| **How It's Used** | Each skill receives three psychometric parameters: difficulty (b: -3 to +3), discrimination (a: 0.5-2.5), guessing probability (c: 0-0.5) |
| **Value Provided** | Psychometrically calibrated difficulty ratings; predicts learner success probability at any ability level |
| **For Learners** | Questions matched to your ability—challenging but achievable; builds confidence through appropriate challenge |
| **For Educators** | Create assessments with known psychometric properties; identify which questions best differentiate student ability |

### 3. Threshold Concepts
**Researchers:** Meyer & Land (2003)

| Aspect | Details |
|--------|---------|
| **How It's Used** | AI identifies transformative, irreversible concepts that unlock entire domains; tracks troublesome aspects and what domains they unlock |
| **Value Provided** | Highlights "gateway" knowledge worth extra investment; identifies where productive struggle is expected |
| **For Learners** | Know which concepts deserve extra time and effort; understand why certain topics feel fundamentally harder |
| **For Educators** | Focus limited class time on high-leverage concepts; design intensive support for threshold topics; anticipate struggle points |

### 4. Cognitive Load Theory
**Researcher:** Sweller (1988)

| Aspect | Details |
|--------|---------|
| **How It's Used** | Each skill rated for cognitive load (low/medium/high), chunks required (2-7 based on Miller's Law), and element interactivity level |
| **Value Provided** | Prevents working memory overload; optimizes learning sequence and session design |
| **For Learners** | Content broken into digestible pieces; sessions designed to avoid mental exhaustion |
| **For Educators** | Know when to slow down or break up content; design lessons within cognitive limits; sequence from simple to complex |

### 5. Instructional Scaffolding (Gradual Release of Responsibility)
**Researchers:** Vygotsky, Wood, Bruner, Ross (1976)

| Aspect | Details |
|--------|---------|
| **How It's Used** | 4 support levels generated per skill: L1 (full worked examples), L2 (partial solutions), L3 (hints on request), L4 (independent practice) |
| **Value Provided** | Ready-made differentiated materials at every support level; systematic independence building |
| **For Learners** | Receive appropriate support—enough to succeed, not so much that you don't learn |
| **For Educators** | Have differentiated materials ready; know exactly what support to provide at each stage |

### 6. Mastery Learning
**Researcher:** Bloom (1968)

| Aspect | Details |
|--------|---------|
| **How It's Used** | Mastery thresholds set (80% for standard skills, 90% for threshold concepts); assessment types suggested per skill (formative, summative, diagnostic, performance, peer) |
| **Value Provided** | Clear, research-based definition of "learned"; formative assessment alignment |
| **For Learners** | Know exactly what mastery looks like for each skill; clear targets to work toward |
| **For Educators** | Set appropriate mastery criteria; design assessments aligned to mastery; know when students are truly ready to advance |

### 7. Misconception Detection & Remediation
**Research Base:** Cognitive science error analysis

| Aspect | Details |
|--------|---------|
| **How It's Used** | AI extracts common misconceptions for each skill during content processing; stores troublesome aspects |
| **Value Provided** | Proactive error prevention; enables targeted remediation before errors happen |
| **For Learners** | Learn about typical mistakes before making them; understand why concepts are commonly confused |
| **For Educators** | Anticipate student errors; design instruction addressing misconceptions proactively; track remediation effectiveness |

### 8. Spaced Repetition Intervals
**Researcher:** Wozniak (1987), based on Ebbinghaus Forgetting Curve (1885)

| Aspect | Details |
|--------|---------|
| **How It's Used** | Default spaced intervals assigned (1, 3, 7, 14, 30, 60 days) based on forgetting curve research |
| **Value Provided** | Optimizes long-term retention; prevents knowledge decay |
| **For Learners** | Review reminders at scientifically optimal times; study efficiently instead of cramming |
| **For Educators** | Build review cycles into curriculum; predict when class review is needed; ensure lasting learning |

### 9. Prerequisite Relationship Mapping
**Research Base:** Learning progression research

| Aspect | Details |
|--------|---------|
| **How It's Used** | Skills connected with required/recommended/helpful strength; learning paths generated automatically |
| **Value Provided** | Ensures proper learning sequence; identifies readiness; prevents frustration from missing foundations |
| **For Learners** | Know what to learn first and why; understand the learning journey ahead |
| **For Educators** | Diagnose prerequisite gaps quickly; design remediation paths; ensure curriculum coherence |

---

## Part 2: Inverse Profiling Features

These frameworks are applied to analyze learner behavior and adapt the experience in real-time.

### 1. Bayesian Knowledge Tracing (BKT)
**Researchers:** Corbett & Anderson (1995)

| Aspect | Details |
|--------|---------|
| **How It's Used** | Tracks P(Mastery) 0-1 per skill; updates after every attempt using 4 parameters: pL0 (initial knowledge), pT (learning rate), pS (slip probability), pG (guess probability) |
| **Value Provided** | Real probabilistic mastery—not just "% correct" but "probability you actually know this" |
| **For Learners** | See true mastery probability; know when you genuinely understand vs. got lucky; trust the "mastered" label |
| **For Educators** | Precise per-student per-skill mastery data; data-driven grouping; know exactly when students are ready to advance |

### 2. Zone of Proximal Development (ZPD)
**Researcher:** Vygotsky (1978)

| Aspect | Details |
|--------|---------|
| **How It's Used** | Calculates readiness score (0-1) from prerequisite mastery; recommends "next best" skills that are challenging but achievable with support |
| **Value Provided** | Always working in the productive struggle zone—not too easy (boring), not too hard (frustrating) |
| **For Learners** | Never waste time on skills you're not ready for or already know; optimal challenge level always |
| **For Educators** | Know exactly what each student is ready for; automated personalized learning paths; efficient use of instruction time |

### 3. SM-2 Spaced Repetition Algorithm
**Researcher:** Wozniak (1987)

| Aspect | Details |
|--------|---------|
| **How It's Used** | Tracks personal ease factor (min 1.3) and intervals; adapts review schedule based on response quality; calculates next review date |
| **Value Provided** | Personalized retention optimization—reviews scheduled for YOUR memory, not average memory |
| **For Learners** | Review notifications when YOU specifically need them; efficient retention with minimal study time |
| **For Educators** | See which students need review and when; predict knowledge decay; schedule timely class reviews |

### 4. Dynamic Scaffold Level Adaptation
**Research Base:** Scaffolding fading research

| Aspect | Details |
|--------|---------|
| **How It's Used** | Automatically adjusts support level (L1→L4) based on P(Mastery): <0.4→L1, 0.4-0.6→L2, 0.6-0.8→L3, ≥0.8→L4 |
| **Value Provided** | Right amount of help at all times—more when struggling, less as you improve |
| **For Learners** | Support fades naturally as you master content; builds independence without abandonment |
| **For Educators** | Automated differentiation; see which students need more scaffolding; know when to step back |

### 5. Metacognitive Calibration
**Researcher:** Zimmerman (2002)

| Aspect | Details |
|--------|---------|
| **How It's Used** | Compares confidence predictions to actual performance; calculates calibration accuracy (-1 to +1 via Pearson correlation) |
| **Value Provided** | Reveals overconfidence (thinks they know but doesn't) and underconfidence (knows but doubts themselves) |
| **For Learners** | Become better at knowing what you know; identify blind spots in self-assessment |
| **For Educators** | Find students who think they're ready but aren't; discover hidden capability in underconfident students |

### 6. Help-Seeking Pattern Analysis
**Research Base:** Self-regulated learning research

| Aspect | Details |
|--------|---------|
| **How It's Used** | Tracks hint request rates; classifies patterns as: avoidant (<10%), appropriate (20-40%), excessive (>50%) |
| **Value Provided** | Identifies unhealthy learning patterns that block growth |
| **For Learners** | Feedback on your study habits—are you asking for help appropriately? |
| **For Educators** | Find students struggling silently (avoidant) or over-relying on hints (excessive); teach healthy help-seeking |

### 7. Goal Orientation Detection
**Researchers:** Dweck (2006), Nicholls (1984)

| Aspect | Details |
|--------|---------|
| **How It's Used** | Infers orientation from behavior: mastery (focused on learning), performance (focused on appearing competent), avoidance (focused on not failing) |
| **Value Provided** | Adapts messaging, challenge level, and encouragement to motivation style |
| **For Learners** | Understand your own motivation patterns; receive appropriately framed encouragement |
| **For Educators** | Identify avoidance-oriented students needing psychological safety; adapt feedback style to each student's motivation |

### 8. Working Memory Capacity Estimation
**Research Base:** Cognitive Load Theory, Miller's Law

| Aspect | Details |
|--------|---------|
| **How It's Used** | Infers cognitive capacity from response times, error patterns, and hint usage patterns |
| **Value Provided** | Adapts content complexity to individual cognitive limits |
| **For Learners** | Content paced to your capacity; avoid overwhelm during complex material |
| **For Educators** | Identify students needing simpler chunking; differentiate instruction by cognitive load tolerance |

### 9. Persistence & Engagement Tracking
**Research Base:** Engagement and dropout prediction research

| Aspect | Details |
|--------|---------|
| **How It's Used** | Monitors consecutive failures, session duration, skill avoidance patterns |
| **Value Provided** | Early detection of frustration and disengagement before dropout occurs |
| **For Learners** | Get encouragement and easier content when struggling; interventions before you give up |
| **For Educators** | Early warning system for at-risk students; know exactly when to intervene; track engagement trends over time |

### 10. Error Pattern Analysis
**Research Base:** Diagnostic assessment research

| Aspect | Details |
|--------|---------|
| **How It's Used** | Tracks error types across attempts; matches against known misconception patterns |
| **Value Provided** | Distinguishes systematic errors (misconceptions) from random mistakes; targets root causes |
| **For Learners** | Understand WHY you're making specific errors; get targeted help for root causes |
| **For Educators** | See which misconceptions are prevalent in class; design targeted reteaching; measure remediation success |

### 11. Confidence-Performance Gap Detection
**Research Base:** Overconfidence effect literature

| Aspect | Details |
|--------|---------|
| **How It's Used** | Flags overconfidence (confidence > performance + 40%) and underconfidence (performance > confidence + 40%) in real-time |
| **Value Provided** | Immediate detection of dangerous miscalibration that impedes learning |
| **For Learners** | Know when you're fooling yourself; build appropriate self-trust |
| **For Educators** | Catch students about to fail who think they'll pass; find hidden talent in self-doubting students |

### 12. Learning Velocity Analysis
**Research Base:** Learning analytics research

| Aspect | Details |
|--------|---------|
| **How It's Used** | Tracks rate of mastery acquisition across skills and time; computes domain-specific velocities |
| **Value Provided** | Predicts time-to-mastery; identifies who's accelerating or struggling |
| **For Learners** | Know how long skills will realistically take YOU; set achievable goals |
| **For Educators** | Predict course completion; identify students needing acceleration or extra support; plan resources |

---

## The Complete Adaptive Learning Loop

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     CONTENT ANALYSIS (Extraction)                        │
│  Source Material → Bloom Levels, IRT Parameters, Threshold Concepts,    │
│                    Cognitive Load, Scaffolding, Misconceptions          │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         KNOWLEDGE GRAPH                                  │
│  Skills + Prerequisites + Educational Metadata                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      LEARNER INTERACTION                                 │
│  Practice Attempts, Confidence Ratings, Hint Requests, Response Times   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    INVERSE PROFILING (Analytics)                         │
│  BKT Mastery, ZPD Readiness, Metacognition, Goal Orientation,          │
│  Help-Seeking, Working Memory, Persistence, Error Patterns             │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      ADAPTIVE RESPONSE                                   │
│  Personalized: Content Selection, Scaffold Level, Review Timing,        │
│               Interventions, Encouragement, Challenge Level             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Summary Comparison

| Aspect | Content Analysis Features | Inverse Profiling Features |
|:-------|:-------------------------|:--------------------------|
| **When Applied** | During source processing/extraction | During learner practice sessions |
| **Data Source** | Source documents and curriculum materials | Learner interactions and responses |
| **Output** | Enriched knowledge graph with educational metadata | Learner profile with cognitive/metacognitive/motivational indicators |
| **Update Frequency** | Once per extraction (can re-extract) | Real-time after every interaction |
| **Primary Benefit** | Quality curriculum with research-grounded structure | Personalized adaptation to individual learner |
| **Framework Count** | 9 frameworks | 12 frameworks |

---

## References

- Anderson, L. W., & Krathwohl, D. R. (2001). A taxonomy for learning, teaching, and assessing.
- Bloom, B. S. (1968). Learning for mastery.
- Corbett, A. T., & Anderson, J. R. (1995). Knowledge tracing: Modeling the acquisition of procedural knowledge.
- Dweck, C. S. (2006). Mindset: The new psychology of success.
- Ebbinghaus, H. (1885). Memory: A contribution to experimental psychology.
- Lord, F. M. (1980). Applications of item response theory to practical testing problems.
- Meyer, J., & Land, R. (2003). Threshold concepts and troublesome knowledge.
- Sweller, J. (1988). Cognitive load during problem solving.
- Vygotsky, L. S. (1978). Mind in society.
- Wood, D., Bruner, J. S., & Ross, G. (1976). The role of tutoring in problem solving.
- Wozniak, P. A. (1987). SuperMemo algorithm SM-2.
- Zimmerman, B. J. (2002). Becoming a self-regulated learner.
