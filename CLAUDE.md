# HyperBookLM / LearnGraph - Claude Code Context

## Project Overview

HyperBookLM (LearnGraph) is an educational AI platform that transforms content into interactive learning experiences using knowledge graphs, RAG, and AI-powered study tools.

---

## Gemini Model Configuration

### Text Generation Models

| Model | Model ID | Use Case | Pricing (Input/Output per 1M tokens) |
|-------|----------|----------|--------------------------------------|
| **Gemini 3.0 Flash** (Default) | `gemini-3-flash-preview` | Fast responses, study tools, chat | $0.10 / $0.40 |
| Gemini 3.0 Pro | `gemini-3-pro-preview` | Complex reasoning, detailed content | $1.25 / $5.00 |

### Image Generation Models

| Model | Model ID | Use Case | Pricing |
|-------|----------|----------|---------|
| **Gemini 3.0 Pro Image** (Default) | `gemini-3-pro-image-preview` | High-quality illustrated artifacts | ~$0.02/image |
| Gemini 2.5 Flash Image | `gemini-2.5-flash-image` | Fast, cost-effective visuals | ~$0.01/image |

### Environment Variables

```env
# Required
GEMINI_API_KEY=your-api-key

# Optional - Override defaults
GEMINI_MODEL=gemini-3-flash-preview
GEMINI_IMAGE_MODEL=gemini-3-pro-image-preview
```

### Model Selection Logic

```typescript
// Text generation
const textModel = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

// Image generation
const imageModel = process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview';
```

---

## AI Study Tools & Visual Artifacts

### For Students (5 Tools)

| Tool | Purpose | Visual Artifacts Available |
|------|---------|---------------------------|
| Study Guide Generator | Structured study notes | Visual Summary, Memory Aid, Concept Map, Cheat Sheet |
| Practice Question Generator | Self-testing questions | Visual Quiz, Flashcards, Difficulty Ladder, Answer Key Poster |
| Concept Explainer | Multi-level explanations | Illustrated Explainer, Analogy Illustration, Comic Strip, Annotated Diagram |
| Misconception Addresser | Common mistake correction | Myth vs Fact, Common Mistakes Poster, Spot the Error, Aha Moment |
| Prerequisite Checker | Readiness assessment | Learning Roadmap, Building Blocks, Readiness Checklist, Connection Map |

### For Teachers (6 Tools)

| Tool | Purpose | Visual Artifacts Available |
|------|---------|---------------------------|
| Study Guide Generator | Handout materials | Handout Design, Anchor Chart, Chapter Overview, Note-taking Template |
| Practice Question Generator | Assessment creation | Assessment Sheet, Game Board, Challenge Cards, Rubric Visual |
| Lesson Plan Generator | Lesson planning | Lesson Timeline, Objectives Poster, Activity Cards, Classroom Setup |
| Concept Explainer | Differentiated instruction | Teaching Poster, Slide Deck Visual, Scaffolding Ladder, Bridge Diagram |
| Misconception Addresser | Proactive teaching | Warning Poster, Diagnostic Visual, Discussion Prompt, Fix-It Guide |
| Prerequisite Checker | Gap diagnosis | Pre-Assessment Visual, Curriculum Map, Remediation Flowchart, Gap Analysis |

### Curriculum Features (4 Key Visualizations)

| Feature | Visual Artifacts Available |
|---------|---------------------------|
| Curriculum Overview | Learning Mountain, Bloom's Pyramid, Pacing Calendar, Standards Map |
| Threshold Concepts | Gateway Diagram, Key Concept Poster, Unlock Path, Transformation Visual |
| Cognitive Load | Brain Load Meter, Chunking Diagram, Balance Visual, Difficulty Spectrum |
| Learning Path | Journey Map, Level Progression, Skill Tree, Milestone Markers |

---

## Architecture

### Tech Stack
- **Frontend**: Next.js 15, React 19, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Supabase (PostgreSQL + pgvector)
- **Knowledge Graph**: Neo4J AuraDB
- **AI**: Google Gemini API
- **Embeddings**: OpenAI text-embedding-3-small

### Key Directories
```
/app
  /(dashboard)/notebooks/[id]/
    - page.tsx           # Main notebook workspace
    - curriculum/        # 10 content-only features
    - for-teachers/      # 6 AI teaching tools
    - for-students/      # 5 AI study tools
  /api/
    /chat/              # RAG-enhanced chat
    /notebooks/[id]/
      /graph/           # Knowledge graph operations
      /learning-path/   # Curriculum & learning paths
      /learner/         # BKT mastery tracking
      /artifacts/       # Visual artifact generation

/lib
  /pipeline/            # Content processing
  /graph/               # Neo4J operations
  /supabase/            # Database clients
```

---

## Educational Psychology Foundations

The platform is built on research-backed educational psychology:

| Theory | Application | Researcher |
|--------|-------------|------------|
| Bloom's Taxonomy | Curriculum organization by cognitive level | Anderson & Krathwohl (2001) |
| Cognitive Load Theory | Complexity estimation, chunking | Sweller (1988) |
| Item Response Theory | Question difficulty calibration | Lord (1980) |
| Threshold Concepts | Identifying transformative knowledge | Meyer & Land (2003) |
| Bayesian Knowledge Tracing | Mastery probability tracking | Corbett & Anderson (1995) |
| SM-2 Algorithm | Spaced repetition scheduling | Wozniak (1987) |
| Zone of Proximal Development | Adaptive scaffolding | Vygotsky (1978) |

---

## Versioning

**IMPORTANT: Always update the version when pushing to GitHub.**

The app version is displayed in the UI header. When making significant changes and pushing to GitHub:

1. **Update `package.json`** - Increment the version number following semver:
   - Patch (0.2.0 → 0.2.1): Bug fixes
   - Minor (0.2.0 → 0.3.0): New features
   - Major (0.2.0 → 1.0.0): Breaking changes

2. **Update the UI badge** in `app/(dashboard)/layout.tsx`:
   ```tsx
   <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-mono">vX.Y.Z</span>
   ```

Current version location:
- `package.json` line 3: `"version": "X.Y.Z"`
- `app/(dashboard)/layout.tsx`: Version badge in header

---

## Commands

```bash
# Development
npm run dev -- -p 3001   # Start dev server (ALWAYS use port 3001)
npm run build            # Production build
npm run lint             # Run ESLint

# Database
yarn db:migrate       # Run Supabase migrations
yarn db:types         # Generate TypeScript types
```

### Dev Server Port
**Always use port 3001** for the development server. If port 3001 is in use, kill the process first:
```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null
npm run dev -- -p 3001
```

---

## API Endpoints

### Chat & RAG
- `POST /api/chat` - RAG-enhanced chat with streaming

### Notebooks
- `GET/POST /api/notebooks` - List/create notebooks
- `GET/PATCH/DELETE /api/notebooks/[id]` - Notebook CRUD

### Knowledge Graph
- `GET/POST /api/notebooks/[id]/graph` - Graph operations
- `GET /api/notebooks/[id]/graph/learning-path?action=overview` - Curriculum overview

### Learner State
- `GET /api/notebooks/[id]/learner?action=zpd` - Zone of Proximal Development
- `GET /api/notebooks/[id]/learner?action=due` - Spaced repetition due items
- `POST /api/notebooks/[id]/learner` - Record practice attempt

### Visual Artifacts
- `POST /api/notebooks/[id]/artifacts` - Generate illustrated artifact
