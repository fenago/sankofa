# LearnGraph Requirements Checklist

## Executive Summary

Transform HyperbookLM into LearnGraph: an AI-powered learning platform that differentiates from NotebookLM through **structured, research-backed learning pathways** with measurable outcomes. This plan addresses two core personas—**Learners** (students teaching themselves) and **Educators** (teachers using the platform for instruction)—while integrating Neo4j Graph RAG for knowledge representation.

---

## Phase 1: Core Learning Engine (Foundation)

### 1.1 Neo4j Graph RAG Integration

- [ ] Add Neo4j driver to Next.js backend
- [ ] Create graph schema:
  - [ ] `(Concept)-[:PREREQUISITE_OF]->(Concept)`
  - [ ] `(Concept)-[:RELATED_TO]->(Concept)`
  - [ ] `(Source)-[:TEACHES]->(Concept)`
  - [ ] `(Learner)-[:MASTERED {confidence: float, timestamp}]->(Concept)`
  - [ ] `(Learner)-[:STRUGGLING_WITH {attempts: int}]->(Concept)`
- [ ] Create `lib/neo4j.ts` - Neo4j connection and utilities
- [ ] Create `/api/graph/ingest` - Extract concepts from sources into graph
- [ ] Create `/api/graph/query` - Query knowledge graph
- [ ] Create `/api/graph/learner-state` - Get/update learner knowledge state
- [ ] Create `components/KnowledgeGraph.tsx` - Enhanced React Flow visualization

### 1.2 Concept Extraction Pipeline

- [ ] Use GPT-4o-mini to analyze sources and extract:
  - [ ] Core concepts with definitions
  - [ ] Prerequisite relationships (what must be known first)
  - [ ] Bloom's Taxonomy level for each concept
  - [ ] Estimated cognitive load (1-10 scale)
- [ ] Store concepts in Neo4j with embeddings for semantic search

**Research Basis**: Cognitive Load Theory (Sweller) - managing intrinsic, extraneous, and germane load

---

## Phase 2: Learner Persona Features

### 2.1 Adaptive Learning Path (ZPD Implementation)

- [ ] Track learner's current knowledge state in Neo4j
- [ ] Implement ZPD algorithm:
  ```
  ZPD = concepts where:
    - All prerequisites are MASTERED (confidence > 0.7)
    - Concept itself is NOT mastered
    - Cognitive load is manageable given current session
  ```
- [ ] Present next-best concepts with scaffolding
- [ ] Implement scaffolding fading as mastery increases
- [ ] Create `components/LearningPath.tsx`
  - [ ] Visual pathway showing mastered → current → upcoming concepts
  - [ ] Color coding: Green (mastered), Yellow (in ZPD), Gray (locked)

**Metrics to Track**:
- [ ] Time in ZPD vs. frustration/boredom zones
- [ ] Concept mastery velocity
- [ ] Prerequisite chain completion rate

### 2.2 Spaced Repetition System (SRS)

- [ ] Implement SM-2 algorithm variant for concept review scheduling
- [ ] Store review history: `(Learner)-[:REVIEWED {ease, interval, next_review}]->(Concept)`
- [ ] Daily review queue generation
- [ ] Integration with chat for review quizzes
- [ ] Create `components/ReviewQueue.tsx`
  - [ ] Today's review count
  - [ ] Streak tracking
  - [ ] Difficulty adjustment controls

**Research Basis**: Ebbinghaus forgetting curve, Pimsleur graduated intervals

**Metrics to Track**:
- [ ] Retention rate at intervals (1 day, 7 days, 30 days)
- [ ] Review session completion rate
- [ ] Average ease factor trends

### 2.3 Active Recall Assessments

- [ ] Auto-generate questions at multiple Bloom's levels:
  - [ ] **Remember**: Definition recall, term matching
  - [ ] **Understand**: Explain in own words, summarize
  - [ ] **Apply**: Solve novel problems using concepts
  - [ ] **Analyze**: Compare/contrast, identify patterns
  - [ ] **Evaluate**: Critique, justify decisions
  - [ ] **Create**: Design solutions, synthesize ideas
- [ ] Store question bank in Neo4j linked to concepts
- [ ] Adaptive difficulty based on learner performance
- [ ] Create `/api/assessment/generate`
- [ ] Create `/api/assessment/submit`
- [ ] Create `components/Assessment.tsx`

**Metrics to Track**:
- [ ] Accuracy by Bloom's level
- [ ] Time-to-answer patterns
- [ ] Concept-specific performance

### 2.4 Study Guide Generator

- [ ] Analyze learner's Neo4j state to identify:
  - [ ] Weak concepts (low confidence or high error rate)
  - [ ] Missing prerequisites
  - [ ] Upcoming assessment topics
- [ ] Generate targeted study guide with:
  - [ ] Key concepts to review
  - [ ] Practice problems
  - [ ] Recommended source re-reads
  - [ ] Estimated study time
- [ ] Create `/api/study-guide/generate`
- [ ] Create `components/StudyGuide.tsx`

### 2.5 Explainer Modes

- [ ] Add chat mode selector:
  - [ ] **ELI5**: Simple analogies, concrete examples
  - [ ] **Peer**: Assumes foundational knowledge
  - [ ] **Expert**: Technical depth, nuance
  - [ ] **Socratic**: Questions to guide discovery
- [ ] Modify `/api/chat` to include mode in system prompt
- [ ] Track which mode leads to better comprehension

**Research Basis**: Scaffolding theory (Vygotsky), differentiated instruction

---

## Phase 3: Educator Persona Features

### 3.1 Class Management

- [ ] Implement data model:
  ```
  (Educator)-[:TEACHES]->(Class)
  (Class)-[:USES]->(SourceCollection)
  (Learner)-[:ENROLLED_IN]->(Class)
  ```
- [ ] Class creation with invite codes
- [ ] Bulk source assignment to classes
- [ ] Aggregate analytics dashboard
- [ ] Create `components/educator/ClassManager.tsx`
- [ ] Create `components/educator/StudentRoster.tsx`

### 3.2 Learning Analytics Dashboard

- [ ] Real-time metrics:
  - [ ] Class-wide concept mastery heatmap
  - [ ] Individual student progress timelines
  - [ ] Common misconception detection
  - [ ] Time-on-task analytics
  - [ ] Engagement patterns (session frequency, duration)
- [ ] Export capabilities for LMS integration
- [ ] Create `components/educator/AnalyticsDashboard.tsx`

**Metrics Displayed**:
- [ ] Mastery distribution by concept
- [ ] At-risk student identification (< 40% engagement)
- [ ] Assessment score distributions
- [ ] Knowledge graph coverage percentage

### 3.3 Assessment Builder

- [ ] Question types:
  - [ ] Multiple choice
  - [ ] Short answer (AI-graded with rubric)
  - [ ] Concept mapping
  - [ ] Problem solving (step-by-step)
- [ ] Link questions to specific concepts in graph
- [ ] Set Bloom's level requirements
- [ ] Schedule assessments with time limits
- [ ] Create `components/educator/AssessmentBuilder.tsx`

### 3.4 "Show Your Work" Audit Trail

- [ ] Log all learner interactions:
  ```
  (Learner)-[:PERFORMED {timestamp, duration}]->(Action)
  Action types: CHAT_QUERY, SOURCE_READ, ASSESSMENT_ATTEMPT, REVIEW_SESSION
  ```
- [ ] Generate learning journey reports showing:
  - [ ] Sources consulted before answering
  - [ ] Questions asked to AI
  - [ ] Time spent per concept
  - [ ] Assessment attempt history with answers
  - [ ] Revision patterns
- [ ] Create `components/educator/AuditTrail.tsx`

**Privacy Considerations**:
- [ ] Learners can see their own audit trail
- [ ] Educators see aggregated/anonymized by default
- [ ] Opt-in for detailed individual view

### 3.5 Curriculum Alignment Tools

- [ ] Import standard frameworks (Common Core, NGSS, state standards)
- [ ] AI-assisted mapping of concepts to standards
- [ ] Coverage reports showing standards addressed
- [ ] Gap analysis for curriculum planning

---

## Phase 4: Differentiation Features

### 4.1 Multi-Modal Learning Support

**Note**: Avoiding debunked "learning styles" - using evidence-based multi-modal approach

- [ ] **Visual**: Enhanced mindmaps, concept diagrams, infographics
- [ ] **Auditory**: Improved audio summaries with concept emphasis
- [ ] **Kinesthetic**: Interactive simulations where applicable
- [ ] **Reading/Writing**: Generated notes, summaries, flashcards

**Research Basis**: Dual coding theory (Paivio) - multiple representations aid retention

### 4.2 Accessibility Features

- [ ] Screen reader compatibility
- [ ] Keyboard navigation
- [ ] Adjustable text size and contrast
- [ ] Audio descriptions for visual content
- [ ] Dyslexia-friendly font option
- [ ] Reduced motion mode

---

## Phase 5: Gamification & Motivation

### 5.1 Progress Visualization

- [ ] Knowledge graph "fog of war" - reveal concepts as mastered
- [ ] Streak tracking with recovery options
- [ ] Milestone celebrations
- [ ] Comparative progress (opt-in)

**Research Basis**: Self-determination theory - autonomy, competence, relatedness

### 5.2 Achievement System

- [ ] Concept mastery badges
- [ ] Streak achievements
- [ ] Depth achievements (completing prerequisite chains)
- [ ] Breadth achievements (cross-domain learning)

---

## Technical Architecture Updates

### Database Schema (Neo4j)

- [ ] Create constraints:
  ```cypher
  CREATE CONSTRAINT concept_id IF NOT EXISTS FOR (c:Concept) REQUIRE c.id IS UNIQUE;
  CREATE CONSTRAINT learner_id IF NOT EXISTS FOR (l:Learner) REQUIRE l.id IS UNIQUE;
  CREATE CONSTRAINT source_id IF NOT EXISTS FOR (s:Source) REQUIRE s.id IS UNIQUE;
  ```
- [ ] Create indexes:
  ```cypher
  CREATE INDEX concept_name IF NOT EXISTS FOR (c:Concept) ON (c.name);
  CREATE INDEX learner_mastery IF NOT EXISTS FOR ()-[m:MASTERED]-() ON (m.confidence);
  ```

### New API Routes

| Route | Method | Status |
|-------|--------|--------|
| `/api/graph/ingest` | POST | [ ] |
| `/api/graph/learner-state` | GET/PUT | [ ] |
| `/api/learning-path` | GET | [ ] |
| `/api/assessment/generate` | POST | [ ] |
| `/api/assessment/submit` | POST | [ ] |
| `/api/review/queue` | GET | [ ] |
| `/api/review/submit` | POST | [ ] |
| `/api/study-guide` | POST | [ ] |
| `/api/educator/class` | CRUD | [ ] |
| `/api/educator/analytics` | GET | [ ] |
| `/api/audit/trail` | GET | [ ] |

### New Components

```
components/
├── learner/
│   ├── [ ] LearningPath.tsx
│   ├── [ ] ReviewQueue.tsx
│   ├── [ ] Assessment.tsx
│   ├── [ ] StudyGuide.tsx
│   └── [ ] ProgressDashboard.tsx
├── educator/
│   ├── [ ] ClassManager.tsx
│   ├── [ ] StudentRoster.tsx
│   ├── [ ] AnalyticsDashboard.tsx
│   ├── [ ] AssessmentBuilder.tsx
│   ├── [ ] AuditTrail.tsx
│   └── [ ] CurriculumMapper.tsx
└── shared/
    ├── [ ] KnowledgeGraph.tsx (enhanced)
    ├── [ ] ConceptCard.tsx
    └── [ ] BloomLevelBadge.tsx
```

---

## Metrics Framework

### Learner Success Metrics

| Metric | Definition | Target | Status |
|--------|------------|--------|--------|
| Concept Mastery Rate | % concepts with confidence > 0.7 | > 80% of attempted | [ ] |
| Retention Rate | % correct on 30-day delayed test | > 70% | [ ] |
| ZPD Alignment | % time spent in ZPD vs frustration/boredom | > 60% in ZPD | [ ] |
| Session Completion | % of started sessions finished | > 75% | [ ] |
| Knowledge Graph Coverage | % of source concepts mastered | Varies by goal | [ ] |

### Educator Success Metrics

| Metric | Definition | Target | Status |
|--------|------------|--------|--------|
| Class Mastery Distribution | % students meeting mastery threshold | > 70% | [ ] |
| At-Risk Detection Lead Time | Days before failure prediction actualized | > 7 days | [ ] |
| Intervention Effectiveness | Improvement after educator intervention | > 20% | [ ] |
| Content Coverage | % of curriculum standards addressed | > 90% | [ ] |

### Platform Health Metrics

| Metric | Definition | Target | Status |
|--------|------------|--------|--------|
| Daily Active Learners | Unique learners per day | Growth | [ ] |
| Session Duration | Average time per session | 15-45 min | [ ] |
| Feature Adoption | % users using each feature | > 50% core features | [ ] |
| NPS | Net Promoter Score | > 40 | [ ] |

---

## Implementation Priority

### MVP (Phase 1-2 Core)
- [ ] Neo4j integration with concept extraction
- [ ] Basic learning path visualization
- [ ] Simple assessment generation
- [ ] Review queue (spaced repetition)

### V1.0 (Full Learner Features)
- [ ] Complete ZPD-based adaptive learning
- [ ] Study guide generator
- [ ] Explainer modes
- [ ] Progress dashboard

### V1.5 (Educator Features)
- [ ] Class management
- [ ] Analytics dashboard
- [ ] Audit trail
- [ ] Assessment builder

### V2.0 (Advanced)
- [ ] Curriculum alignment
- [ ] Multi-modal support
- [ ] Gamification
- [ ] LMS integrations

---

## Dependencies

### New Packages Required
- [ ] `neo4j-driver` ^5.x
- [ ] `date-fns` ^3.x
- [ ] `recharts` ^2.x
- [ ] `zod` ^3.x

### Environment Variables
- [ ] `NEO4J_URI=bolt://localhost:7687`
- [ ] `NEO4J_USER=neo4j`
- [ ] `NEO4J_PASSWORD=xxxxx`

---

## Risk Considerations

- [ ] **Neo4j Cold Start**: Initial concept extraction may be slow; implement background processing
- [ ] **AI Grading Accuracy**: Short answer grading needs calibration; include confidence scores
- [ ] **Privacy Compliance**: Audit trail data requires FERPA/GDPR considerations
- [ ] **Scaling**: Graph queries can be expensive; implement caching layer
- [ ] **Learner Overwhelm**: Too many features at once; progressive disclosure UX

---

## Success Criteria

LearnGraph succeeds when:
- [ ] Learners demonstrate measurable improvement in retention (A/B test vs. control)
- [ ] Educators report time savings in progress monitoring
- [ ] Platform differentiates clearly from NotebookLM through structured learning
- [ ] Research-backed metrics show learning effectiveness
