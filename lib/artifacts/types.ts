// Visual Artifact Types for AI-Generated Educational Content

export interface ArtifactType {
  id: string
  name: string
  icon: string
  description: string
  promptTemplate: (skillName: string, skillDescription?: string, context?: string) => string
}

export interface ToolArtifacts {
  toolId: string
  artifacts: ArtifactType[]
}

// ============================================
// FOR STUDENTS - Artifact Types
// ============================================

export const studentArtifacts: Record<string, ArtifactType[]> = {
  'study-guide': [
    {
      id: 'visual-summary',
      name: 'Visual Summary',
      icon: '📊',
      description: 'One-page illustrated recap of key concepts',
      promptTemplate: (skill, desc) => `Create an ILLUSTRATED VISUAL SUMMARY for studying "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a single-page visual study aid that includes:
1. A central illustrated concept showing the main idea
2. 3-4 key points with simple icons or illustrations for each
3. A memorable visual mnemonic or metaphor
4. Color-coded sections for different aspects
5. Simple diagrams or flowcharts where helpful

Style: Clean, educational infographic style with clear labels. Use friendly colors and simple illustrations that a student would find engaging and easy to remember. Include visual hierarchy to show importance.

Make it something a student would want to print out and put on their wall.`,
    },
    {
      id: 'memory-aid',
      name: 'Memory Aid',
      icon: '🧠',
      description: 'Mnemonic illustration to help remember',
      promptTemplate: (skill, desc) => `Create a MEMORY AID illustration for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a creative visual mnemonic that helps students remember this concept:
1. Create a memorable visual metaphor or analogy
2. Use a clever acronym or phrase with illustrated letters
3. Include a "memory palace" style scene if appropriate
4. Add visual associations between key elements
5. Make it quirky/funny enough to be memorable

Style: Fun, memorable, slightly whimsical. The kind of image that sticks in your head. Think "I'll never forget this because of that picture."`,
    },
    {
      id: 'concept-map',
      name: 'Concept Map',
      icon: '🗺️',
      description: 'Visual map of ideas and connections',
      promptTemplate: (skill, desc) => `Create an illustrated CONCEPT MAP for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a visual concept map showing:
1. The main concept in the center with an icon/illustration
2. Related sub-concepts branching out with connecting lines
3. Relationship labels on the connections
4. Color coding for different categories of concepts
5. Small illustrations or icons for each node
6. Prerequisites shown feeding in, outcomes shown flowing out

Style: Clean educational diagram with illustrations. Use a consistent visual language. Make connections clear and labeled.`,
    },
    {
      id: 'cheat-sheet',
      name: 'Cheat Sheet',
      icon: '📋',
      description: 'Quick reference poster with key facts',
      promptTemplate: (skill, desc) => `Create an illustrated CHEAT SHEET for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a quick-reference visual guide including:
1. Key formulas/rules in highlighted boxes
2. Step-by-step process with numbered illustrations
3. "Do's and Don'ts" section with visual indicators
4. Common examples with illustrations
5. Quick tips in callout boxes
6. Warning signs for common mistakes

Style: Dense but organized reference sheet. Use icons, color coding, and visual hierarchy. Should be scannable in seconds but comprehensive enough to be useful.`,
    },
  ],

  'practice-questions': [
    {
      id: 'visual-quiz',
      name: 'Visual Quiz',
      icon: '🎯',
      description: 'Illustrated practice questions',
      promptTemplate: (skill, desc) => `Create an illustrated VISUAL QUIZ for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate 5 illustrated quiz questions:
1. Each question should have a visual component (diagram, scenario illustration, etc.)
2. Mix question types: identify, compare, apply, analyze
3. Include visual answer choices where appropriate
4. Add small illustrations that make the questions engaging
5. Include a separate illustrated answer key section

Style: Clean, test-like but visually engaging. Each question should have supporting imagery that's integral to answering it.`,
    },
    {
      id: 'flashcards',
      name: 'Flashcards',
      icon: '🃏',
      description: 'Image-based Q&A cards',
      promptTemplate: (skill, desc) => `Create illustrated FLASHCARDS for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a set of 6 visual flashcards:
1. Front side: Question or term with an illustration/icon
2. Back side: Answer with supporting visual
3. Mix of definition, application, and connection cards
4. Each card should be visually distinct
5. Use consistent card frame/design

Style: Card-game aesthetic. Each card should look like it belongs in a study deck. Visuals should be memorable and directly tied to the content.`,
    },
    {
      id: 'difficulty-ladder',
      name: 'Difficulty Ladder',
      icon: '📈',
      description: 'Visual progression from easy to hard',
      promptTemplate: (skill, desc) => `Create a DIFFICULTY LADDER illustration for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a visual showing question progression:
1. A ladder/staircase visual with 5 levels
2. Each level shows a sample question type
3. Illustrations showing increasing complexity
4. Visual indicators of what makes each level harder
5. "You are here" marker concept for self-assessment

Style: Game-like progression visual. Should feel like leveling up in a game. Clear visual distinction between levels.`,
    },
    {
      id: 'answer-key-poster',
      name: 'Answer Key Poster',
      icon: '✅',
      description: 'Visual solutions guide',
      promptTemplate: (skill, desc) => `Create an illustrated ANSWER KEY POSTER for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a visual answer guide showing:
1. Common question types with illustrated solutions
2. Step-by-step visual walkthrough of problem-solving
3. "How to check your answer" visual checklist
4. Common wrong answers with X marks and explanations
5. Correct approach highlighted in green

Style: Clear, instructional. Like a "how to solve it" poster for a classroom wall.`,
    },
  ],

  'concept-explainer': [
    {
      id: 'illustrated-explainer',
      name: 'Illustrated Explainer',
      icon: '🎨',
      description: 'Step-by-step visual explanation',
      promptTemplate: (skill, desc) => `Create an ILLUSTRATED EXPLAINER for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a visual explanation that shows:
1. The concept broken into 4-5 illustrated steps
2. Each step with a clear visual and brief text
3. Arrows or flow showing progression
4. "Before and after" understanding comparison
5. A summary illustration tying it all together

Style: Infographic storytelling. Should feel like a visual journey through the concept. Clear, engaging, educational.`,
    },
    {
      id: 'analogy-illustration',
      name: 'Analogy Illustration',
      icon: '🔄',
      description: 'Real-world comparison visual',
      promptTemplate: (skill, desc) => `Create an ANALOGY ILLUSTRATION for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a visual showing:
1. Split image: abstract concept on one side, real-world analogy on other
2. Visual mapping between elements (arrows, color matching)
3. "This is like..." framing
4. 2-3 different analogies in separate panels
5. Clear labels showing what maps to what

Style: Side-by-side comparison. Should make the abstract concrete. "Aha moment" inducing.`,
    },
    {
      id: 'comic-strip',
      name: 'Comic Strip',
      icon: '📖',
      description: 'Story-based visual explanation',
      promptTemplate: (skill, desc) => `Create a COMIC STRIP explaining "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a 4-6 panel comic that:
1. Introduces a relatable character/scenario
2. Shows the problem or question
3. Walks through the concept with visual storytelling
4. Has a "lightbulb moment" panel
5. Ends with the concept applied/understood
6. Uses speech bubbles and thought bubbles

Style: Friendly comic strip style. Characters should be relatable students. Educational but entertaining.`,
    },
    {
      id: 'annotated-diagram',
      name: 'Annotated Diagram',
      icon: '🔬',
      description: 'Labeled technical drawing',
      promptTemplate: (skill, desc) => `Create an ANNOTATED DIAGRAM for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a detailed technical illustration:
1. Main diagram showing the concept visually
2. Numbered callouts pointing to key parts
3. Detailed annotations explaining each element
4. Zoom-in boxes for complex areas
5. Legend/key for symbols used
6. Scale or reference if applicable

Style: Technical illustration with educational annotations. Clear, precise, but accessible.`,
    },
  ],

  'misconception-addresser': [
    {
      id: 'myth-vs-fact',
      name: 'Myth vs Fact',
      icon: '❌✅',
      description: 'Side-by-side misconception visual',
      promptTemplate: (skill, desc) => `Create a MYTH VS FACT illustration for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a visual comparison showing:
1. Left side (red): Common misconception with illustration
2. Right side (green): Correct understanding with illustration
3. Visual showing why the myth seems reasonable
4. Visual showing why reality is different
5. "The key difference" callout at bottom

Style: Clear contrast. Red/wrong on left, green/right on right. Should immediately show the error.`,
    },
    {
      id: 'common-mistakes-poster',
      name: 'Common Mistakes Poster',
      icon: '🚫',
      description: 'What NOT to do visual guide',
      promptTemplate: (skill, desc) => `Create a COMMON MISTAKES POSTER for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a warning-style poster showing:
1. Top 4 mistakes students make (with X marks)
2. Visual illustration of each mistake
3. "Instead, do this" correct alternative
4. Warning icons and color coding
5. "Check yourself" mini checklist at bottom

Style: Warning poster aesthetic. Should feel like important safety information. Clear, memorable, preventive.`,
    },
    {
      id: 'spot-the-error',
      name: 'Spot the Error',
      icon: '🔍',
      description: 'Interactive-style error finding visual',
      promptTemplate: (skill, desc) => `Create a SPOT THE ERROR illustration for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate an interactive-style visual:
1. A work sample with hidden errors
2. Visual clues that something is wrong
3. "Can you find what's wrong?" framing
4. Separate answer section with errors circled
5. Explanation of why each is wrong

Style: Puzzle/game feel. Should engage students to actively look. Educational detective work.`,
    },
    {
      id: 'aha-moment',
      name: 'Aha Moment',
      icon: '💡',
      description: 'Before/after understanding visual',
      promptTemplate: (skill, desc) => `Create an AHA MOMENT illustration for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a transformation visual showing:
1. "Before" panel: Confused student with wrong mental model
2. "The twist" panel: Key insight that changes understanding
3. "After" panel: Student with correct understanding
4. Visual representation of the mental shift
5. "The key insight" highlighted

Style: Transformation story. Should capture the feeling of suddenly "getting it."`,
    },
  ],

  'prerequisite-checker': [
    {
      id: 'learning-roadmap',
      name: 'Learning Roadmap',
      icon: '🗺️',
      description: 'Path to mastery visualization',
      promptTemplate: (skill, desc) => `Create a LEARNING ROADMAP for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a journey-style map showing:
1. Starting point: "You are here" marker
2. Prerequisites as waypoints to pass
3. The target skill as the destination
4. Side paths for optional enrichment
5. Estimated "distance" (time) between points
6. Visual landmarks and milestones

Style: Treasure map or road trip aesthetic. Should make learning feel like an adventure.`,
    },
    {
      id: 'building-blocks',
      name: 'Building Blocks',
      icon: '🧱',
      description: 'Foundation diagram showing dependencies',
      promptTemplate: (skill, desc) => `Create a BUILDING BLOCKS illustration for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a construction/foundation visual:
1. Base layer: Fundamental prerequisites
2. Middle layers: Building knowledge
3. Top: Target skill
4. Visual showing why foundation matters
5. "Unstable" version if prerequisites missing
6. Labels for each block

Style: Construction/architecture metaphor. Should visually show why you can't skip steps.`,
    },
    {
      id: 'readiness-checklist',
      name: 'Readiness Checklist',
      icon: '📊',
      description: 'Visual self-assessment checklist',
      promptTemplate: (skill, desc) => `Create a READINESS CHECKLIST visual for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate an illustrated checklist:
1. "Are you ready?" header
2. 5-7 prerequisite items with checkboxes
3. Small illustration for each item
4. Traffic light indicator (red/yellow/green)
5. "What to do if not ready" section
6. Confidence meter visual

Style: Self-assessment tool. Should help students honestly evaluate readiness.`,
    },
    {
      id: 'connection-map',
      name: 'Connection Map',
      icon: '🔗',
      description: 'How skills link together',
      promptTemplate: (skill, desc) => `Create a CONNECTION MAP for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a network-style visualization:
1. Target skill in center
2. Prerequisites connecting in
3. Future skills connecting out
4. Related skills on sides
5. Strength of connections shown visually
6. "You need this for..." labels

Style: Network diagram with illustrations. Should show the bigger picture of how learning connects.`,
    },
  ],
}

// ============================================
// FOR TEACHERS - Artifact Types
// ============================================

export const teacherArtifacts: Record<string, ArtifactType[]> = {
  'study-guide': [
    {
      id: 'handout-design',
      name: 'Handout Design',
      icon: '📰',
      description: 'Print-ready visual handout',
      promptTemplate: (skill, desc) => `Create a CLASSROOM HANDOUT design for teaching "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a professional handout layout:
1. Clear title and learning objectives at top
2. Key concepts with supporting illustrations
3. Worked example with visual walkthrough
4. Practice space with guiding structure
5. "Key takeaway" summary box
6. Teacher notes section (lighter color)

Style: Clean, professional, print-ready. Should look like a polished classroom resource.`,
    },
    {
      id: 'anchor-chart',
      name: 'Anchor Chart',
      icon: '🎨',
      description: 'Classroom display poster',
      promptTemplate: (skill, desc) => `Create an ANCHOR CHART for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a classroom wall display:
1. Large, readable title
2. Key concept with memorable visual
3. Steps or process with icons
4. Examples and non-examples
5. Student-friendly language
6. Color coding for categories

Style: Hand-drawn anchor chart aesthetic but clean. Should be readable from across the room.`,
    },
    {
      id: 'chapter-overview',
      name: 'Chapter Overview',
      icon: '📚',
      description: 'Unit visual summary',
      promptTemplate: (skill, desc) => `Create a CHAPTER OVERVIEW visual for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate an overview showing:
1. Unit title with key visual
2. Learning objectives listed with icons
3. Key vocabulary with illustrations
4. Concept flow diagram
5. Assessment preview
6. Estimated pacing timeline

Style: Textbook overview page aesthetic. Professional, comprehensive, organized.`,
    },
    {
      id: 'note-taking-template',
      name: 'Note-taking Template',
      icon: '✏️',
      description: 'Structured visual note format',
      promptTemplate: (skill, desc) => `Create a NOTE-TAKING TEMPLATE for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a structured note template:
1. Cornell notes style or similar structure
2. Pre-filled headers and prompts
3. Space for diagrams with guide boxes
4. Key questions to answer
5. Summary section at bottom
6. Visual organizers built in

Style: Printable worksheet with structure. Should guide student note-taking effectively.`,
    },
  ],

  'practice-questions': [
    {
      id: 'assessment-sheet',
      name: 'Assessment Sheet',
      icon: '📝',
      description: 'Formatted test visual',
      promptTemplate: (skill, desc) => `Create an ASSESSMENT SHEET design for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a professional assessment:
1. Clear header with name/date fields
2. Varied question types with visuals
3. Point values indicated
4. Adequate answer space
5. Diagrams or figures as needed
6. Professional test formatting

Style: Formal assessment aesthetic. Should look like a real test a teacher would give.`,
    },
    {
      id: 'game-board',
      name: 'Game Board',
      icon: '🎲',
      description: 'Gamified review visual',
      promptTemplate: (skill, desc) => `Create a REVIEW GAME BOARD for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a board game style visual:
1. Game path with spaces
2. Question cards represented
3. Special spaces (bonus, challenge, etc.)
4. Visual theme related to content
5. Rules summary in corner
6. Player markers area

Style: Fun board game aesthetic. Should make review feel like play.`,
    },
    {
      id: 'challenge-cards',
      name: 'Challenge Cards',
      icon: '🏆',
      description: 'Tiered difficulty visuals',
      promptTemplate: (skill, desc) => `Create CHALLENGE CARDS for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate tiered challenge cards:
1. Bronze level: Basic questions (3 cards)
2. Silver level: Application questions (3 cards)
3. Gold level: Analysis questions (2 cards)
4. Platinum level: Create/evaluate (2 cards)
5. Visual difficulty indicators
6. Point values on each

Style: Trading card game aesthetic with difficulty tiers. Should motivate students to level up.`,
    },
    {
      id: 'rubric-visual',
      name: 'Rubric Visual',
      icon: '📊',
      description: 'Grading criteria illustration',
      promptTemplate: (skill, desc) => `Create a VISUAL RUBRIC for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate an illustrated rubric:
1. 4 performance levels with visuals
2. Criteria rows with icons
3. Example work at each level
4. Color coding (red to green progression)
5. Student-friendly descriptions
6. Self-assessment checkboxes

Style: Clear rubric format with visual examples. Should help students understand expectations.`,
    },
  ],

  'lesson-plan': [
    {
      id: 'lesson-timeline',
      name: 'Lesson Timeline',
      icon: '📅',
      description: 'Visual schedule for lesson',
      promptTemplate: (skill, desc) => `Create a LESSON TIMELINE for teaching "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a visual lesson flow:
1. Timeline showing lesson phases
2. Time allocations for each section
3. Activity icons for each phase
4. Transition points marked
5. Materials needed at each stage
6. Flexibility notes

Style: Gantt chart meets infographic. Should help teacher manage pacing.`,
    },
    {
      id: 'objectives-poster',
      name: 'Objectives Poster',
      icon: '🎯',
      description: 'Learning goals visual',
      promptTemplate: (skill, desc) => `Create a LEARNING OBJECTIVES POSTER for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate an objectives display:
1. "Today you will learn..." header
2. 3-4 objectives with visual icons
3. Success criteria for each
4. Connection to prior learning
5. "You'll know you've got it when..." section
6. Student-friendly language

Style: Classroom display. Should be the first thing students see when class starts.`,
    },
    {
      id: 'activity-cards',
      name: 'Activity Cards',
      icon: '📋',
      description: 'Station/activity visuals',
      promptTemplate: (skill, desc) => `Create ACTIVITY STATION CARDS for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate station activity cards:
1. 4-5 different station activities
2. Clear instructions with illustrations
3. Materials needed listed
4. Time suggestion
5. Differentiation notes
6. Extension activities

Style: Station rotation cards. Should be clear enough that students can work independently.`,
    },
    {
      id: 'classroom-setup',
      name: 'Classroom Setup',
      icon: '🏫',
      description: 'Room arrangement diagram',
      promptTemplate: (skill, desc) => `Create a CLASSROOM SETUP diagram for teaching "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a room arrangement visual:
1. Desk/table arrangement for activity type
2. Teacher position(s) marked
3. Materials station locations
4. Student movement flow
5. Technology placement
6. Alternate arrangements for different phases

Style: Floor plan diagram. Should help teacher prepare the physical space.`,
    },
  ],

  'concept-explainer': [
    {
      id: 'teaching-poster',
      name: 'Teaching Poster',
      icon: '🖼️',
      description: 'Classroom display for concept',
      promptTemplate: (skill, desc) => `Create a TEACHING POSTER for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a classroom display poster:
1. Eye-catching title
2. Core concept with large illustration
3. Key vocabulary highlighted
4. Process or steps shown visually
5. Real-world connection
6. "Remember this!" callout

Style: Professional classroom poster. Should support instruction and remain useful for reference.`,
    },
    {
      id: 'slide-deck-visual',
      name: 'Slide Deck Visual',
      icon: '📽️',
      description: 'Presentation graphic',
      promptTemplate: (skill, desc) => `Create a KEY SLIDE VISUAL for presenting "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a presentation-ready visual:
1. Clean, uncluttered design
2. Main concept illustrated centrally
3. Supporting points with icons
4. Animation-ready elements (show build)
5. Speaker notes area
6. Discussion question prompt

Style: Modern presentation slide. Should project well and support verbal explanation.`,
    },
    {
      id: 'scaffolding-ladder',
      name: 'Scaffolding Ladder',
      icon: '🔄',
      description: 'Differentiation visual',
      promptTemplate: (skill, desc) => `Create a SCAFFOLDING LADDER for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a differentiation visual:
1. Ladder with support levels
2. Full support at bottom (worked examples)
3. Partial support in middle (hints)
4. Independent at top
5. Indicators for when to use each
6. Student self-selection guidance

Style: Gradual release visual. Should help teachers plan differentiation and students self-select support level.`,
    },
    {
      id: 'bridge-diagram',
      name: 'Bridge Diagram',
      icon: '🌉',
      description: 'Prior to new knowledge visual',
      promptTemplate: (skill, desc) => `Create a BRIDGE DIAGRAM for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a knowledge bridge visual:
1. Left side: What students already know
2. Right side: New learning target
3. Bridge: How they connect
4. "The key link" highlighted
5. Potential gaps to watch for
6. Activation questions

Style: Bridge/connection metaphor. Should help teachers explicitly connect to prior knowledge.`,
    },
  ],

  'misconception-addresser': [
    {
      id: 'warning-poster',
      name: 'Warning Poster',
      icon: '🚨',
      description: 'Common pitfalls visual',
      promptTemplate: (skill, desc) => `Create a WARNING POSTER for teaching "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a teacher resource poster:
1. "Watch Out For..." header
2. Top misconceptions students have
3. Visual signs to look for
4. Proactive teaching moves
5. Discussion starters to surface misconceptions
6. Formative assessment questions

Style: Teacher reference poster (not for students). Should help teachers anticipate and address issues.`,
    },
    {
      id: 'diagnostic-visual',
      name: 'Diagnostic Visual',
      icon: '🔬',
      description: 'Spot misconception tool',
      promptTemplate: (skill, desc) => `Create a DIAGNOSTIC VISUAL for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a diagnostic tool:
1. Quick assessment questions
2. Common wrong answers with what they reveal
3. Decision tree for intervention
4. Visual patterns to look for in student work
5. Grouping suggestions based on errors
6. Targeted mini-lesson topics

Style: Diagnostic flowchart. Should help teachers quickly categorize and respond to student errors.`,
    },
    {
      id: 'discussion-prompt',
      name: 'Discussion Prompt',
      icon: '💬',
      description: 'Conversation starter visual',
      promptTemplate: (skill, desc) => `Create a DISCUSSION PROMPT visual for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a discussion catalyst:
1. Provocative question or scenario
2. Illustration showing the dilemma
3. Common student responses to anticipate
4. Follow-up questions
5. Think-pair-share structure
6. Synthesis question at end

Style: Discussion starter card. Should create productive cognitive conflict.`,
    },
    {
      id: 'fix-it-guide',
      name: 'Fix-It Guide',
      icon: '🛠️',
      description: 'Correction steps visual',
      promptTemplate: (skill, desc) => `Create a FIX-IT GUIDE for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a remediation resource:
1. Common error patterns identified
2. Step-by-step correction process
3. Visual comparison (wrong vs right)
4. Practice problems targeting each error
5. Self-check for students
6. When to seek help indicators

Style: Troubleshooting guide. Should help students self-correct common errors.`,
    },
  ],

  'prerequisite-checker': [
    {
      id: 'pre-assessment-visual',
      name: 'Pre-Assessment Visual',
      icon: '📊',
      description: 'Diagnostic test visual',
      promptTemplate: (skill, desc) => `Create a PRE-ASSESSMENT VISUAL for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a diagnostic assessment:
1. Quick prerequisite check questions
2. Visual format (not text-heavy)
3. Scoring guide for teacher
4. Grouping recommendations based on results
5. Ready/nearly ready/needs support categories
6. Specific skill gaps identified by question

Style: Quick diagnostic tool. Should take 5-10 minutes and give actionable information.`,
    },
    {
      id: 'curriculum-map',
      name: 'Curriculum Map',
      icon: '🗺️',
      description: 'Scope and sequence visual',
      promptTemplate: (skill, desc) => `Create a CURRICULUM MAP for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a curriculum visualization:
1. Where this skill fits in the year/course
2. Prerequisites from earlier units
3. Connections to other current topics
4. Future applications
5. Spiral curriculum connections
6. Assessment alignment

Style: Curriculum overview. Should help teachers see the big picture and make connections explicit.`,
    },
    {
      id: 'remediation-flowchart',
      name: 'Remediation Flowchart',
      icon: '🔀',
      description: 'Decision tree for intervention',
      promptTemplate: (skill, desc) => `Create a REMEDIATION FLOWCHART for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a decision tree:
1. "Does student know X?" decision points
2. Yes/No branches with next steps
3. Specific intervention for each gap
4. Resource recommendations
5. Time estimates for remediation
6. When to proceed vs. stop and address

Style: Flowchart for teacher decision-making. Should make intervention planning systematic.`,
    },
    {
      id: 'gap-analysis',
      name: 'Gap Analysis',
      icon: '📈',
      description: 'Visual comparison tool',
      promptTemplate: (skill, desc) => `Create a GAP ANALYSIS VISUAL for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a gap analysis tool:
1. Expected knowledge on one side
2. Common actual knowledge on other
3. Visual gap representation
4. Priority ranking of gaps
5. Quick wins vs. major gaps
6. Class-level and individual views

Style: Data visualization for gaps. Should help teachers prioritize what to address.`,
    },
  ],
}

// ============================================
// CURRICULUM - Artifact Types
// ============================================

export const curriculumArtifacts: Record<string, ArtifactType[]> = {
  'curriculum-overview': [
    {
      id: 'learning-mountain',
      name: 'Learning Mountain',
      icon: '🏔️',
      description: 'Full curriculum visual journey',
      promptTemplate: (skill, desc) => `Create a LEARNING MOUNTAIN visualization for the curriculum around "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a mountain climbing journey visual:
1. Base camp: Foundational knowledge
2. Different paths up representing different tracks
3. Checkpoints at key milestones
4. Summit: Mastery goal
5. Rest stops: Review points
6. Scenic overlooks: Real-world connections

Style: Adventure/journey metaphor. Should make the full curriculum feel like an achievable climb.`,
    },
    {
      id: 'blooms-pyramid',
      name: "Bloom's Pyramid",
      icon: '📊',
      description: 'Taxonomy illustration',
      promptTemplate: (skill, desc) => `Create a BLOOM'S TAXONOMY PYRAMID for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a taxonomy visualization:
1. Classic pyramid with 6 levels
2. Skills placed at appropriate levels
3. Action verbs for each level
4. Example activities illustrated
5. Assessment types aligned
6. Color coding by level

Style: Educational taxonomy visual. Should clearly show cognitive complexity progression.`,
    },
    {
      id: 'pacing-calendar',
      name: 'Pacing Calendar',
      icon: '📅',
      description: 'Timeline visual',
      promptTemplate: (skill, desc) => `Create a PACING CALENDAR for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a pacing guide visual:
1. Week-by-week or unit timeline
2. Topics placed in sequence
3. Assessment points marked
4. Buffer time indicated
5. Connections between units shown
6. Key deadlines highlighted

Style: Calendar/timeline hybrid. Should help with long-term planning.`,
    },
    {
      id: 'standards-map',
      name: 'Standards Map',
      icon: '🎯',
      description: 'Alignment visual',
      promptTemplate: (skill, desc) => `Create a STANDARDS ALIGNMENT MAP for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a standards alignment visual:
1. Standards listed with codes
2. Skills/activities mapped to each
3. Coverage indicators
4. Gap identification
5. Cross-standard connections
6. Assessment alignment

Style: Alignment matrix visualization. Should demonstrate comprehensive coverage.`,
    },
  ],

  'threshold-concepts': [
    {
      id: 'gateway-diagram',
      name: 'Gateway Diagram',
      icon: '🚪',
      description: 'Threshold visualization',
      promptTemplate: (skill, desc) => `Create a GATEWAY DIAGRAM for the threshold concept: "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a gateway/door visualization:
1. Before the threshold: Limited understanding
2. The gateway itself: The transformative concept
3. After the threshold: Expanded understanding
4. What changes after crossing
5. Why it's difficult to cross
6. Support for crossing

Style: Doorway/portal metaphor. Should capture the transformative nature of threshold concepts.`,
    },
    {
      id: 'key-concept-poster',
      name: 'Key Concept Poster',
      icon: '💎',
      description: 'Critical ideas visual',
      promptTemplate: (skill, desc) => `Create a KEY CONCEPT POSTER for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a highlight poster:
1. The concept as a "gem" or treasure
2. Why it's so important
3. What it unlocks
4. Common struggles illustrated
5. Success indicators
6. "You've got it when..." criteria

Style: Important/precious concept framing. Should convey the significance of mastering this.`,
    },
    {
      id: 'unlock-path',
      name: 'Unlock Path',
      icon: '🔓',
      description: 'What mastery enables',
      promptTemplate: (skill, desc) => `Create an UNLOCK PATH visual for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a lock and key visualization:
1. The locked doors (things you can't do without this)
2. The key (the threshold concept)
3. What opens after unlocking
4. Chain reaction of unlocks
5. Why skipping isn't an option
6. Verification that you have the key

Style: Lock/key game mechanic. Should show what mastery enables access to.`,
    },
    {
      id: 'transformation-visual',
      name: 'Transformation Visual',
      icon: '⚡',
      description: 'Before/after understanding',
      promptTemplate: (skill, desc) => `Create a TRANSFORMATION VISUAL for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a metamorphosis illustration:
1. Before state: How student sees the world
2. During: The struggle/cocoon phase
3. After state: Transformed understanding
4. What specifically changes
5. Irreversibility shown
6. New capabilities

Style: Metamorphosis/transformation metaphor. Should capture the permanent change in thinking.`,
    },
  ],

  'cognitive-load': [
    {
      id: 'brain-load-meter',
      name: 'Brain Load Meter',
      icon: '🧠',
      description: 'Complexity visual',
      promptTemplate: (skill, desc) => `Create a BRAIN LOAD METER for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a cognitive load visualization:
1. Brain/meter showing capacity
2. Elements that fill the meter
3. Danger zone indicators
4. What causes overload
5. Strategies to reduce load
6. Optimal learning zone marked

Style: Meter/gauge visualization. Should make cognitive load tangible and manageable.`,
    },
    {
      id: 'chunking-diagram',
      name: 'Chunking Diagram',
      icon: '📦',
      description: 'How to break down content',
      promptTemplate: (skill, desc) => `Create a CHUNKING DIAGRAM for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a chunking visualization:
1. Original complex content
2. Broken into digestible chunks
3. How chunks relate
4. Recommended sequence
5. Time between chunks
6. Mastery checks between chunks

Style: Puzzle pieces or packaging metaphor. Should show how to make complex content manageable.`,
    },
    {
      id: 'balance-visual',
      name: 'Balance Visual',
      icon: '⚖️',
      description: 'Load management illustration',
      promptTemplate: (skill, desc) => `Create a BALANCE VISUAL for managing cognitive load in "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a balance/scale visualization:
1. Scale showing load factors
2. Intrinsic load (complexity of content)
3. Extraneous load (poor instruction)
4. Germane load (learning effort)
5. How to shift the balance
6. Warning when unbalanced

Style: Scale/balance metaphor. Should help teachers optimize instruction.`,
    },
    {
      id: 'difficulty-spectrum',
      name: 'Difficulty Spectrum',
      icon: '🎚️',
      description: 'Visual scale of complexity',
      promptTemplate: (skill, desc) => `Create a DIFFICULTY SPECTRUM for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a spectrum visualization:
1. Easy to hard continuum
2. Factors that increase difficulty
3. Where different activities fall
4. Prerequisite requirements at each level
5. Support needs at each level
6. Student self-placement guide

Style: Spectrum/slider visualization. Should help teachers calibrate difficulty appropriately.`,
    },
  ],

  'learning-path': [
    {
      id: 'journey-map',
      name: 'Journey Map',
      icon: '🛤️',
      description: 'Path to mastery visualization',
      promptTemplate: (skill, desc) => `Create a LEARNING JOURNEY MAP for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a journey visualization:
1. Start point with student avatar
2. Path with clear waypoints
3. Challenges/obstacles illustrated
4. Rest stops and checkpoints
5. Alternative routes
6. Destination with celebration

Style: Adventure map aesthetic. Should make learning feel like an exciting journey.`,
    },
    {
      id: 'level-progression',
      name: 'Level Progression',
      icon: '🎮',
      description: 'Gamified path visual',
      promptTemplate: (skill, desc) => `Create a LEVEL PROGRESSION for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a game-style progression:
1. Levels 1-5 with clear visuals
2. Skills unlocked at each level
3. Boss challenges (assessments)
4. Power-ups (resources)
5. Achievement badges
6. Progress bar

Style: Video game progression system. Should motivate through gamification.`,
    },
    {
      id: 'skill-tree',
      name: 'Skill Tree',
      icon: '🌳',
      description: 'Branching options visual',
      promptTemplate: (skill, desc) => `Create a SKILL TREE for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate an RPG-style skill tree:
1. Core skills at trunk
2. Branches for specializations
3. Prerequisites shown as connections
4. Optional vs required paths
5. Mastery indicators
6. Suggested paths highlighted

Style: RPG skill tree aesthetic. Should show options and dependencies clearly.`,
    },
    {
      id: 'milestone-markers',
      name: 'Milestone Markers',
      icon: '🏁',
      description: 'Progress checkpoints visual',
      promptTemplate: (skill, desc) => `Create MILESTONE MARKERS for "${skill}".

${desc ? `Context: ${desc}` : ''}

Generate a milestone visualization:
1. Key achievement points marked
2. What success looks like at each
3. Celebration moments
4. Reflection prompts
5. Next milestone preview
6. Overall progress indicator

Style: Race/achievement markers. Should help students see and celebrate progress.`,
    },
  ],
}

// Helper function to get all artifacts for a tool
export function getArtifactsForTool(toolId: string, audience: 'student' | 'teacher' | 'curriculum'): ArtifactType[] {
  if (audience === 'student') {
    return studentArtifacts[toolId] || []
  } else if (audience === 'teacher') {
    return teacherArtifacts[toolId] || []
  } else {
    return curriculumArtifacts[toolId] || []
  }
}

// Get all tool IDs for an audience
export function getToolIds(audience: 'student' | 'teacher' | 'curriculum'): string[] {
  if (audience === 'student') {
    return Object.keys(studentArtifacts)
  } else if (audience === 'teacher') {
    return Object.keys(teacherArtifacts)
  } else {
    return Object.keys(curriculumArtifacts)
  }
}
