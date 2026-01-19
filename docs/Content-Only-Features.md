# Content-Only Features

> These features work immediately after extracting a knowledge graph from your content. No learner tracking required.

---

## 1. Curriculum Overview

**What it does:** Organizes all extracted skills by Bloom's Taxonomy levels with time estimates.

**Educational Psychology:** Based on **Bloom's Revised Taxonomy (Anderson & Krathwohl, 2001)**. Learning progresses through six cognitive levels, and students must master lower levels before succeeding at higher-order thinking.

| Level | Cognitive Process | Example Verbs |
|-------|-------------------|---------------|
| 1. Remember | Retrieve knowledge from memory | Define, list, recall, identify |
| 2. Understand | Construct meaning from information | Explain, summarize, classify, compare |
| 3. Apply | Use procedures in new situations | Execute, implement, solve, demonstrate |
| 4. Analyze | Break into parts, find relationships | Differentiate, organize, attribute, compare |
| 5. Evaluate | Make judgments based on criteria | Critique, justify, assess, argue |
| 6. Create | Put elements together into new whole | Design, construct, develop, formulate |

**API:** `GET /api/notebooks/[id]/graph/learning-path?action=overview`

---

## 2. Prerequisite Visualization

**What it does:** Displays a graph of skill dependencies with relationship strengths (required, recommended, helpful).

**Educational Psychology:** Based on **Gagné's Learning Hierarchies** and **prerequisite knowledge research**. Attempting to learn advanced concepts without mastering prerequisites leads to cognitive overload and poor retention. Studies show 50%+ of learning failures trace back to missing prerequisites.

| Relationship | Meaning | Implication |
|--------------|---------|-------------|
| **Required** | Must master before proceeding | Gate progression on this skill |
| **Recommended** | Significantly helps learning | Review before teaching/learning |
| **Helpful** | Provides useful context | Mention as connection |

**API:** `GET /api/notebooks/[id]/graph`

---

## 3. Learning Path Generation

**What it does:** Creates an optimal sequence from any starting point to any goal skill using topological sorting (Kahn's algorithm).

**Educational Psychology:** Based on **instructional sequencing research** showing that logical ordering (simple→complex, concrete→abstract, prerequisite→dependent) significantly improves learning outcomes. Proper sequencing reduces extraneous cognitive load.

**API:** `GET /api/notebooks/[id]/graph/learning-path?action=path&goal=skillId`

---

## 4. Threshold Concept Identification

**What it does:** Highlights transformative concepts that fundamentally change how learners understand the subject.

**Educational Psychology:** Based on **Meyer & Land's Threshold Concepts Framework (2003)**. These concepts are:

| Property | Description |
|----------|-------------|
| **Transformative** | Changes how learners see the subject |
| **Irreversible** | Once understood, hard to unlearn |
| **Integrative** | Connects previously separate ideas |
| **Troublesome** | Often counterintuitive or difficult |
| **Bounded** | Defines the discipline's borders |

Threshold concepts require higher mastery thresholds (90% vs 80%) and additional instructional time.

**Properties:** `isThresholdConcept`, `thresholdProperties`

---

## 5. Cognitive Load Estimation

**What it does:** Identifies high-load skills that may overwhelm working memory, requiring additional scaffolding.

**Educational Psychology:** Based on **Sweller's Cognitive Load Theory (1988)**. Working memory can only hold 4±1 chunks of new information simultaneously (Miller's Law). High element interactivity—when many elements must be processed together—exhausts working memory quickly.

| Property | What It Measures | Range |
|----------|------------------|-------|
| `cognitiveLoadEstimate` | Overall cognitive demand | low, medium, high |
| `elementInteractivity` | Simultaneous element processing | low, medium, high |
| `chunksRequired` | Working memory slots needed | 2-7 (Miller's Law) |

**Properties:** `cognitiveLoadEstimate`, `elementInteractivity`, `chunksRequired`

---

## 6. Assessment Suggestions

**What it does:** Provides Bloom-aligned assessment ideas and question types for each skill.

**Educational Psychology:** Based on **Constructive Alignment (Biggs, 1996)**. Assessments must match the cognitive level being taught. Testing "remember" when you taught "analyze" creates misalignment and invalid measurement.

| Bloom Level | Appropriate Assessment Types |
|-------------|------------------------------|
| Remember | Multiple choice, fill-in-blank, matching |
| Understand | Short answer, explain in own words |
| Apply | Problem solving, case studies |
| Analyze | Compare/contrast, categorization |
| Evaluate | Critique, defend a position |
| Create | Design projects, original solutions |

**Properties:** `assessmentTypes`, `suggestedAssessments`

---

## 7. Scaffolding Guidance

**What it does:** Provides 4-level support descriptions for each skill, from full worked examples to independent practice.

**Educational Psychology:** Based on **Vygotsky's Zone of Proximal Development** and **Wood, Bruner & Ross's scaffolding research (1976)**. Effective instruction provides just enough support, then gradually removes it (gradual release of responsibility).

| Level | Support Type | Description |
|-------|--------------|-------------|
| 1 | Full worked examples | Complete solution demonstrated step-by-step |
| 2 | Partial solutions | Worked example with blanks to fill |
| 3 | Hints on request | Student attempts first, help available |
| 4 | Independent practice | Student works without assistance |

**Properties:** `scaffoldingLevels`

---

## 8. Common Misconceptions

**What it does:** Lists known misconceptions students typically have about each skill.

**Educational Psychology:** Based on **Conceptual Change Theory (Posner et al., 1982)**. Students don't arrive as blank slates—they have prior conceptions that may be incorrect. Research shows that simply teaching correct information doesn't eliminate misconceptions; they must be directly confronted through **refutation texts** and explicit correction.

**Properties:** `commonMisconceptions`

---

## 9. Transfer Domains

**What it does:** Shows where each skill applies in other contexts and disciplines.

**Educational Psychology:** Based on **Transfer of Learning research (Perkins & Salomon, 1988)**. Students often fail to apply knowledge outside the original context unless explicitly taught to do so. Far transfer (applying to very different contexts) is particularly difficult and requires deliberate instruction.

**Properties:** `transferDomains`

---

## 10. IRT-Based Difficulty Calibration

**What it does:** Provides psychometrically calibrated difficulty parameters for adaptive question selection.

**Educational Psychology:** Based on **Item Response Theory (IRT) 3-Parameter Logistic Model (Lord, 1980)**—the gold standard for educational measurement used in standardized tests (GRE, GMAT, etc.).

| Parameter | Symbol | Range | Description |
|-----------|--------|-------|-------------|
| **Difficulty** | b | -3 to +3 | How hard the item is (0 = average ability) |
| **Discrimination** | a | 0.5 to 2.5 | How well it separates ability levels |
| **Guessing** | c | 0 to 0.5 | Probability of correct guess |

The IRT probability formula:
```
P(correct) = c + (1-c) / (1 + e^(-a(θ-b)))
```
Where θ = learner ability

**Properties:** `irt.difficulty`, `irt.discrimination`, `irt.guessing`

---

## Quick Reference: Educational Psychology Foundations

| Feature | Key Theory | Key Researcher(s) |
|---------|------------|-------------------|
| Curriculum Overview | Bloom's Taxonomy | Anderson & Krathwohl (2001) |
| Prerequisite Visualization | Learning Hierarchies | Gagné (1985) |
| Learning Path Generation | Instructional Sequencing | Reigeluth (1999) |
| Threshold Concepts | Threshold Concepts | Meyer & Land (2003) |
| Cognitive Load Estimation | Cognitive Load Theory | Sweller (1988) |
| Assessment Suggestions | Constructive Alignment | Biggs (1996) |
| Scaffolding Guidance | Scaffolding/ZPD | Vygotsky, Wood/Bruner/Ross (1976) |
| Common Misconceptions | Conceptual Change | Posner et al. (1982) |
| Transfer Domains | Transfer of Learning | Perkins & Salomon (1988) |
| IRT Difficulty | Item Response Theory | Lord (1980) |

---

## See Also

- [For Teachers](./For-Teachers.md) – AI-powered teaching tools
- [For Students](./For-Students.md) – AI-powered learning tools
- [Learner State Features](./Learner-State-Features.md) – Progress tracking features
- [Neo4J Architecture](./Neo4J_Educational_Architecture.md) – Technical implementation
