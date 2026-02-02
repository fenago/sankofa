# Combining Bloom's and Fink's Taxonomies for Self-Directed Learning

## A Framework for Multi-Dimensional Educational Intelligence

**Version 1.0 | January 2025**
**LearnGraph Research Documentation**

---

## Executive Summary

Traditional learning management systems rely primarily on Bloom's Taxonomy (1956, revised 2001) to structure educational objectives around cognitive complexity. While effective for measuring intellectual rigor, this approach misses critical dimensions of what makes learning *significant* and *transformative*.

This whitepaper presents LearnGraph's integrated framework that combines Bloom's hierarchical cognitive taxonomy with Fink's Taxonomy of Significant Learning (2003), creating a multi-dimensional model that captures both the *depth* of cognitive processing and the *breadth* of learning impact.

**Key Innovation:** By layering Fink's six interactive dimensions over Bloom's cognitive hierarchy, we enable learning objectives that simultaneously address:
- **What** learners can do (Bloom's cognitive operations)
- **How** learning connects to their lives (Fink's holistic dimensions)
- **Why** the learning matters (motivation, values, self-knowledge)

---

## Part 1: The Fundamental Difference

### Bloom's Taxonomy (Revised 2001): Hierarchical & Cognitive

Bloom's framework describes increasingly complex mental operations on content, arranged in a strict hierarchy:

```
        ┌─────────────┐
        │   CREATE    │  Level 6: Produce new or original work
        └──────┬──────┘
               │
        ┌──────┴──────┐
        │  EVALUATE   │  Level 5: Justify a decision or position
        └──────┬──────┘
               │
        ┌──────┴──────┐
        │  ANALYZE    │  Level 4: Draw connections, identify patterns
        └──────┬──────┘
               │
        ┌──────┴──────┐
        │   APPLY     │  Level 3: Use information in new situations
        └──────┬──────┘
               │
        ┌──────┴──────┐
        │ UNDERSTAND  │  Level 2: Explain ideas or concepts
        └──────┬──────┘
               │
        ┌──────┴──────┐
        │  REMEMBER   │  Level 1: Recall facts and basic concepts
        └─────────────┘
```

**Strengths:**
- Clear, measurable progression
- Well-understood verb taxonomy for objective writing
- Directly maps to assessment difficulty
- Universal adoption in education

**Limitations:**
- Purely cognitive—ignores affective and metacognitive dimensions
- Assumes linear progression (not always true)
- Doesn't capture *why* learning matters to the learner
- Silent on transfer, integration, and self-development

### Fink's Taxonomy of Significant Learning (2003): Relational & Holistic

Fink's framework describes six interconnected dimensions that aren't hierarchical but *synergistic*—each dimension can enhance the others:

```
                    ┌─────────────────────────┐
                    │   FOUNDATIONAL          │
                    │     KNOWLEDGE           │
                    │  Understanding and      │
                    │  remembering information│
                    └───────────┬─────────────┘
                                │
           ┌────────────────────┼────────────────────┐
           │                    │                    │
           ▼                    ▼                    ▼
    ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
    │ APPLICATION │◄────►│ INTEGRATION │◄────►│   HUMAN     │
    │             │      │             │      │ DIMENSION   │
    │ Skills,     │      │ Connecting  │      │ Learning    │
    │ thinking,   │      │ ideas,      │      │ about self  │
    │ creativity  │      │ people,     │      │ and others  │
    │             │      │ realms      │      │             │
    └──────┬──────┘      └──────┬──────┘      └──────┬──────┘
           │                    │                    │
           └────────────────────┼────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
             ┌─────────────┐         ┌─────────────────┐
             │   CARING    │◄───────►│ LEARNING HOW    │
             │             │         │   TO LEARN      │
             │ New feelings│         │                 │
             │ interests,  │         │ Becoming a      │
             │ values      │         │ better learner  │
             └─────────────┘         └─────────────────┘
```

**The Six Dimensions Explained:**

| Dimension | Core Question | Educational Impact |
|-----------|---------------|-------------------|
| **Foundational Knowledge** | What should they understand and remember? | The content nodes in the knowledge graph |
| **Application** | What should they be able to do? | Skills, thinking, managing—overlaps with Bloom's Apply-Create |
| **Integration** | What connections should they make? | Cross-disciplinary thinking, synthesis |
| **Human Dimension** | What should they learn about themselves and others? | Self-awareness, empathy, social learning |
| **Caring** | What new feelings, interests, values? | Motivation, ethics, sustained engagement |
| **Learning How to Learn** | How can they become self-directed? | Metacognition, study strategies, self-regulation |

**Strengths:**
- Holistic view of what makes learning "significant"
- Non-hierarchical allows multiple dimensions simultaneously
- Explicitly includes motivation and metacognition
- Addresses transfer and real-world application

**Limitations:**
- Less specific for writing measurable objectives
- Harder to assess directly
- Requires more complex instructional design
- Less widely adopted than Bloom's

---

## Part 2: The Combined Framework

### Why Combine Them?

Neither taxonomy alone captures the full picture of effective learning:

| Aspect | Bloom Only | Fink Only | Combined |
|--------|------------|-----------|----------|
| Cognitive depth | ✓ Clear levels | ○ Implicit | ✓ Clear levels |
| Motivation/values | ✗ Absent | ✓ Caring dimension | ✓ Explicit |
| Metacognition | ✗ Absent | ✓ Learning to Learn | ✓ Explicit |
| Self-knowledge | ✗ Absent | ✓ Human Dimension | ✓ Explicit |
| Integration/transfer | ✗ Absent | ✓ Integration | ✓ Explicit |
| Measurability | ✓ Strong | ○ Moderate | ✓ Strong |
| Assessment alignment | ✓ Direct | ○ Indirect | ✓ Direct + enriched |

### The Three-Layer Architecture

LearnGraph implements a three-layer architecture that preserves the strengths of both frameworks:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         LAYER 3: FINK'S META-STRUCTURE                  │
│                                                                         │
│  Wraps around Bloom objectives to add:                                  │
│  • Integration connections (cross-skill relationships)                  │
│  • Human Dimension awareness (what this reveals about the learner)      │
│  • Caring indicators (how this connects to values/interests)            │
│  • Learning to Learn hooks (metacognitive strategies developed)         │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                     LAYER 2: BLOOM'S COGNITIVE OPERATIONS               │
│                                                                         │
│  Applied to content nodes to create measurable learning objectives:     │
│                                                                         │
│  ┌─────────────┬────────┬────────┬───────┬─────────┬──────┬───────┐    │
│  │ Content     │Remember│Underst.│ Apply │ Analyze │Eval. │Create │    │
│  ├─────────────┼────────┼────────┼───────┼─────────┼──────┼───────┤    │
│  │ Concept A   │  L1    │  L2    │  L3   │   L4    │  L5  │  L6   │    │
│  │ Concept B   │  L1    │  L2    │  L3   │   L4    │  L5  │  L6   │    │
│  │ Concept C   │  L1    │  L2    │  L3   │   L4    │  L5  │  L6   │    │
│  └─────────────┴────────┴────────┴───────┴─────────┴──────┴───────┘    │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                  LAYER 1: CONTENT ONTOLOGY (KNOWLEDGE GRAPH)            │
│                                                                         │
│  Taxonomy-agnostic representation of domain knowledge:                  │
│  • Concepts/skills as nodes                                             │
│  • Prerequisite relationships as edges                                  │
│  • No cognitive or affective classification at this layer               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Model Implementation

```typescript
interface LearningObjective {
  id: string
  contentNodeId: string           // Reference to Layer 1

  // Bloom component (Layer 2)
  bloomLevel: 1 | 2 | 3 | 4 | 5 | 6
  bloomVerb: string               // "analyze", "create", "evaluate"
  description: string             // Measurable objective statement

  // Fink enrichment (Layer 3)
  finkDimensions: FinkDimension[] // Which dimensions this engages
  finkPrimaryDimension: FinkDimension

  // Integration connections
  integrationTargets: string[]    // Other content nodes this connects to
  integrationDescription: string  // How it connects

  // Human Dimension
  selfKnowledgePrompt: string     // "What does mastering this reveal about you?"
  otherAwareness: string[]        // Social/collaborative aspects

  // Caring
  valuesConnection: string        // How this connects to learner values
  interestHooks: string[]         // What makes this engaging

  // Learning How to Learn
  metacognitivePrompt: string     // Reflection question
  strategyDeveloped: string[]     // Study strategies this builds
}

type FinkDimension =
  | 'foundational_knowledge'
  | 'application'
  | 'integration'
  | 'human_dimension'
  | 'caring'
  | 'learning_how_to_learn'
```

---

## Part 3: The Inverse Profile Architecture

The combined framework enables a rich, multi-dimensional learner profile that goes far beyond "what do they know?"

### Traditional Learner Profile (Bloom Only)

```
┌──────────────────────────────────────────┐
│           KNOWLEDGE MAP                   │
│                                          │
│  Concept A: [████████░░] 80% mastered    │
│  Concept B: [██████░░░░] 60% mastered    │
│  Concept C: [██░░░░░░░░] 20% mastered    │
│                                          │
│  Overall Progress: 53%                   │
└──────────────────────────────────────────┘
```

**Limitation:** Tells us *what* they know, but not *how* they learn or *why* it matters to them.

### Multi-Dimensional Profile (Bloom + Fink)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        INVERSE LEARNER PROFILE                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                 FOUNDATIONAL KNOWLEDGE MAP                         │  │
│  │                                                                    │  │
│  │  • Demonstrated mastery (evidence-based)     [████████░░] 78%     │  │
│  │  • Inferred knowledge (from prerequisites)   [██████░░░░] 62%     │  │
│  │  • Knowledge gaps (adjacent unknowns)        12 skills identified │  │
│  │                                                                    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                │                                        │
│     ┌──────────────────────────┼──────────────────────────┐            │
│     │                          │                          │            │
│     ▼                          ▼                          ▼            │
│  ┌──────────────┐    ┌─────────────────────┐    ┌───────────────────┐  │
│  │ APPLICATION  │    │    INTEGRATION      │    │  HUMAN DIMENSION  │  │
│  │              │    │                     │    │                   │  │
│  │ Skills by    │    │ Connection patterns │    │ Self-knowledge:   │  │
│  │ Bloom level: │    │ demonstrated:       │    │                   │  │
│  │              │    │                     │    │ • Strengths:      │  │
│  │ Apply:   ███ │    │ [Cross-domain      │    │   - Pattern rec.  │  │
│  │ Analyze: ██░ │    │  integration map]   │    │   - Abstract      │  │
│  │ Evaluate: █░ │    │                     │    │                   │  │
│  │ Create:  ░░░ │    │ 23 connections      │    │ • Growth edges:   │  │
│  │              │    │ made across         │    │   - Persistence   │  │
│  │              │    │ 5 domains           │    │   - Collaboration │  │
│  │              │    │                     │    │                   │  │
│  └──────────────┘    └─────────────────────┘    └───────────────────┘  │
│          │                     │                         │              │
│          └─────────────────────┼─────────────────────────┘              │
│                                │                                        │
│  ┌─────────────────────────────┴─────────────────────────────────────┐  │
│  │              CARING + LEARNING HOW TO LEARN                        │  │
│  │                                                                    │  │
│  │  Productive Struggle Profile:                                      │  │
│  │  ┌──────────────────────────────────────────────────────────────┐ │  │
│  │  │ • Persistence patterns:                                       │ │  │
│  │  │   High in: problem-solving, debugging                         │ │  │
│  │  │   Low in: writing, documentation                              │ │  │
│  │  │                                                               │ │  │
│  │  │ • Curiosity indicators:                                       │ │  │
│  │  │   Drawn to: systems thinking, optimization                    │ │  │
│  │  │   Avoids: rote memorization, formatting tasks                 │ │  │
│  │  │                                                               │ │  │
│  │  │ • Strategy repertoire:                                        │ │  │
│  │  │   Preferred: worked examples → practice                       │ │  │
│  │  │   Developing: retrieval practice, spaced review               │ │  │
│  │  │                                                               │ │  │
│  │  │ • Metacognitive growth:                                       │ │  │
│  │  │   Calibration: improving (was overconfident, now accurate)    │ │  │
│  │  │   Self-regulation: moderate (tends to skip reflection)        │ │  │
│  │  └──────────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    COMPARED TO FORMER SELF                         │  │
│  │                                                                    │  │
│  │  This Week        This Month       All Time                        │  │
│  │  +3 concepts      +12 concepts     47 concepts                     │  │
│  │  +2 Bloom levels  +8 Bloom levels  Avg: Analyze                    │  │
│  │  4 integrations   15 integrations  89 connections                  │  │
│  │                                                                    │  │
│  │  Growth: ↑23% learning velocity | ↑15% persistence | ↑Integration │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Part 4: Generating Multi-Dimensional Learning Objectives

### The Synthesis Process

When LearnGraph extracts learning objectives from content, it applies both frameworks simultaneously:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    LEARNING OBJECTIVE SYNTHESIS                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STEP 1: Identify Content Node                                          │
│  ────────────────────────────────                                       │
│  "Neural Network Backpropagation"                                       │
│                                                                         │
│  STEP 2: Apply Bloom Levels                                             │
│  ────────────────────────────────                                       │
│  L1: Remember the chain rule formula                                    │
│  L2: Understand why gradients flow backward                             │
│  L3: Apply backprop to a simple 2-layer network                         │
│  L4: Analyze why vanishing gradients occur                              │
│  L5: Evaluate different optimization strategies                         │
│  L6: Create a novel architecture addressing vanishing gradients         │
│                                                                         │
│  STEP 3: Enrich with Fink Dimensions                                    │
│  ────────────────────────────────                                       │
│                                                                         │
│  For objective "Analyze why vanishing gradients occur" (Bloom L4):      │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ FINK ENRICHMENT                                                    │  │
│  │                                                                    │  │
│  │ Primary Dimensions:                                                │  │
│  │ • Foundational Knowledge: Requires deep understanding of calculus  │  │
│  │ • Application: Debugging real neural networks                      │  │
│  │ • Integration: Connects calculus ↔ optimization ↔ architecture    │  │
│  │                                                                    │  │
│  │ Secondary Dimensions:                                              │  │
│  │ • Human Dimension: Reveals learner's debugging persistence        │  │
│  │ • Learning to Learn: Develops "trace the math" debugging strategy │  │
│  │                                                                    │  │
│  │ Integration Connections:                                           │  │
│  │ → Chain rule (calculus)                                            │  │
│  │ → Activation functions (architecture)                              │  │
│  │ → Gradient descent (optimization)                                  │  │
│  │ → ResNets/skip connections (advanced architecture)                 │  │
│  │                                                                    │  │
│  │ Metacognitive Prompt:                                              │  │
│  │ "What debugging strategy did you use? How might you approach      │  │
│  │  similar problems in the future?"                                  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Rich Learning Objective Example

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       RICH LEARNING OBJECTIVE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  "Analyze why your initial neural network architecture failed           │
│   and redesign it based on your analysis"                               │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │  Bloom Level:        Analyze (L4) + Create (L6)                   │  │
│  │                                                                    │  │
│  │  Fink Dimensions:                                                  │  │
│  │  ├─ Foundational:    Neural network concepts                      │  │
│  │  ├─ Application:     Debugging and architecture design            │  │
│  │  ├─ Integration:     Connects theory ↔ practice, failure ↔ growth │  │
│  │  ├─ Human Dimension: Self-awareness of reasoning gaps             │  │
│  │  ├─ Caring:          Values iteration, embraces productive failure│  │
│  │  └─ Learning to Learn: Develops debugging-as-learning strategy    │  │
│  │                                                                    │  │
│  │  Assessment Approach:                                              │  │
│  │  • Submit failing architecture with error analysis                 │  │
│  │  • Document reasoning process and hypotheses                       │  │
│  │  • Submit redesigned architecture with justification               │  │
│  │  • Reflect on what strategy worked and what didn't                 │  │
│  │                                                                    │  │
│  │  Metacognitive Hook:                                               │  │
│  │  "What did this failure teach you about your own thinking?"       │  │
│  │                                                                    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Part 5: Learning Path Generation

### Multi-Path Philosophy

The combined framework enables generating multiple valid learning paths, each emphasizing different Fink dimensions while maintaining Bloom progression:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    LEARNING PATH OPTIONS                                 │
│                                                                         │
│  CURRENT STATE ───────────────────────────────────────────► GOAL STATE  │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PATH A: Depth-First (Foundational Knowledge Emphasis)                  │
│  ──────────────────────────────────────────────────────                 │
│  "Master one domain deeply before expanding"                            │
│                                                                         │
│  Focus: Foundational Knowledge + Application                            │
│  Bloom Pattern: L1→L2→L3→L4→L5→L6 per concept before moving on         │
│  Best for: Learners who prefer mastery-based progression                │
│  Challenge: Can feel slow; delayed integration                          │
│                                                                         │
│  ┌────┐   ┌────┐   ┌────┐   ┌────┐   ┌────┐                            │
│  │ A  │──►│ A  │──►│ A  │──►│ A  │──►│ A  │                            │
│  │ L1 │   │ L2 │   │ L3 │   │ L4 │   │ L5 │  Then → Concept B          │
│  └────┘   └────┘   └────┘   └────┘   └────┘                            │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PATH B: Breadth-First (Integration Emphasis)                           │
│  ──────────────────────────────────────────────                         │
│  "Build integration across domains early"                               │
│                                                                         │
│  Focus: Integration + Foundational Knowledge                            │
│  Bloom Pattern: L1-L3 across concepts, then L4-L6                       │
│  Best for: Learners who see big picture first                           │
│  Challenge: May lack depth for complex applications                     │
│                                                                         │
│  ┌────┐   ┌────┐   ┌────┐                                              │
│  │ A  │   │ B  │   │ C  │   ←── All at L1-L3                           │
│  │L1-3│──►│L1-3│──►│L1-3│                                              │
│  └────┘   └────┘   └────┘                                              │
│     │        │        │                                                 │
│     └────────┼────────┘                                                 │
│              ▼                                                          │
│         ┌────────────┐                                                  │
│         │ Integration │  ←── See connections                           │
│         └────────────┘                                                  │
│              │                                                          │
│              ▼                                                          │
│  ┌────┐   ┌────┐   ┌────┐                                              │
│  │ A  │   │ B  │   │ C  │   ←── All at L4-L6                           │
│  │L4-6│──►│L4-6│──►│L4-6│                                              │
│  └────┘   └────┘   └────┘                                              │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PATH C: Application-Driven (Learning by Doing)                         │
│  ──────────────────────────────────────────────────                     │
│  "Learn through building and creating"                                  │
│                                                                         │
│  Focus: Application + Human Dimension                                   │
│  Bloom Pattern: Start at L3 with projects, backfill L1-L2 as needed    │
│  Best for: Hands-on learners; those with prior experience              │
│  Challenge: May have gaps in foundational understanding                 │
│                                                                         │
│           ┌──────────────┐                                              │
│           │   PROJECT    │  ←── Start here                             │
│           │  (Apply L3)  │                                              │
│           └──────┬───────┘                                              │
│                  │ Need to know X?                                      │
│        ┌─────────┼─────────┐                                            │
│        ▼         ▼         ▼                                            │
│     ┌────┐   ┌────┐    ┌────┐                                          │
│     │ A  │   │ B  │    │ C  │  ←── Learn just-in-time                  │
│     │L1-2│   │L1-2│    │L1-2│                                          │
│     └────┘   └────┘    └────┘                                          │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PATH D: Interest-Following (Caring Emphasis)                           │
│  ──────────────────────────────────────────────                         │
│  "Follow curiosity; let interest guide the journey"                     │
│                                                                         │
│  Focus: Caring + Learning to Learn                                      │
│  Bloom Pattern: Varies by learner interest; non-linear                 │
│  Best for: Self-directed learners; exploratory contexts                │
│  Challenge: May miss critical foundations; harder to assess            │
│                                                                         │
│  ┌────┐        ┌────┐        ┌────┐                                    │
│  │ C  │───────►│ A  │◄───────│ B  │                                    │
│  │L2-4│ interest│L3 │interest│L1-3│                                    │
│  └────┘        └─┬──┘        └────┘                                    │
│                  │                                                      │
│                  ▼ curiosity                                            │
│              ┌────────┐                                                 │
│              │   D    │                                                 │
│              │  L1-6  │  ←── Deep dive on fascinating topic            │
│              └────────┘                                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Path Selection Based on Human Dimension

The learner's profile (Human Dimension) informs path recommendation:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PATH RECOMMENDATION ENGINE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  LEARNER PROFILE INDICATORS         →    RECOMMENDED PATH               │
│  ─────────────────────────────            ──────────────────            │
│                                                                         │
│  High persistence, mastery-oriented  →    Path A (Depth-First)          │
│  Big-picture thinker, connector      →    Path B (Breadth-First)        │
│  Hands-on, impatient with theory     →    Path C (Application-Driven)   │
│  Curious, self-directed, exploratory →    Path D (Interest-Following)   │
│                                                                         │
│  Low confidence, needs wins          →    Path A with smaller steps     │
│  High confidence, risk-taker         →    Path C with challenges        │
│  Collaborative, social learner       →    Any path + peer components    │
│                                                                         │
│  BUT: Always offer all paths. Self-direction means learner chooses.     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Part 6: The Self-Directed Learning Loop

The combined framework enables a complete learning loop that touches all dimensions:

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│   1. LEARNER SEES THEIR PROFILE                                       │
│      (Human Dimension: self-knowledge)                                │
│                                │                                       │
│                                ▼                                       │
│   2. SYSTEM GENERATES LEARNING PATHS                                  │
│      (Multiple valid options, respecting autonomy)                    │
│                                │                                       │
│                                ▼                                       │
│   3. LEARNER CHOOSES PATH                                             │
│      (Self-direction, Caring: following interest)                     │
│                                │                                       │
│                                ▼                                       │
│   4. LEARNER ENGAGES WITH OBJECTIVES                                  │
│      (Foundational + Application, Bloom progression)                  │
│                                │                                       │
│                                ▼                                       │
│   5. PRODUCTIVE STRUGGLE OCCURS                                       │
│      (Calibrated challenge, support available)                        │
│                                │                                       │
│                                ▼                                       │
│   6. EVIDENCE CAPTURED                                                │
│      (Artifacts, reflections, time-on-task)                           │
│                                │                                       │
│                                ▼                                       │
│   7. INTEGRATION PROMPTED                                             │
│      ("How does this connect to what you already know?")              │
│                                │                                       │
│                                ▼                                       │
│   8. PROFILE UPDATED                                                  │
│      (Compared to former self, not others)                            │
│                                │                                       │
│                                ▼                                       │
│   9. METACOGNITIVE REFLECTION                                         │
│      (Learning to Learn: "What worked? What didn't?")                 │
│                                │                                       │
│                                └──────────────────► Back to 1          │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Part 7: Implementation in LearnGraph

### Extraction Pipeline Integration

When processing source content, the AI extraction pipeline now generates both Bloom and Fink metadata:

```typescript
// Extraction prompt includes both frameworks
const extractionPrompt = `
  For each skill identified:

  1. Bloom's Taxonomy (Required):
     - bloomLevel: 1-6
     - secondaryBloomLevels: [...] if skill spans multiple

  2. Fink's Taxonomy (Required):
     - finkDimensions: ["foundational_knowledge", "application", ...]
     - finkPrimaryDimension: "most prominent dimension"
     - finkIntegrations: [
         { fromDimension: "...", toDimension: "...", description: "how connected" }
       ]
`
```

### Neo4j Storage Schema

Skills are stored with both framework metadata:

```cypher
CREATE (s:Skill {
  // Core properties
  id: $id,
  name: $name,
  description: $description,

  // Bloom's Taxonomy
  bloomLevel: $bloomLevel,
  secondaryBloomLevels: $secondaryBloomLevels,

  // Fink's Taxonomy
  finkDimensions: $finkDimensions,
  finkPrimaryDimension: $finkPrimaryDimension,
  finkIntegrations: $finkIntegrations
})
```

### Learner Profile Computation

The inverse profiling system tracks progress across both frameworks:

```typescript
interface FinkProgress {
  dimension: FinkDimension
  totalSkills: number
  masteredSkills: number
  percentMastered: number
  integrationCount: number  // Cross-skill connections made
}

interface LearnerProfile {
  // Bloom progress (existing)
  bloomProgress: Record<BloomLevel, { total: number, mastered: number }>

  // Fink progress (new)
  finkProgress: FinkProgress[]

  // Cross-framework insights
  integrationGraph: ConnectionMap
  humanDimensionInsights: SelfKnowledgeProfile
  caringIndicators: InterestProfile
  learningToLearnMetrics: MetacognitiveProfile
}
```

---

## Part 8: Research Validation

### Theoretical Grounding

The combined framework draws on established educational research:

| Framework Component | Research Base | Key Studies |
|---------------------|---------------|-------------|
| Bloom's Taxonomy | Cognitive psychology, educational measurement | Anderson & Krathwohl (2001), Krathwohl (2002) |
| Fink's Taxonomy | Holistic learning, course design | Fink (2003, 2013) |
| Integration dimension | Transfer research, far transfer | Barnett & Ceci (2002), Perkins & Salomon (1992) |
| Human Dimension | Self-knowledge, metacognition | Zimmerman (2002), Flavell (1979) |
| Caring dimension | Motivation theory, SDT | Ryan & Deci (2000, 2020) |
| Learning to Learn | Self-regulated learning | Winne & Hadwin (1998), Schunk (2008) |

### Empirical Support

While Fink's taxonomy is less empirically validated than Bloom's, its dimensions align with well-researched constructs:

- **Integration**: Correlates with transfer outcomes (d = 0.45-0.65)
- **Human Dimension**: Metacognitive awareness predicts learning outcomes (d = 0.60)
- **Caring**: Intrinsic motivation improves persistence and depth (d = 0.49-0.61)
- **Learning to Learn**: Self-regulation skills transfer across domains (d = 0.55)

---

## Conclusion

By combining Bloom's hierarchical cognitive taxonomy with Fink's holistic dimensions of significant learning, LearnGraph creates a framework that:

1. **Preserves measurability** through Bloom's clear cognitive levels
2. **Adds depth** through Fink's attention to motivation, integration, and self-knowledge
3. **Enables rich learner profiles** that capture not just what learners know, but how they learn
4. **Supports multiple learning paths** that respect learner autonomy and preferences
5. **Grounds self-directed learning** in a complete loop that builds metacognitive capacity

This combined framework represents the state of the art in educational technology: rigorously grounded in research, practically implementable, and genuinely learner-centered.

---

## References

Anderson, L. W., & Krathwohl, D. R. (Eds.). (2001). *A taxonomy for learning, teaching, and assessing: A revision of Bloom's taxonomy of educational objectives*. Longman.

Barnett, S. M., & Ceci, S. J. (2002). When and where do we apply what we learn? A taxonomy for far transfer. *Psychological Bulletin*, 128(4), 612-637.

Fink, L. D. (2003). *Creating significant learning experiences: An integrated approach to designing college courses*. Jossey-Bass.

Fink, L. D. (2013). *Creating significant learning experiences: An integrated approach to designing college courses* (2nd ed.). Jossey-Bass.

Flavell, J. H. (1979). Metacognition and cognitive monitoring: A new area of cognitive-developmental inquiry. *American Psychologist*, 34(10), 906-911.

Krathwohl, D. R. (2002). A revision of Bloom's taxonomy: An overview. *Theory into Practice*, 41(4), 212-218.

Perkins, D. N., & Salomon, G. (1992). Transfer of learning. *International Encyclopedia of Education*, 2, 6452-6457.

Ryan, R. M., & Deci, E. L. (2000). Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being. *American Psychologist*, 55(1), 68-78.

Ryan, R. M., & Deci, E. L. (2020). Intrinsic and extrinsic motivation from a self-determination theory perspective. *Contemporary Educational Psychology*, 61, 101860.

Schunk, D. H. (2008). Metacognition, self-regulation, and self-regulated learning: Research recommendations. *Educational Psychology Review*, 20, 463-467.

Winne, P. H., & Hadwin, A. F. (1998). Studying as self-regulated learning. In D. J. Hacker, J. Dunlosky, & A. C. Graesser (Eds.), *Metacognition in educational theory and practice* (pp. 277-304). Erlbaum.

Zimmerman, B. J. (2002). Becoming a self-regulated learner: An overview. *Theory into Practice*, 41(2), 64-70.

---

*LearnGraph Research Documentation | Combined Taxonomies Whitepaper v1.0*
