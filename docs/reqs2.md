# LearnGraph GraphRAG Add-On Requirements Checklist

## Overview

Transform LearnGraph from a **Naive RAG** system (concatenates source text → sends to LLM) into a **true GraphRAG** system with educational psychology principles embedded at the infrastructure level.

**Integration Point:** Text extraction routes (`/api/upload` and `/api/scrape`) - after text is extracted, before returning to the client.

**Data Flow:**
```
Document → Text Extraction → [NEW: Graph Extraction Pipeline] → Neo4j
                                      ↓
                              Skills, Prerequisites, Bloom's, etc.
```

---

## Phase 1: Type Definitions

### File: `/lib/types/graph.ts`

- [ ] Create `BloomLevel` type (1-6) with `BLOOM_LABELS` constant
- [ ] Create `SkillNode` interface with:
  - [ ] `id`, `name`, `description` (basics)
  - [ ] `bloomLevel`, `secondaryBloomLevels` (Bloom's Taxonomy)
  - [ ] `estimatedMinutes`, `difficulty` (effort estimation)
  - [ ] `isThresholdConcept`, `thresholdProperties` (threshold concepts)
  - [ ] `cognitiveLoadEstimate`, `chunksRequired` (cognitive load)
  - [ ] `scaffoldingLevels` (4 levels of support)
  - [ ] `keywords`, `domain`, `subdomain` (categorization)
  - [ ] `createdAt`, `updatedAt`, `sourceDocumentId` (metadata)
- [ ] Create `PrerequisiteRelationship` interface with:
  - [ ] `fromSkillId`, `toSkillId`
  - [ ] `strength` ('required' | 'recommended' | 'helpful')
  - [ ] `confidenceScore` (0-1)
  - [ ] `reasoning` (why this relationship exists)
- [ ] Create `ExtractedFromRelationship` interface
- [ ] Create `LearnerSkillState` interface with:
  - [ ] `pMastery` (0-1 probability)
  - [ ] `bktParams` (pL0, pT, pS, pG)
  - [ ] `masteryStatus`, `masteryThreshold`
  - [ ] `totalAttempts`, `correctAttempts`, `consecutiveSuccesses`
  - [ ] `spacedRepetition` (SM-2: easeFactor, interval, nextReviewAt, repetitions)
  - [ ] `currentScaffoldLevel` (1-4)
- [ ] Create `ContentSource` interface
- [ ] Create `ZPDSkill` interface
- [ ] Create `LearningPath` interface

---

## Phase 2: Neo4j Schema Design

### Node Labels & Constraints

- [ ] Create `Skill` node with unique constraint on `id`
- [ ] Create index on `Skill.domain`, `Skill.subdomain`
- [ ] Create index on `Skill.bloomLevel`
- [ ] Create index on `Skill.isThresholdConcept`
- [ ] Create `ContentSource` node with unique constraint on `id`
- [ ] Create `Learner` node with unique constraint on `id`
- [ ] Create `SkillState` node with composite unique constraint on `(learnerId, skillId)`

### Relationship Types

- [ ] `(Skill)-[:PREREQUISITE_OF]->(Skill)` with strength, confidenceScore, reasoning
- [ ] `(Skill)-[:EXTRACTED_FROM]->(ContentSource)` with confidence, extractedAt, textSpan
- [ ] `(Learner)-[:HAS_MASTERY]->(SkillState)-[:FOR_SKILL]->(Skill)`

### Key Queries

- [ ] ZPD Query: Find skills where all prereqs mastered but skill not mastered
- [ ] Learning Path Query: Find shortest path to goal skill via prerequisites
- [ ] Skills by Document Query: Find all skills extracted from a source
- [ ] Threshold Blockers Query: Find threshold concepts blocking progress

---

## Phase 3: API Design

### New API Routes

- [ ] `POST /api/graph/extract` - Extract skills & relationships from text
- [ ] `GET /api/graph/skills` - List skills with filters
- [ ] `GET /api/graph/skills/[id]` - Get single skill details
- [ ] `GET /api/graph/zpd/[learnerId]` - Get learner's ZPD skills
- [ ] `POST /api/graph/path` - Compute learning path to goal
- [ ] `POST /api/graph/mastery` - Record practice attempt, update BKT
- [ ] `POST /api/graph/query` - GraphRAG-enhanced chat query

---

## Phase 3.5: Context-Aware Cross-Document Linking

**Purpose:** Ensure new documents intelligently connect to existing graph data rather than creating isolated subgraphs.

### Pre-Extraction Context Query

- [ ] Implement `getExistingSkillsContext(domain)` function
- [ ] Query Neo4j for existing skills in same/related domains before LLM extraction
- [ ] Limit to 50 most relevant existing skills
- [ ] Return skill IDs, names, descriptions, keywords for context

### Enhanced LLM Extraction Prompt

- [ ] Modify `createSkillExtractionPrompt` to include existing skills context
- [ ] Add section: "EXISTING SKILLS IN GRAPH (Reference these IDs instead of creating duplicates)"
- [ ] Add instructions for cross-document linking:
  - [ ] Reference existing skill IDs in prerequisite relationships
  - [ ] Only create NEW skill nodes for truly new concepts
  - [ ] Create cross-document prerequisites where applicable
- [ ] Return `existingSkillReferences` array alongside skills and prerequisites

### Post-Extraction Cross-Document Inference

- [ ] Create `/lib/graph/cross-document-linking.ts`
- [ ] Implement `CrossDocumentLink` interface with `inferenceMethod` field
- [ ] Implement `inferCrossDocumentPrerequisites(newSkills, existingSkills)`:
  - [ ] Method 1: Semantic similarity (embeddings, threshold > 0.75)
  - [ ] Method 2: Bloom's level heuristic (lower level = potential prereq)
  - [ ] Method 3: Keyword overlap detection
- [ ] Store inferred links with lower confidence scores (discounted)

### Updated Data Flow

```
Document → Text Extraction → [ENHANCED PIPELINE]
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
           Query Neo4j for              Chunk text for
           existing skills              processing
                    │                               │
                    └───────────┬───────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │ Context-Aware LLM   │
                    │ Extraction          │
                    │ (with existing      │
                    │  skill context)     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Cross-Document      │
                    │ Prerequisite        │
                    │ Inference           │
                    └──────────┬──────────┘
                               │
                               ▼
                           Neo4j
                    (connected graph)
```

---

## Phase 4: LLM Prompt Templates

### File: `/lib/graph/prompts/skill-extraction.ts`

- [ ] Create `SKILL_EXTRACTION_SYSTEM_PROMPT` with:
  - [ ] Bloom's Taxonomy guidelines (Revised 2001, levels 1-6)
  - [ ] ZPD operationalization (prereq-based definition)
  - [ ] Threshold concept identification criteria
  - [ ] Cognitive load estimation guidelines
  - [ ] Prerequisite strength definitions (required/recommended/helpful)
  - [ ] Confidence score guidelines
  - [ ] Output JSON schema specification
- [ ] Create `createSkillExtractionPrompt(text, title)` function

---

## Phase 5: Integration with Existing Routes

### Modified: `/app/api/upload/route.ts`

- [ ] Generate unique `documentId` for each upload
- [ ] After text extraction (line ~52), trigger graph extraction
- [ ] Add `documentId` to response
- [ ] Add `graphExtractionStatus: 'processing'` to response

### Modified: `/app/api/scrape/route.ts`

- [ ] Generate unique `documentId` for each scrape
- [ ] After scraping (line ~39), trigger graph extraction
- [ ] Add `documentId` to response
- [ ] Add `graphExtractionStatus: 'processing'` to response

---

## Phase 6: Core Library Files

### File: `/lib/graph/neo4j.ts`

- [ ] Create Neo4j driver singleton
- [ ] Handle connection pooling
- [ ] Implement session management
- [ ] Add error handling and reconnection logic

### File: `/lib/graph/queries.ts`

- [ ] Implement `createSkillNode(skill)` query
- [ ] Implement `createPrerequisiteRelationship(rel)` query
- [ ] Implement `findZPDSkills(learnerId)` query
- [ ] Implement `findLearningPath(goalSkillId)` query
- [ ] Implement `updateLearnerMastery(learnerId, skillId, attempt)` query

### File: `/lib/graph/extraction.ts`

- [ ] Implement `extractSkillsFromText({text, sourceDocumentId, title})`
- [ ] Handle text chunking for long documents (>8000 tokens)
- [ ] Implement skill deduplication logic (fuzzy matching)
- [ ] Implement prerequisite resolution (link to existing skills)

### File: `/lib/graph/bkt.ts`

- [ ] Implement `updateBKT(currentState, wasCorrect)` function
- [ ] Default BKT parameters: pL0=0.0, pT=0.1, pS=0.1, pG=0.2
- [ ] Mastery threshold: 0.8 (regular), 0.9 (threshold concepts)

### File: `/lib/graph/spaced-rep.ts`

- [ ] Implement SM-2 algorithm
- [ ] Initial ease factor: 2.5, minimum: 1.3
- [ ] Quality ratings 0-5: 0-2 = reset, 3-5 = success
- [ ] Calculate next review date based on performance

---

## Phase 7: Educational Psychology Integration

### Zone of Proximal Development

- [ ] Skill is in ZPD when ALL prerequisites mastered AND skill NOT mastered
- [ ] Compute `readinessScore` based on prerequisite mastery strength
- [ ] Consider recency of prerequisite practice

### Bloom's Taxonomy

- [ ] Store as `bloomLevel` (1-6) on every SkillNode
- [ ] Use as heuristic, not strict hierarchy
- [ ] Allow `secondaryBloomLevels` for skills spanning levels

### Bayesian Knowledge Tracing

- [ ] Track pMastery per learner-skill pair
- [ ] Update after each practice attempt
- [ ] Use pS (slip) and pG (guess) for realistic estimation

### Mastery Learning

- [ ] 80% threshold for regular skills
- [ ] 90% threshold for threshold concepts
- [ ] Require consecutive successes before mastery

### Spaced Repetition (SM-2)

- [ ] Schedule reviews based on ease factor and interval
- [ ] Track `nextReviewAt` timestamp
- [ ] Increase interval on success, reset on failure

### Cognitive Load Theory

- [ ] Estimate `cognitiveLoadEstimate` (low/medium/high)
- [ ] Estimate `chunksRequired` (working memory slots)
- [ ] Adapt scaffolding based on cognitive load

### Threshold Concepts

- [ ] Flag with `isThresholdConcept: true`
- [ ] Track `unlocksDomains` (subgraphs they unlock)
- [ ] Track `troublesomeAspects` (common misconceptions)
- [ ] Apply higher mastery threshold

### Scaffolding with Fading

- [ ] Level 1: Full worked examples
- [ ] Level 2: Partial solutions
- [ ] Level 3: Hints on request
- [ ] Level 4: Independent practice
- [ ] Fade based on consecutive successes

---

## Phase 8: Data Flow Implementation

### Document Upload Flow

- [ ] User uploads document → `/api/upload`
- [ ] Extract raw text (PDF/TXT)
- [ ] Generate `documentId`
- [ ] Trigger async graph extraction
- [ ] Return text + documentId + status

### Graph Extraction Flow

- [ ] Receive text + documentId + title
- [ ] Chunk text if >8000 tokens
- [ ] Send to LLM with skill extraction prompt
- [ ] Parse JSON response
- [ ] Deduplicate skills against existing graph
- [ ] Store skills and relationships in Neo4j
- [ ] Update document status to 'completed'

### GraphRAG Query Flow

- [ ] User asks question
- [ ] Query Neo4j for relevant skills (keyword match)
- [ ] Fetch prerequisite context
- [ ] Get learner's ZPD and mastery state
- [ ] Construct enriched prompt with graph context
- [ ] Send to LLM
- [ ] Return learner-aware response

---

## Phase 9: Files to Create

- [ ] `/lib/types/graph.ts` - Type definitions
- [ ] `/lib/graph/neo4j.ts` - Neo4j driver singleton
- [ ] `/lib/graph/queries.ts` - Cypher query templates
- [ ] `/lib/graph/extraction.ts` - LLM extraction logic
- [ ] `/lib/graph/prompts/skill-extraction.ts` - Prompt templates
- [ ] `/lib/graph/bkt.ts` - Bayesian Knowledge Tracing
- [ ] `/lib/graph/spaced-rep.ts` - SM-2 algorithm
- [ ] `/app/api/graph/extract/route.ts` - Extraction endpoint
- [ ] `/app/api/graph/skills/route.ts` - Skills list endpoint
- [ ] `/app/api/graph/skills/[id]/route.ts` - Single skill endpoint
- [ ] `/app/api/graph/zpd/[learnerId]/route.ts` - ZPD endpoint
- [ ] `/app/api/graph/mastery/route.ts` - Mastery tracking endpoint
- [ ] `/app/api/graph/query/route.ts` - GraphRAG chat endpoint

---

## Phase 10: Files to Modify

- [ ] `/app/api/upload/route.ts` - Add graph extraction trigger
- [ ] `/app/api/scrape/route.ts` - Add graph extraction trigger
- [ ] `/app/api/chat/route.ts` - Add graph context
- [ ] `/lib/types.ts` - Add `documentId` to Source interface
- [ ] `/package.json` - Add `neo4j-driver` dependency

---

## Phase 11: Environment Variables

- [ ] `NEO4J_URI` - Neo4j connection URI (e.g., `bolt://localhost:7687`)
- [ ] `NEO4J_USER` - Neo4j username
- [ ] `NEO4J_PASSWORD` - Neo4j password
- [ ] `GRAPH_EXTRACTION_MODEL` (optional) - Model for graph extraction

---

## Success Criteria

- [ ] Extraction Accuracy: LLM correctly identifies 80%+ of skills
- [ ] Prerequisite Validity: 90%+ of extracted prerequisites are pedagogically sound
- [ ] ZPD Precision: Skills recommended as "ready to learn" have 75-85% success rate
- [ ] Mastery Tracking: BKT predictions correlate with actual performance (r > 0.7)
- [ ] Graph Connectivity: All extracted skills have at least one relationship

---

## Non-Goals (Out of Scope)

- [ ] Student-facing UI (handled by consuming applications)
- [ ] Real-time tutoring interactions
- [ ] Multi-tenant architecture
- [ ] Production deployment (Neo4j Cloud, etc.)
- [ ] Assessment generation
- [ ] Content delivery optimization

---

# How InverseProfile Connects with Neo4j Content

The InverseProfile system and the skill graph in Neo4j are **deeply interconnected**. The skill graph (from uploaded documents) provides the CONTENT structure, while InverseProfile provides the LEARNER model. They connect at every interaction.

## Connection Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INVERSE PROFILE ↔ NEO4J CONNECTION                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CONTENT GRAPH (from Documents)          LEARNER GRAPH (from Interactions)  │
│  ═══════════════════════════════         ═══════════════════════════════   │
│                                                                              │
│  (Skill)──[:PREREQUISITE_OF]──▶(Skill)   (Learner)──[:HAS_PROFILE]──▶       │
│     │                                         │        (InverseProfile)     │
│     │                                         │                              │
│  [:EXTRACTED_FROM]                       [:HAS_MASTERY]                     │
│     │                                         │                              │
│     ▼                                         ▼                              │
│  (ContentSource)                         (SkillState)                       │
│                                              │                              │
│                                         [:FOR_SKILL]                        │
│                                              │                              │
│              ┌───────────────────────────────┘                              │
│              │                                                               │
│              ▼                                                               │
│           (Skill)  ◄─── THE CONNECTION POINT                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Integration Points

| Integration | How It Works |
|-------------|--------------|
| **Skill Mastery Tracking** | `InverseProfile.knowledgeState.skillMastery` maps to `(SkillState)` nodes, which link to `(Skill)` nodes extracted from documents |
| **ZPD Calculation** | Uses `[:PREREQUISITE_OF]` relationships to determine readiness. Query: Skills where all prereqs mastered (via `SkillState.pMastery`) but this skill is NOT mastered |
| **Misconceptions** | `(Learner)-[:HAS_MISCONCEPTION]->(Skill)` links specific error patterns to specific skills from uploaded content |
| **Recommendations** | `AdaptationEngine` queries the graph: Find skills in ZPD → Rank by readiness score → Return skill content for learning |
| **Scaffold Selection** | Combines `Skill.cognitiveLoadEstimate` (from content) + `InverseProfile.workingMemoryIndicator` (from learner) to select appropriate support level |

## Concrete Example Flow

```
1. USER UPLOADS "Calculus 101.pdf"
   → Skills Extracted: [derivative_power_rule, derivative_chain_rule, ...]
   → Prerequisites: [derivative_power_rule]──[:PREREQUISITE_OF]──▶[derivative_chain_rule]
   → Stored in Neo4j as (Skill) nodes with properties

2. LEARNER INTERACTS WITH CONTENT
   → Observation: {learnerId: "L1", skillId: "derivative_power_rule", isCorrect: true}
   → BKT Update: pMastery(derivative_power_rule) = 0.85 ✓ MASTERED
   → (SkillState) node updated in Neo4j

3. SYSTEM COMPUTES ZPD
   → Query: "Find skills where all prereqs mastered, skill not mastered"
   → Result: derivative_chain_rule is now IN ZPD (prereq mastered!)
   → InverseProfile.currentZPD updated

4. RECOMMENDATION SERVED
   → AdaptationEngine.getNextRecommendedSkill()
   → Returns: derivative_chain_rule (from the PDF content)
   → Scaffold level selected based on InverseProfile.workingMemoryIndicator
```

## The Feedback Loop

```
Document Upload                    Learner Interaction
      │                                    │
      ▼                                    ▼
Skills extracted                 Observation recorded
      │                                    │
      ▼                                    ▼
Stored in Neo4j ◄──────────────► BKT updates pMastery
      │                                    │
      ▼                                    ▼
Prerequisite structure           InverseProfile updated
      │                                    │
      └──────────────┬─────────────────────┘
                     │
                     ▼
              ZPD Calculated
                     │
                     ▼
          Next Skill Recommended
                     │
                     ▼
         Learner attempts skill ◄─────────┐
                     │                     │
                     └─────────────────────┘
                        (cycle continues)
```

---

# PART 2: Inverse Profiling

## Overview

**Inverse Profiling** infers learner characteristics from natural interactions rather than requiring upfront diagnostic assessments. Instead of asking learners to complete questionnaires, the system observes behavior and infers the underlying characteristics that would produce such behavior.

**Key Insight:** Traditional profiling creates friction (50-100 question diagnostics taking 30-60 minutes). Inverse Profiling achieves **zero upfront friction** while building increasingly accurate learner models over time.

**Data Flow:**
```
Learner Interaction → Behavioral Observation → Bayesian Update → Inverse Profile
                                                     ↓
                              Adaptation Decision (ZPD, Scaffold, Content)
```

---

## Phase 12: Inverse Profile Type Definitions

### File: `/lib/types/inverse-profile.ts`

- [ ] Create `InverseProfile` interface as the main learner model:
  - [ ] `learnerId: string`
  - [ ] `knowledgeState: KnowledgeState`
  - [ ] `cognitiveIndicators: CognitiveIndicators`
  - [ ] `metacognitiveIndicators: MetacognitiveIndicators`
  - [ ] `motivationalIndicators: MotivationalIndicators`
  - [ ] `lastUpdatedAt: number`
  - [ ] `totalInteractions: number`
  - [ ] `confidenceLevel: number` (0-1, increases with more data)

### Knowledge State (Strongest Predictor)

- [ ] Create `KnowledgeState` interface:
  - [ ] `skillMastery: Map<skillId, number>` - P(mastery) per skill via BKT
  - [ ] `knowledgeGaps: string[]` - Skill IDs with P(mastery) below threshold
  - [ ] `currentZPD: string[]` - Skills where prereqs mastered, skill not yet
  - [ ] `misconceptions: Misconception[]` - Systematic error patterns
  - [ ] `strongestSkills: string[]` - Top 5 highest mastery skills
  - [ ] `recentProgress: ProgressEntry[]` - Last 10 skill mastery changes

- [ ] Create `Misconception` interface:
  - [ ] `skillId: string`
  - [ ] `errorPattern: string` - Description of the pattern
  - [ ] `frequency: number` - How often observed
  - [ ] `lastObservedAt: number`
  - [ ] `suggestedRemediations: string[]`

### Cognitive Indicators

- [ ] Create `CognitiveIndicators` interface:
  - [ ] `workingMemoryIndicator: 'low' | 'medium' | 'high'`
  - [ ] `optimalComplexityLevel: number` (1-10)
  - [ ] `expertiseLevel: 'novice' | 'intermediate' | 'advanced'`
  - [ ] `cognitiveLoadThreshold: number` - When to segment content
  - [ ] `averageResponseTimeMs: number`
  - [ ] `responseTimeVariance: number`

### Metacognitive Indicators

- [ ] Create `MetacognitiveIndicators` interface:
  - [ ] `calibration: number` - Confidence vs accuracy correlation (-1 to 1)
  - [ ] `helpSeekingPattern: 'avoidant' | 'appropriate' | 'dependent'`
  - [ ] `selfMonitoringAccuracy: number` (0-1)
  - [ ] `hintsRequestedPerProblem: number` - Average
  - [ ] `errorRecognitionRate: number` (0-1) - Can they spot own errors?

### Motivational Indicators

- [ ] Create `MotivationalIndicators` interface:
  - [ ] `engagement: EngagementMetrics`
  - [ ] `persistence: PersistenceMetrics`
  - [ ] `goalOrientation: 'mastery' | 'performance' | 'avoidance'`

- [ ] Create `EngagementMetrics` interface:
  - [ ] `sessionFrequency: number` - Sessions per week
  - [ ] `averageSessionDurationMinutes: number`
  - [ ] `voluntaryReturnRate: number` (0-1)
  - [ ] `lastSessionAt: number`

- [ ] Create `PersistenceMetrics` interface:
  - [ ] `attemptsBeforeGivingUp: number` - Average
  - [ ] `recoveryAfterFailure: number` (0-1)
  - [ ] `challengeSeekingScore: number` (-1 to 1)
  - [ ] `consecutiveSessionsAfterDifficulty: number`

---

## Phase 13: Behavioral Observation Tracking

### File: `/lib/types/observations.ts`

- [ ] Create `BehavioralObservation` interface:
  - [ ] `id: string`
  - [ ] `learnerId: string`
  - [ ] `skillId: string`
  - [ ] `timestamp: number`
  - [ ] `observationType: ObservationType`
  - [ ] `data: ObservationData`

- [ ] Create `ObservationType` enum:
  - [ ] `'problem_attempt'`
  - [ ] `'hint_request'`
  - [ ] `'content_view'`
  - [ ] `'session_start'`
  - [ ] `'session_end'`
  - [ ] `'confidence_rating'`
  - [ ] `'error_correction'`

- [ ] Create `ProblemAttemptObservation` interface:
  - [ ] `isCorrect: boolean`
  - [ ] `responseTimeMs: number`
  - [ ] `hintsUsed: number`
  - [ ] `scaffoldLevel: 1 | 2 | 3 | 4`
  - [ ] `errorType?: string` - Categorized error if incorrect
  - [ ] `confidenceRating?: number` (0-100, if collected)
  - [ ] `problemDifficulty: number` (1-10)

- [ ] Create `HintRequestObservation` interface:
  - [ ] `hintLevel: number` (1-3)
  - [ ] `timeBeforeRequest: number` - Ms since problem presented
  - [ ] `wasHelpful: boolean` - Did they succeed after hint?

- [ ] Create `SessionObservation` interface:
  - [ ] `durationMinutes: number`
  - [ ] `skillsAttempted: string[]`
  - [ ] `problemsCompleted: number`
  - [ ] `averageAccuracy: number`

---

## Phase 14: Inverse Profiling Engine

### File: `/lib/graph/inverse-profile.ts`

- [ ] Implement `InverseProfileEngine` class with:

#### Profile Initialization
  - [ ] `initializeProfile(learnerId)` - Create new profile with defaults
  - [ ] Default confidence: 0.1 (very low, will increase with data)
  - [ ] Default cognitive indicators: assume medium-complexity tolerance
  - [ ] Default metacognitive indicators: assume appropriate help-seeking

#### Observation Processing
  - [ ] `processObservation(observation)` - Main entry point
  - [ ] Route to appropriate handler based on observation type
  - [ ] Update relevant profile dimensions
  - [ ] Recalculate confidence level

#### Knowledge State Updates
  - [ ] `updateSkillMastery(learnerId, skillId, observation)` - Integrate with BKT
  - [ ] `detectMisconception(learnerId, errorPattern)` - Pattern matching on errors
  - [ ] `recalculateZPD(learnerId)` - Query graph for current ZPD
  - [ ] `identifyKnowledgeGaps(learnerId)` - Find skills below threshold

#### Cognitive Indicator Updates
  - [ ] `updateWorkingMemoryIndicator(learnerId, observations)` - Based on complexity tolerance
  - [ ] `updateExpertiseLevel(learnerId)` - Based on mastery distribution
  - [ ] `calculateOptimalComplexity(learnerId)` - Derived from performance data

#### Metacognitive Indicator Updates
  - [ ] `updateCalibration(learnerId)` - Confidence vs accuracy correlation
  - [ ] `classifyHelpSeekingPattern(learnerId)` - Based on hint usage patterns
  - [ ] `updateSelfMonitoringAccuracy(learnerId)` - Based on error correction

#### Motivational Indicator Updates
  - [ ] `updateEngagement(learnerId, sessionData)` - Session frequency/duration
  - [ ] `updatePersistence(learnerId, attemptData)` - Recovery after failure
  - [ ] `inferGoalOrientation(learnerId)` - Based on challenge-seeking behavior

---

## Phase 15: What NOT to Track (Explicitly Excluded)

### Learning Styles (VARK) - EXCLUDED

- [ ] Do NOT track or infer:
  - [ ] Visual/Auditory/Read-Write/Kinesthetic preferences
  - [ ] Any modality-based learning preferences
- [ ] Rationale: Debunked neuromyth with no predictive validity
  - [ ] Coffield et al. (2004): "No evidence to support"
  - [ ] Pashler et al. (2008): "No study has shown teaching to learning style improves outcomes"
- [ ] Key insight: Content modality should match CONTENT, not learner
  - [ ] Geometry naturally requires visual representations
  - [ ] This is about the subject, not the learner

### Self-Reported Preferences - EXCLUDED

- [ ] Do NOT rely on:
  - [ ] Stated preferences about learning
  - [ ] Self-reported "best ways to learn"
- [ ] Rationale: Learners are poor judges of what helps them learn
  - [ ] Students prefer re-reading (ineffective) over retrieval practice (effective)
- [ ] Instead: Observe actual behavior and performance

### Fixed Ability Classifications - EXCLUDED

- [ ] Do NOT label learners as:
  - [ ] "Slow" or "fast" learners
  - [ ] Fixed intelligence categories
- [ ] Rationale: Learning rate varies by content, context, and prior knowledge
  - [ ] Same learner may progress quickly through familiar material
  - [ ] Same learner may progress slowly through threshold concepts
- [ ] Instead: Track performance per skill, not global ability

---

## Phase 16: Real-Time Adaptation Pipeline

### File: `/lib/graph/adaptation.ts`

- [ ] Create `AdaptationEngine` class with:

#### Scaffold Level Selection
  - [ ] `selectScaffoldLevel(profile, skill)` - Determine appropriate support
  - [ ] Rule: Novices + high cognitive load skills → Level 1 (full support)
  - [ ] Rule: 2 consecutive successes → decrease scaffold level
  - [ ] Rule: 2 consecutive failures → increase scaffold level
  - [ ] Rule: Expertise reversal: fade scaffolding as mastery increases

#### Content Sequencing
  - [ ] `getNextRecommendedSkill(profile)` - Best skill to learn next
  - [ ] Priority 1: Skills in ZPD with highest readiness score
  - [ ] Priority 2: Skills due for spaced repetition review
  - [ ] Priority 3: Skills just below ZPD threshold (close to ready)

#### Cognitive Load Management
  - [ ] `shouldSegmentContent(profile, skill)` - Break into smaller chunks?
  - [ ] `estimateCurrentCognitiveLoad(profile)` - Based on recent performance
  - [ ] `adjustProblemComplexity(profile, baseComplexity)` - Tune to learner

#### ZPD-Based Recommendations
  - [ ] `computeReadinessScore(profile, skill)` - 0-1 based on prereq mastery
  - [ ] `getZPDSkillsRanked(profile)` - ZPD skills sorted by readiness
  - [ ] Target: 75-85% of presented content should be in ZPD

---

## Phase 17: Inverse Profile Neo4j Schema

### Additional Node Labels

- [ ] Create `InverseProfile` node with unique constraint on `learnerId`
- [ ] Create `Observation` node for audit trail (optional, can be ephemeral)
- [ ] Create `LearnerSession` node for session tracking

### Additional Relationship Types

- [ ] `(Learner)-[:HAS_PROFILE]->(InverseProfile)`
- [ ] `(Learner)-[:HAD_SESSION]->(LearnerSession)` with timestamp
- [ ] `(LearnerSession)-[:ATTEMPTED]->(Skill)` with result data
- [ ] `(Learner)-[:HAS_MISCONCEPTION]->(Skill)` with errorPattern, frequency

### Inverse Profile Properties (on InverseProfile node)

- [ ] `confidenceLevel: float` (0-1)
- [ ] `totalInteractions: int`
- [ ] `workingMemoryIndicator: string`
- [ ] `expertiseLevel: string`
- [ ] `calibration: float`
- [ ] `helpSeekingPattern: string`
- [ ] `goalOrientation: string`
- [ ] `lastUpdatedAt: timestamp`

---

## Phase 18: Inverse Profiling API Routes

### New API Routes

- [ ] `GET /api/profile/[learnerId]` - Get full inverse profile
- [ ] `POST /api/profile/observe` - Record behavioral observation
- [ ] `GET /api/profile/[learnerId]/zpd` - Get learner's current ZPD with readiness scores
- [ ] `GET /api/profile/[learnerId]/recommendations` - Get next recommended skills
- [ ] `GET /api/profile/[learnerId]/scaffold/[skillId]` - Get scaffold level for skill
- [ ] `POST /api/profile/[learnerId]/session/start` - Record session start
- [ ] `POST /api/profile/[learnerId]/session/end` - Record session end

### Observation Endpoint Details

- [ ] `POST /api/profile/observe` body:
  ```typescript
  {
    learnerId: string;
    skillId: string;
    observationType: 'problem_attempt' | 'hint_request' | ...;
    data: {
      isCorrect?: boolean;
      responseTimeMs?: number;
      hintsUsed?: number;
      scaffoldLevel?: number;
      errorType?: string;
      confidenceRating?: number;
    }
  }
  ```

---

## Phase 19: Inference Algorithms

### BKT Integration for Knowledge State

- [ ] Extend BKT to feed into InverseProfile
- [ ] After each BKT update, recalculate:
  - [ ] `knowledgeGaps` (skills with pMastery < threshold)
  - [ ] `currentZPD` (query graph)
  - [ ] `strongestSkills` (top 5 by pMastery)
  - [ ] `recentProgress` (add to rolling window)

### Calibration Calculation

- [ ] Track (confidence, accuracy) pairs per attempt
- [ ] Calculate Pearson correlation over last 20 attempts
- [ ] Calibration = r(confidence, isCorrect)
- [ ] Well-calibrated: r > 0.5
- [ ] Overconfident: high confidence, low accuracy
- [ ] Underconfident: low confidence, high accuracy

### Help-Seeking Pattern Classification

- [ ] `avoidant`: Hints/attempt < 0.1 AND accuracy < 60%
- [ ] `dependent`: Hints/attempt > 1.5 OR always requests hint first
- [ ] `appropriate`: Everything else (hints correlate with need)

### Goal Orientation Inference

- [ ] `mastery`: Persists after failure, seeks challenges, reviews completed skills
- [ ] `performance`: Avoids difficult tasks, stops after mastery, competitive behaviors
- [ ] `avoidance`: Low engagement, quits after failure, avoids challenges

### Working Memory Indicator

- [ ] Based on performance vs problem complexity:
  - [ ] `low`: Struggles with problems requiring 3+ simultaneous concepts
  - [ ] `medium`: Handles 3-4 simultaneous concepts
  - [ ] `high`: Handles 5+ simultaneous concepts without scaffolding

---

## Phase 20: Files to Create (Inverse Profiling)

- [ ] `/lib/types/inverse-profile.ts` - Profile type definitions
- [ ] `/lib/types/observations.ts` - Observation type definitions
- [ ] `/lib/graph/inverse-profile.ts` - InverseProfileEngine class
- [ ] `/lib/graph/adaptation.ts` - AdaptationEngine class
- [ ] `/lib/graph/inference/calibration.ts` - Calibration calculation
- [ ] `/lib/graph/inference/help-seeking.ts` - Help-seeking classification
- [ ] `/lib/graph/inference/goal-orientation.ts` - Goal orientation inference
- [ ] `/lib/graph/inference/working-memory.ts` - Working memory estimation
- [ ] `/app/api/profile/[learnerId]/route.ts` - Profile retrieval
- [ ] `/app/api/profile/observe/route.ts` - Observation recording
- [ ] `/app/api/profile/[learnerId]/zpd/route.ts` - ZPD query
- [ ] `/app/api/profile/[learnerId]/recommendations/route.ts` - Recommendations
- [ ] `/app/api/profile/[learnerId]/scaffold/[skillId]/route.ts` - Scaffold level

---

## Phase 21: Integration with GraphRAG Chat

### Modified: `/app/api/chat/route.ts` (Additional Changes)

- [ ] Fetch learner's InverseProfile before generating response
- [ ] Include in prompt context:
  - [ ] Current ZPD skills
  - [ ] Current scaffold level recommendation
  - [ ] Expertise level (affects explanation depth)
  - [ ] Calibration status (may need confidence-building or grounding)
  - [ ] Misconceptions to address/avoid reinforcing
- [ ] Adapt response style based on profile:
  - [ ] Novice: More worked examples, step-by-step
  - [ ] Expert: More problem-solving, less scaffolding
  - [ ] Overconfident: Include verification steps
  - [ ] Avoidant: Encouraging, lower difficulty initially

### Prompt Enhancement Template

- [ ] Create `buildProfileAwarePrompt(profile, graphContext, question)`:
  ```
  Learner Context:
  - Expertise: {expertiseLevel}
  - Current ZPD: {zpdSkills}
  - Recommended scaffold level: {scaffoldLevel}
  - Metacognitive calibration: {calibration}
  - Known misconceptions: {misconceptions}

  Adapt your response to this learner's level...
  ```

---

## Phase 22: Inverse Profiling Success Criteria

- [ ] Zero Friction: No upfront assessment required to start learning
- [ ] Profile Confidence: Reaches 0.7+ confidence after 20 interactions
- [ ] Calibration Accuracy: System calibration estimate correlates with actual (r > 0.6)
- [ ] Help-Seeking Classification: 85%+ agreement with expert labeling
- [ ] Scaffold Adaptation: Scaffold level changes correlate with performance (r > 0.5)
- [ ] ZPD Precision: 75-85% of recommended skills are in true ZPD
- [ ] Profile Persistence: Profiles maintain accuracy across sessions

---

## Phase 23: Measurement Framework

### Proof Points (from Research)

- [ ] Students Learn MORE: Normalized gain g >= 0.50
- [ ] Students Learn FASTER: Time to mastery ratio <= 0.70 (30% faster)
- [ ] Students RETAIN Longer:
  - [ ] 7-day retention >= 90%
  - [ ] 30-day retention >= 75%
  - [ ] 90-day retention >= 60%
- [ ] Students TRANSFER: Near transfer >= 70%, Far transfer >= 50%

### Expected Effect Sizes

- [ ] ITS meta-analyses: d = 0.66-0.76 (Kulik & Fletcher 2016, Ma et al. 2014)
- [ ] AI Tutoring (2025): d = 1.02+ (Nature 2025)
- [ ] Combined expected: d = 0.66 to 1.02+
- [ ] Interpretation: Students outperform 76-85% of traditional instruction
