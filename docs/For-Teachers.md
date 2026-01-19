# AI-Powered Tools for Teachers

> Generate teaching materials grounded in educational psychology research.

These tools use the knowledge graph combined with AI to generate research-backed teaching materials. Each tool leverages the extracted skill data (Bloom levels, prerequisites, misconceptions, IRT parameters) to produce educationally sound content.

---

## 1. Study Guide Generator

**What it does:** Generates comprehensive study guides that show teachers exactly what students need to know for each skill.

**How teachers use it:**
- See the complete scope of each skill
- Identify key concepts to emphasize
- Create handouts for students
- Develop review materials

**Educational Psychology:**

| Theory | How It's Applied |
|--------|------------------|
| **Bloom's Taxonomy** | Content organized by cognitive level |
| **Prerequisite Learning (Gagné)** | Required background knowledge listed |
| **Cognitive Load Theory (Sweller)** | Information chunked appropriately |
| **Conceptual Change (Posner)** | Misconceptions explicitly addressed |

**What's generated:**
- Key concepts and definitions
- Prerequisite review section
- Examples and non-examples
- Practice questions aligned to Bloom level
- Common misconceptions to avoid

**API:** `POST /api/notebooks/[id]/generate/study-guide`

---

## 2. Practice Question Generator

**What it does:** Creates assessment questions at specific Bloom levels with psychometrically calibrated difficulty.

**How teachers use it:**
- Generate quizzes and tests
- Create differentiated assessments
- Build question banks
- Develop formative assessments

**Educational Psychology:**

| Theory | How It's Applied |
|--------|------------------|
| **Bloom's Taxonomy** | Questions target specific cognitive levels |
| **Item Response Theory (Lord)** | Difficulty calibrated using IRT 3PL model |
| **Testing Effect (Roediger)** | Retrieval practice improves retention |
| **Constructive Alignment (Biggs)** | Questions match instructional objectives |

**What's generated:**
- Questions at each Bloom level (Remember → Create)
- Difficulty targeting using IRT parameters
- Distractors based on common misconceptions
- Answer keys with explanations
- Rubrics for open-ended questions

**Difficulty calibration:**
```
IRT 3PL Model:
- b (difficulty): -3 to +3 scale
- a (discrimination): How well it separates ability levels
- c (guessing): Accounts for random correct answers
```

**API:** `POST /api/notebooks/[id]/generate/questions`

---

## 3. Lesson Plan Generator

**What it does:** Creates complete lesson plans with learning objectives, activities, assessments, and timing based on cognitive load.

**How teachers use it:**
- Plan daily lessons
- Ensure curriculum alignment
- Estimate instructional time
- Design appropriate activities

**Educational Psychology:**

| Theory | How It's Applied |
|--------|------------------|
| **Backward Design (Wiggins & McTighe)** | Start with objectives, then design activities |
| **Cognitive Load Theory (Sweller)** | Pacing based on cognitive demand |
| **Bloom's Taxonomy** | Activities aligned to cognitive level |
| **Scaffolding (Vygotsky, Bruner)** | Gradual release of responsibility built in |
| **Formative Assessment (Black & Wiliam)** | Check for understanding throughout |

**What's generated:**
- Learning objectives (SWBAT statements)
- Prerequisite review/activation
- Direct instruction outline
- Guided practice with scaffolding levels
- Independent practice
- Formative assessment/exit ticket
- Time estimates based on cognitive load
- Differentiation suggestions

**Time estimation based on Cognitive Load:**
| Load Level | Base Time | Adjustment |
|------------|-----------|------------|
| Low | Standard | No adjustment |
| Medium | +25% | Additional practice |
| High | +50% | Worked examples, chunking |

**API:** `POST /api/notebooks/[id]/generate/lesson-plan`

---

## 4. Concept Explainer

**What it does:** Generates explanations at different cognitive levels for differentiated instruction.

**How teachers use it:**
- Prepare multiple explanations for diverse learners
- Create tiered materials
- Develop scaffolded content
- Support struggling students with simpler explanations
- Challenge advanced students with deeper content

**Educational Psychology:**

| Theory | How It's Applied |
|--------|------------------|
| **Differentiated Instruction (Tomlinson)** | Multiple access points to same content |
| **Spiral Curriculum (Bruner)** | Same concept at increasing sophistication |
| **Zone of Proximal Development (Vygotsky)** | Match explanation to learner readiness |
| **Transfer of Learning (Perkins & Salomon)** | Analogies from transfer domains |

**What's generated:**
- Simple explanation (concrete, analogies)
- Standard explanation (grade-appropriate)
- Advanced explanation (technical depth)
- Real-world analogies from transfer domains
- Connections to prerequisite concepts

**Explanation levels:**
| Level | Characteristics | Use Case |
|-------|-----------------|----------|
| Simple | Concrete, everyday analogies | Introduction, struggling learners |
| Standard | Grade-appropriate vocabulary | Core instruction |
| Advanced | Technical precision, nuance | Enrichment, advanced learners |

**API:** `POST /api/notebooks/[id]/generate/explain`

---

## 5. Misconception Addresser

**What it does:** Generates instructional content that directly confronts and corrects common misconceptions.

**How teachers use it:**
- Proactively address misconceptions before they form
- Create targeted interventions
- Develop "myth vs. fact" materials
- Design diagnostic assessments

**Educational Psychology:**

| Theory | How It's Applied |
|--------|------------------|
| **Conceptual Change Theory (Posner et al.)** | Misconceptions must be directly confronted |
| **Refutation Text Research (Tippett)** | Explicit correction more effective than ignoring |
| **Prior Knowledge Activation (Ausubel)** | Surface existing beliefs before teaching |
| **Cognitive Conflict (Piaget)** | Create disequilibrium to motivate change |

**What's generated:**
- The misconception stated clearly
- Why students might believe it (it seems reasonable because...)
- Evidence/reasoning why it's incorrect
- The correct understanding
- Self-check questions to verify understanding
- Instructional strategies to prevent the misconception

**Research insight:** Simply teaching correct information doesn't eliminate misconceptions. Students can hold correct and incorrect beliefs simultaneously. Direct confrontation is required.

**API:** `POST /api/notebooks/[id]/generate/address-misconception`

---

## 6. Prerequisite Checker

**What it does:** Identifies what students need to know before learning a skill and generates diagnostic assessments.

**How teachers use it:**
- Diagnose gaps before teaching new content
- Create pre-assessments
- Design remediation materials
- Plan review activities
- Identify at-risk students

**Educational Psychology:**

| Theory | How It's Applied |
|--------|------------------|
| **Prerequisite Knowledge (Gagné)** | Learning hierarchies define dependencies |
| **Diagnostic Assessment** | Identify specific gaps before instruction |
| **Mastery Learning (Bloom)** | Ensure foundation before advancing |
| **Cognitive Load Theory (Sweller)** | Missing prerequisites increase extraneous load |

**What's generated:**
- List of required prerequisites
- Diagnostic questions for each prerequisite
- Quick scoring guide
- Remediation recommendations
- "Ready to learn" checklist

**Prerequisite relationship types:**
| Type | Meaning | Action if Missing |
|------|---------|-------------------|
| Required | Must know | Stop and remediate |
| Recommended | Helps significantly | Brief review |
| Helpful | Provides context | Optional mention |

**Research insight:** Studies show 50%+ of learning failures trace to missing prerequisites, not inability to learn new content.

**API:** `POST /api/notebooks/[id]/generate/prereq-check`

---

## Quick Reference: Educational Psychology Foundations

| Tool | Primary Theories | Key Researchers |
|------|------------------|-----------------|
| Study Guide Generator | Bloom's, CLT, Conceptual Change | Anderson, Sweller, Posner |
| Practice Question Generator | Bloom's, IRT, Testing Effect | Anderson, Lord, Roediger |
| Lesson Plan Generator | Backward Design, CLT, Scaffolding | Wiggins/McTighe, Sweller, Vygotsky |
| Concept Explainer | Differentiation, Spiral Curriculum | Tomlinson, Bruner |
| Misconception Addresser | Conceptual Change, Refutation Text | Posner, Tippett |
| Prerequisite Checker | Learning Hierarchies, Mastery Learning | Gagné, Bloom |

---

## See Also

- [Content-Only Features](./Content-Only-Features.md) – 10 features that power these tools
- [For Students](./For-Students.md) – Student-facing versions of these tools
- [Learner State Features](./Learner-State-Features.md) – Progress tracking features
