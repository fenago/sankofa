# LearnGraph (jali): Competitive Positioning Strategy

## Executive Summary

**LearnGraph** is the world's first **AI-powered learning path generator** that transforms any educational content—syllabi, textbooks, learning objectives—into a structured knowledge graph optimized for personalized learning. Available as `jali` on npm, our platform empowers educators to create **mastery-based learning paths** by automatically decomposing content into skills, competencies, and their prerequisite relationships, all grounded in proven educational psychology frameworks like Zone of Proximal Development (ZPD), Bloom's Taxonomy, and spaced repetition.

## Market Positioning Statement

**"For educators who want every student to succeed, LearnGraph is the AI-powered curriculum architect that transforms your teaching materials into personalized mastery paths. Stop guessing what students need next—let the knowledge graph show you exactly where they are and what they're ready to learn. Every Student's Path to Mastery."**

---

## The Problem We Solve

### The Learning Gap Crisis

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        THE HIDDEN LEARNING CRISIS                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Traditional Education          vs.        What Students Need           │
│   ─────────────────────                    ────────────────────          │
│                                                                          │
│   📚 Linear Curriculum                     🎯 Personalized Paths         │
│   One path for everyone                    Paths based on readiness      │
│                                                                          │
│   ❓ Unknown Prerequisites                 🔗 Clear Prerequisites         │
│   "You should know this already"           "First, master X, then Y"     │
│                                                                          │
│   📝 Time-Based Progression                ✅ Mastery-Based Progression  │
│   "Chapter 5 is next week"                 "Move on when you're ready"   │
│                                                                          │
│   🎲 Guessing Student Readiness            📊 Precise ZPD Identification │
│   "I think they're ready..."               "Data shows they need..."     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**The core problem:** Educators have no systematic way to:
1. **Decompose curriculum** into discrete, measurable skills
2. **Map prerequisites** to understand the true path to mastery
3. **Identify each student's Zone of Proximal Development** in real-time
4. **Personalize instruction** based on actual readiness, not assumptions

---

## Competitive Landscape: The EdTech Ecosystem

Our competition exists across multiple categories. Our strategy is to integrate with, enhance, and differentiate from each.

| Competitor | Category | Their Strength | Their Weakness (Our Opportunity) |
|---|---|---|---|
| **Khan Academy** | Adaptive Learning Platform | Excellent content library, proven mastery system | **Closed ecosystem.** You use THEIR content, not yours. Educators can't import their own curriculum. |
| **Knewton / McGraw-Hill ALEKS** | Adaptive Learning Engines | Sophisticated algorithms, large datasets | **Vendor lock-in.** Proprietary, expensive, works only with their textbooks. Not open source. |
| **Neo4j / Graph Databases** | Infrastructure | Powerful graph technology | **Not education-specific.** Requires deep technical expertise. No educational psychology built in. |
| **LangChain / LlamaIndex** | LLM Frameworks | Flexible, LLM-agnostic | **No educational structure.** Generic RAG, no ZPD, no Bloom's, no learning paths. |
| **Notion / Roam / Obsidian** | Knowledge Management | Great for personal knowledge | **Not for learning paths.** No prerequisites, no mastery tracking, no assessments. |
| **Canvas / Blackboard / Moodle** | Learning Management Systems | Industry standard, widely adopted | **Content silos.** Great at managing courses, terrible at understanding learning relationships. |

### Where LearnGraph Fits

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         THE EDTECH STACK                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ PRESENTATION LAYER: Canvas, Moodle, Custom Apps, LMS              │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              ▲                                           │
│                              │                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ ★★★ LEARNGRAPH (jali) ★★★                                         │ │
│  │                                                                    │ │
│  │ • Skill/Competency Decomposition                                  │ │
│  │ • Prerequisite Relationship Mapping                               │ │
│  │ • ZPD Identification Engine                                       │ │
│  │ • Bloom's Taxonomy Classification                                 │ │
│  │ • Assessment Recommendations                                      │ │
│  │ • Spaced Repetition Scheduling                                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              ▲                                           │
│                              │                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ AI LAYER: Any LLM/SLM (OpenAI, Claude, Llama, Mistral, etc.)      │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              ▲                                           │
│                              │                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ STORAGE LAYER: Neo4j (Production) or LevelGraph (Browser/Local)   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**LearnGraph is the missing middleware** that connects AI capabilities to educational best practices and graph storage.

---

## Unique Value Propositions (UVPs)

### 1. AI-Powered Curriculum Decomposition (Category Creator)

**The Problem:** Educators spend hundreds of hours manually breaking down curriculum into teachable chunks. Even then, they often miss hidden prerequisites.

**Our Solution:** Feed any educational content to LearnGraph, and our AI automatically:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     CURRICULUM DECOMPOSITION ENGINE                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  INPUT: "Chapter 7: Derivatives in Calculus"                            │
│  ─────────────────────────────────────────────                          │
│                              │                                           │
│                              ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                         LLM PROCESSING                              │ │
│  │  • Extract concepts, skills, and competencies                      │ │
│  │  • Identify explicit and IMPLICIT prerequisites                    │ │
│  │  • Classify by Bloom's Taxonomy level                              │ │
│  │  • Suggest assessments for each skill                              │ │
│  │  • Map to existing graph nodes (avoid duplicates)                  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│                              ▼                                           │
│  OUTPUT: Structured Knowledge Graph                                      │
│  ──────────────────────────────────                                      │
│                                                                          │
│      [Limits]──PREREQUISITE_OF──▶[Derivatives]                          │
│         │                            │                                   │
│         │                            ├──▶[Power Rule]                   │
│         │                            ├──▶[Chain Rule]                   │
│         │                            └──▶[Product Rule]                 │
│         │                                                                │
│      [Algebra]──PREREQUISITE_OF──▶[Limits]                              │
│         │                                                                │
│      [Functions]──PREREQUISITE_OF──▶[Limits]                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. Educational Psychology Built-In (Not Bolted-On)

**Every node and relationship in LearnGraph carries educational psychology metadata:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SKILL NODE: "Understanding Derivatives"               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  📊 BLOOM'S TAXONOMY LEVEL: "Apply" (Level 3)                           │
│     ────────────────────────────────────────                            │
│     Remember → Understand → [APPLY] → Analyze → Evaluate → Create       │
│                                                                          │
│  🎯 ZONE OF PROXIMAL DEVELOPMENT                                        │
│     ──────────────────────────────                                      │
│     • Can Do Alone: Identify derivative notation                        │
│     • ZPD (With Help): Apply power rule to polynomials                  │
│     • Cannot Yet: Derive chain rule applications                        │
│                                                                          │
│  📅 SPACED REPETITION SCHEDULE                                          │
│     ─────────────────────────────                                       │
│     • Initial: Day 1                                                    │
│     • Review 1: Day 3 (2-day gap)                                       │
│     • Review 2: Day 7 (4-day gap)                                       │
│     • Review 3: Day 14 (7-day gap)                                      │
│     • Long-term: Day 30, Day 60, Day 90                                 │
│                                                                          │
│  🏗️ INSTRUCTIONAL SCAFFOLDING                                          │
│     ─────────────────────────────                                       │
│     Level 1: Worked examples with full solutions                        │
│     Level 2: Partial solutions, student completes                       │
│     Level 3: Hints available on request                                 │
│     Level 4: Independent problem-solving                                │
│                                                                          │
│  ✅ MASTERY ASSESSMENTS                                                  │
│     ─────────────────────                                               │
│     • Formative: Quick check (3 problems, 80% threshold)               │
│     • Summative: Comprehensive (10 problems, 85% threshold)            │
│     • Performance: Real-world application task                          │
│                                                                          │
│  📝 EVIDENCE OF LEARNING                                                 │
│     ─────────────────────                                               │
│     • Problem sets with work shown                                      │
│     • Peer teaching transcript                                          │
│     • Self-explanation recording                                        │
│     • Application project                                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3. LLM-Agnostic / Graph-Agnostic Architecture

**The Key Insight:** Educational psychology and learning science are INDEPENDENT of the underlying technology. LearnGraph provides standardized schemas that work with:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      TECHNOLOGY FLEXIBILITY                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  🤖 ANY LLM/SLM                    💾 ANY GRAPH STORAGE                  │
│  ─────────────                     ─────────────────────                 │
│  • OpenAI GPT-4/4o                 • Neo4j (Production)                 │
│  • Anthropic Claude                • LevelGraph (Browser)               │
│  • Meta Llama 3                    • ArangoDB                           │
│  • Mistral                         • Amazon Neptune                     │
│  • Google Gemini                   • TigerGraph                         │
│  • Local Ollama models             • In-memory (testing)                │
│  • Any OpenAI-compatible API       • Custom adapters                    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                                                                     ││
│  │   Your LLM ──▶ [LearnGraph Schemas] ──▶ Your Graph Database        ││
│  │                        │                                            ││
│  │                        ▼                                            ││
│  │              Standardized, Portable,                                ││
│  │              Education-First Data Model                             ││
│  │                                                                     ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4. The 3-Minute Curriculum Architect

**From syllabus to knowledge graph in three steps:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SIMPLE EDUCATOR WORKFLOW                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  STEP 1: Upload Your Content                     ⏱️ 30 seconds          │
│  ───────────────────────────                                            │
│  • Paste syllabus text                                                  │
│  • Upload PDF chapter                                                   │
│  • Link to learning objectives document                                 │
│  • Paste curriculum standards                                           │
│                                                                          │
│                              │                                           │
│                              ▼                                           │
│                                                                          │
│  STEP 2: AI Decomposes                           ⏱️ 60-90 seconds       │
│  ────────────────────                                                   │
│  • Skills extracted automatically                                       │
│  • Prerequisites identified                                             │
│  • Bloom's levels assigned                                              │
│  • Connections to existing graph found                                  │
│                                                                          │
│                              │                                           │
│                              ▼                                           │
│                                                                          │
│  STEP 3: Review & Refine                         ⏱️ 60 seconds          │
│  ──────────────────────                                                 │
│  • Visual graph preview                                                 │
│  • Drag-drop to adjust relationships                                    │
│  • Add/remove nodes as needed                                           │
│  • Approve and save                                                     │
│                                                                          │
│  ════════════════════════════════════════════════════════════════════   │
│  RESULT: Complete knowledge graph with ZPD markers,                     │
│          Bloom's classifications, and assessment recommendations        │
│  ════════════════════════════════════════════════════════════════════   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Target Audience: The Modern Educator

### Primary Users

| Persona | Description | Key Pain Points | How LearnGraph Helps |
|---------|-------------|-----------------|---------------------|
| **Curriculum Developer** | Designs courses, learning paths, standards alignment | Manual prerequisite mapping is tedious and error-prone | Automates decomposition and relationship mapping |
| **Classroom Teacher** | Delivers instruction, assesses students daily | Can't personalize for 30 students with different readiness levels | ZPD identification shows exactly where each student is |
| **Instructional Designer** | Creates online courses, corporate training | No way to ensure logical learning progression | Graph ensures prerequisites are always covered first |
| **EdTech Developer** | Builds learning apps and platforms | Reinventing the wheel for learning paths | Drop-in npm package with schemas and adapters |
| **Tutor / Learning Coach** | 1:1 or small group instruction | Diagnosing gaps takes too long | Graph shows prerequisite gaps instantly |

### Secondary Users

- **School Administrators:** District-wide curriculum alignment
- **Corporate L&D Teams:** Skills gap analysis and training paths
- **Self-Learners:** Personal knowledge mapping

---

## How LearnGraph Works (The Technical Edge)

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      LEARNGRAPH HIGH-LEVEL ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────────────┐│
│  │  EDUCATOR   │     │  LEARNER    │     │  EDTECH DEVELOPER           ││
│  │  (Creator)  │     │  (Consumer) │     │  (Integrator)               ││
│  └──────┬──────┘     └──────┬──────┘     └───────────┬─────────────────┘│
│         │                   │                        │                   │
│         ▼                   ▼                        ▼                   │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                        LEARNGRAPH API                                ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────────┐  ││
│  │  │ Decompose   │ │ Query ZPD   │ │ Get Path    │ │ Assess        │  ││
│  │  │ Content     │ │ for Learner │ │ to Mastery  │ │ Readiness     │  ││
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └───────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                              │                                           │
│         ┌────────────────────┼────────────────────┐                     │
│         ▼                    ▼                    ▼                     │
│  ┌─────────────┐     ┌─────────────────┐   ┌──────────────────┐        │
│  │ LLM Adapter │     │ Schema Engine   │   │ Graph Adapter    │        │
│  │             │     │                 │   │                  │        │
│  │ • OpenAI    │     │ • Node Schemas  │   │ • Neo4j          │        │
│  │ • Claude    │     │ • Edge Schemas  │   │ • LevelGraph     │        │
│  │ • Llama     │     │ • Validation    │   │ • Custom         │        │
│  │ • Custom    │     │ • Transforms    │   │                  │        │
│  └─────────────┘     └─────────────────┘   └──────────────────┘        │
│         │                    │                    │                     │
│         └────────────────────┼────────────────────┘                     │
│                              ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                     KNOWLEDGE GRAPH                                  ││
│  │  [Skills] ──prerequisites──▶ [Skills]                               ││
│  │  [Learner] ──has_mastery──▶ [Skill]                                 ││
│  │  [Skill] ──assessed_by──▶ [Assessment]                              ││
│  │  [Skill] ──scaffolded_by──▶ [Scaffold]                              ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### The Graph Schema (Core Data Model)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       LEARNGRAPH SCHEMA DESIGN                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ╔═══════════════════════════════════════════════════════════════════╗  │
│  ║                         NODE TYPES                                 ║  │
│  ╠═══════════════════════════════════════════════════════════════════╣  │
│  ║                                                                    ║  │
│  ║  🎯 SKILL                           📚 CONTENT_SOURCE              ║  │
│  ║  ────                               ─────────────────             ║  │
│  ║  • id: UUID                         • id: UUID                    ║  │
│  ║  • name: string                     • title: string               ║  │
│  ║  • description: string              • type: syllabus|chapter|     ║  │
│  ║  • bloom_level: 1-6                         objective|standard   ║  │
│  ║  • estimated_time: minutes          • source_text: string         ║  │
│  ║  • difficulty: 1-10                 • created_at: timestamp       ║  │
│  ║  • keywords: string[]                                             ║  │
│  ║                                                                    ║  │
│  ║  👤 LEARNER                         📝 ASSESSMENT                  ║  │
│  ║  ───────                            ─────────────                 ║  │
│  ║  • id: UUID                         • id: UUID                    ║  │
│  ║  • profile: object                  • skill_id: UUID              ║  │
│  ║  • learning_style: string           • type: formative|summative  ║  │
│  ║  • pace_preference: string          • questions: object[]         ║  │
│  ║                                     • mastery_threshold: 0-100    ║  │
│  ║                                                                    ║  │
│  ║  🏗️ SCAFFOLD                       📊 MASTERY_RECORD              ║  │
│  ║  ────────                          ────────────────               ║  │
│  ║  • id: UUID                         • learner_id: UUID            ║  │
│  ║  • skill_id: UUID                   • skill_id: UUID              ║  │
│  ║  • level: 1-4                       • status: learning|mastered  ║  │
│  ║  • content: string                  • score: 0-100                ║  │
│  ║  • support_type: worked_example|    • attempts: number            ║  │
│  ║                  hint|partial|none  • last_review: timestamp      ║  │
│  ║                                     • next_review: timestamp      ║  │
│  ║                                                                    ║  │
│  ╚═══════════════════════════════════════════════════════════════════╝  │
│                                                                          │
│  ╔═══════════════════════════════════════════════════════════════════╗  │
│  ║                         EDGE TYPES                                 ║  │
│  ╠═══════════════════════════════════════════════════════════════════╣  │
│  ║                                                                    ║  │
│  ║  PREREQUISITE_OF                    EXTRACTED_FROM                 ║  │
│  ║  ───────────────                    ───────────────                ║  │
│  ║  (Skill)──▶(Skill)                  (Skill)──▶(ContentSource)     ║  │
│  ║  • strength: 0-1 (required/helpful) • confidence: 0-1             ║  │
│  ║  • type: required|recommended       • extracted_at: timestamp     ║  │
│  ║                                                                    ║  │
│  ║  HAS_MASTERY                        ASSESSED_BY                    ║  │
│  ║  ────────────                       ───────────                   ║  │
│  ║  (Learner)──▶(Skill)                (Skill)──▶(Assessment)        ║  │
│  ║  • level: 0-100                     • weight: 0-1                  ║  │
│  ║  • confidence: 0-1                                                 ║  │
│  ║  • last_assessed: timestamp                                        ║  │
│  ║                                                                    ║  │
│  ║  SCAFFOLDED_BY                      IN_ZPD_FOR                     ║  │
│  ║  ─────────────                      ───────────                   ║  │
│  ║  (Skill)──▶(Scaffold)               (Skill)──▶(Learner)           ║  │
│  ║  • level: 1-4                       • calculated_at: timestamp    ║  │
│  ║                                     • confidence: 0-1              ║  │
│  ║                                                                    ║  │
│  ╚═══════════════════════════════════════════════════════════════════╝  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Go-to-Market Strategy: Developer-First, Educator-Validated

### Phase 1: Open Source Foundation (Months 1-3)

**Goal:** Establish LearnGraph as the standard for educational knowledge graphs

1. **npm Launch**
   - Publish `jali` to npmjs.com
   - Comprehensive documentation with tutorials
   - Example implementations for common LLMs
   - Neo4j and LevelGraph adapters out of the box

2. **Developer Community**
   - GitHub repository with MIT license
   - Discord server for support and discussion
   - Weekly "office hours" for contributors
   - Bounties for community-built adapters

3. **Educator Validation**
   - Partner with 10 educators for beta testing
   - Document real-world use cases
   - Collect testimonials and case studies

### Phase 2: Ecosystem Growth (Months 4-6)

**Goal:** Make LearnGraph indispensable

1. **Integration Library**
   - Canvas LMS plugin
   - Moodle integration
   - Google Classroom connector
   - Notion API bridge

2. **Schema Registry**
   - Community-contributed schemas
   - Domain-specific templates (K-12, Higher Ed, Corporate)
   - Standards alignment (Common Core, NGSS, etc.)

3. **Showcase Applications**
   - Build 2-3 reference applications
   - Open-source tutoring system
   - Curriculum planning tool
   - Student progress dashboard

### Phase 3: Commercial Layer (Months 7-12)

**Goal:** Sustainable business model

1. **Hosted Service**
   - LearnGraph Cloud: managed Neo4j + API
   - Usage-based pricing
   - SOC2 compliance for enterprise

2. **Enterprise Features**
   - Multi-tenant architecture
   - SSO/SAML integration
   - Audit logging
   - Custom LLM endpoints

3. **Professional Services**
   - Curriculum migration consulting
   - Custom integration development
   - Training and certification

---

## Monetization Strategy

### Open Core Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        MONETIZATION TIERS                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  🆓 OPEN SOURCE (MIT License)                                           │
│  ════════════════════════════                                           │
│  ✓ Core schemas and validation                                          │
│  ✓ Neo4j and LevelGraph adapters                                        │
│  ✓ Basic LLM decomposition prompts                                      │
│  ✓ CLI tools                                                            │
│  ✓ Community support                                                    │
│                                                                          │
│  💼 PRO ($29/month per educator)                                        │
│  ═══════════════════════════════                                        │
│  Everything in Open Source, plus:                                       │
│  ✓ Advanced decomposition prompts                                       │
│  ✓ Pre-built assessment templates                                       │
│  ✓ Visual graph editor (web UI)                                         │
│  ✓ Export to LMS formats (LTI, SCORM, xAPI)                             │
│  ✓ Email support (48hr response)                                        │
│                                                                          │
│  🏢 ENTERPRISE (Custom pricing)                                         │
│  ═════════════════════════════                                          │
│  Everything in Pro, plus:                                               │
│  ✓ LearnGraph Cloud (managed infrastructure)                            │
│  ✓ SSO/SAML integration                                                 │
│  ✓ Custom LLM endpoints (your models)                                   │
│  ✓ Dedicated support (4hr response)                                     │
│  ✓ SLA guarantees                                                       │
│  ✓ On-premise deployment option                                         │
│  ✓ Training and implementation support                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Building a Defensible Moat

### Moat Layer 1: Schema Network Effects

Every educator who uses LearnGraph contributes to a growing ecosystem:

- **Shared skill ontologies:** Math skills from one educator connect to science skills from another
- **Community schemas:** Domain experts create and share specialized schemas
- **Cross-institutional graphs:** Skills graph becomes more valuable as it grows

### Moat Layer 2: Data Moat

As more content is decomposed:

- **Better prompts:** LLM decomposition improves with more examples
- **Prerequisite patterns:** We learn universal prerequisite relationships
- **Assessment effectiveness:** Data on what assessments work best

### Moat Layer 3: Integration Ecosystem

Deep integrations create switching costs:

- **LMS plugins** that educators depend on
- **Workflow automation** that becomes embedded in curriculum design
- **Student data** that lives in the graph

### Moat Layer 4: Community

The educator community becomes a moat:

- **Shared resources** that only exist on LearnGraph
- **Peer support** that's hard to replicate
- **Professional identity** as a "LearnGraph educator"

---

## Why We Win

1. **We are open source first.** Educators and developers trust us because they can inspect, modify, and own the code.

2. **We are schema-focused, not feature-focused.** The data model is the product. Features are just interfaces to the model.

3. **We are LLM-agnostic.** As AI evolves, LearnGraph adapts. We're not locked to any provider.

4. **We are built on proven educational psychology.** ZPD, Bloom's, spaced repetition—these aren't buzzwords. They're the foundation.

5. **We solve a real, painful problem.** Educators waste hundreds of hours on curriculum decomposition. We give them back that time.

**LearnGraph is not just a tool. It's the infrastructure for personalized learning at scale.**

---

## Appendix: Licensing Summary

| Component | License | Commercial Use | Distribution via npm |
|-----------|---------|----------------|---------------------|
| `jali` (LearnGraph core) | MIT | ✅ Yes | ✅ Yes |
| `neo4j-driver` | Apache 2.0 | ✅ Yes | ✅ Yes (dependency) |
| Neo4j Community Edition | GPL v3 | ✅ Yes (separate install) | ❌ Not bundled |
| LevelGraph | MIT | ✅ Yes | ✅ Yes (bundled) |

**Key Insight:** The `jali` npm package contains only MIT/Apache 2.0 licensed code. Users install Neo4j separately if they want production-grade graph storage. LevelGraph is bundled for browser/local use.

---

## Sources

- [Neo4j Licensing](https://neo4j.com/licensing/)
- [neo4j-driver npm](https://www.npmjs.com/package/neo4j-driver/v/5.13.0)
- [LevelGraph GitHub](https://github.com/levelgraph/levelgraph)
- [LevelGraph npm](https://www.npmjs.com/package/levelgraph)
