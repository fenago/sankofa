/**
 * Entity and skill extraction from text using Gemini LLM
 * Extracts skills, entities, and relationships for GraphRAG
 */

import { GoogleGenAI } from '@google/genai'
import type {
  SkillNode,
  EntityNode,
  PrerequisiteRelationship,
  EntityRelationship,
  GraphExtractionResult,
  BloomLevel,
} from '@/lib/types/graph'

// Use Gemini 3 Flash for extraction (1M+ token context window)
const EXTRACTION_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview'

let client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }
    client = new GoogleGenAI({ apiKey })
  }
  return client
}

// Maximum characters before chunking kicks in
// Gemini 3 Flash has 1M+ token context, so we can handle large documents in one shot
// 150K chars ≈ 37K tokens, well within limits
// Only chunk for very large documents (textbooks, etc.)
const MAX_EXTRACTION_CHUNK_SIZE = 150000

/**
 * Extract skills and entities from a text chunk
 */
export async function extractFromText(
  text: string,
  notebookId: string,
  sourceDocumentId?: string,
  existingSkillNames?: string[]
): Promise<GraphExtractionResult> {
  const ai = getClient()

  // For large texts, process in chunks and merge results
  if (text.length > MAX_EXTRACTION_CHUNK_SIZE) {
    console.log(`[Extraction] Large text (${text.length} chars), processing in chunks`)
    return extractFromTextChunked(text, notebookId, sourceDocumentId, existingSkillNames)
  }

  const existingContext = existingSkillNames?.length
    ? `\n\nExisting skills already extracted (create PREREQUISITE relationships to these where appropriate):\n${existingSkillNames.join(', ')}`
    : ''

  console.log(`[Extraction] Starting extraction for ${text.length} chars`)

  const prompt = `You are an expert curriculum designer and learning scientist. Extract a comprehensive, research-grounded knowledge graph from this educational content.

## CRITICAL REQUIREMENTS

### 1. QUALITY OVER QUANTITY
Extract skills based on what the content actually teaches. Each skill must be:
- Learnable in 5-30 minutes
- Testable with 3-5 questions
- Atomic (cannot be broken down further without losing meaning)

### 2. SOURCE-FIRST + COMMON SENSE
- PRIMARY: Extract skills directly from the source content
- SECONDARY: Add obvious prerequisite skills that are logically necessary even if not explicitly mentioned
  - Example: If content teaches "Calculate standard deviation", add "Calculate variance" as prerequisite even if not in source
  - Example: If content teaches "Interpret regression coefficients", add "Understand correlation" as prerequisite

### 3. FULLY CONNECTED GRAPH - NO ORPHANS ALLOWED
**EVERY skill must connect to at least one other skill.** There should be ZERO isolated nodes.

After creating skills, review the list and for EACH skill ask:
- "What must a learner know BEFORE this?" → Add prerequisite relationship
- "What does this skill enable learning NEXT?" → Add as prerequisite to another skill

If a skill has no connections, either:
- Add a logical prerequisite (what foundational knowledge is needed?)
- Connect it to a related skill with "helpful" strength
- If truly standalone, reconsider if it belongs in this graph

### 4. RELATIONSHIP TYPES
- **required**: Cannot learn this without mastering prerequisite first
- **recommended**: Strong benefit from prerequisite, learning is harder without it
- **helpful**: Nice background, but can proceed without it

## EDUCATIONAL PSYCHOLOGY FRAMEWORKS TO APPLY

### 1. Bloom's Taxonomy (Revised 2001)
- Level 1 (Remember): Recall facts, terms, basic concepts
- Level 2 (Understand): Explain ideas, interpret meaning
- Level 3 (Apply): Use knowledge in new situations
- Level 4 (Analyze): Draw connections, identify patterns
- Level 5 (Evaluate): Justify decisions, critique
- Level 6 (Create): Produce new work, design solutions

### 2. Item Response Theory (IRT) - 3PL Model
- Difficulty (b): -3 (very easy) to +3 (very hard), 0 = average
- Discrimination (a): 0.5 (poor) to 2.5 (excellent)
- Guessing (c): 0 to 0.5 - probability of correct guess

### 3. Threshold Concepts (Meyer & Land)
Identify transformative, irreversible, integrative knowledge that may be troublesome.

### 4. Cognitive Load Theory (Sweller)
- Cognitive load: low/medium/high
- Chunks required: working memory slots (2-7)
- Element interactivity: low/medium/high

### 5. Instructional Scaffolding (Vygotsky/Wood)
- Level 1: Full worked examples
- Level 2: Partial solutions
- Level 3: Hints on request
- Level 4: Independent practice

### 6. Mastery Learning (Bloom)
- Mastery threshold: 0.80 standard, 0.90 for threshold concepts

## PREREQUISITE RELATIONSHIPS - ENSURE FULL CONNECTIVITY

Build a CONNECTED learning graph where every skill participates in at least one relationship.

For each skill, create prerequisites by asking:
1. "What foundational knowledge does this require?" → required/recommended
2. "What related skills enhance understanding?" → helpful

Common patterns to ensure connectivity:
- Definition skills → Calculation skills → Application skills → Analysis skills
- Foundational concepts should be prerequisites for advanced concepts
- Skills in the same domain should have at least "helpful" connections
${existingContext}

## CONTENT TO ANALYZE

${text}

## OUTPUT FORMAT (JSON)

{
  "skills": [
    {
      "name": "Specific, descriptive skill name",
      "description": "1-2 sentences: what will the learner know/be able to do?",
      "bloomLevel": 1-6,
      "secondaryBloomLevels": [optional additional levels if skill spans multiple],
      "estimatedMinutes": 5-45,
      "difficulty": 1-10,
      "irt": {
        "difficulty": -3 to +3,
        "discrimination": 0.5 to 2.5,
        "guessing": 0 to 0.5
      },
      "isThresholdConcept": true/false,
      "thresholdProperties": {
        "unlocksDomains": ["domains this concept unlocks"],
        "troublesomeAspects": ["why this is hard to grasp"]
      },
      "cognitiveLoadEstimate": "low" | "medium" | "high",
      "chunksRequired": 2-7,
      "elementInteractivity": "low" | "medium" | "high",
      "masteryThreshold": 0.80 or 0.90 for threshold concepts,
      "assessmentTypes": ["formative", "summative", etc.],
      "suggestedAssessments": [
        { "type": "formative", "description": "specific assessment idea", "bloomAlignment": [1,2] }
      ],
      "reviewIntervals": [1, 3, 7, 14, 30, 60],
      "scaffoldingLevels": {
        "level1": "Full worked example description",
        "level2": "Partial solution approach",
        "level3": "Hint strategy",
        "level4": "Independent practice task"
      },
      "commonMisconceptions": ["misconception 1", "misconception 2"],
      "transferDomains": ["where else this skill applies"],
      "keywords": ["keyword1", "keyword2"],
      "domain": "main subject area",
      "subdomain": "specific topic within domain"
    }
  ],
  "prerequisites": [
    {
      "fromSkillName": "prerequisite skill (learned FIRST)",
      "toSkillName": "dependent skill (requires the prerequisite)",
      "strength": "required" | "recommended" | "helpful",
      "reasoning": "pedagogical explanation of this dependency"
    }
  ],
  "entities": [
    {
      "name": "entity name",
      "type": "concept" | "person" | "term" | "formula" | "theorem" | "event" | "other",
      "description": "brief description"
    }
  ],
  "entityRelationships": [
    {
      "fromEntityName": "source entity",
      "toEntityName": "target entity",
      "type": "related_to" | "part_of" | "causes" | "precedes" | "example_of" | "defines",
      "description": "relationship description"
    }
  ],
  "existingSkillReferences": []
}

## VALIDATION CHECKLIST - REQUIRED

Before returning, verify:
✓ Each skill is atomic (5-30 min to learn)
✓ Skills primarily come from source content
✓ Obvious prerequisite skills are added even if not in source
✓ Every skill has IRT params, cognitive load, scaffolding levels
✓ Threshold concepts have unlocksDomains and troublesomeAspects

**CRITICAL - CONNECTIVITY CHECK:**
✓ Count skills with NO prerequisites AND are not a prerequisite for anything = 0
✓ Every skill must appear in at least one prerequisite relationship (as from OR to)
✓ If you find orphan skills, ADD relationships to connect them

**FINAL REVIEW:**
1. List all skill names
2. For each skill, verify it has at least one connection
3. Add missing relationships before returning`

  let response
  try {
    const startTime = Date.now()
    response = await ai.models.generateContent({
      model: EXTRACTION_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3, // Slightly higher for thoughtful additions
      },
    })
    console.log(`[Extraction] Gemini API call completed in ${Date.now() - startTime}ms`)
  } catch (apiError) {
    console.error('[Extraction] Gemini API call failed:', apiError)
    throw new Error(`Gemini API failed: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`)
  }

  const responseText = response.text
  if (!responseText) {
    console.error('[Extraction] Empty response from Gemini')
    throw new Error('Empty response from extraction model')
  }

  console.log(`[Extraction] Response received: ${responseText.length} chars`)

  let parsed: RawExtractionResult
  try {
    parsed = JSON.parse(responseText)
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1])
    } else {
      console.error('[Extraction] Failed to parse JSON, response preview:', responseText.slice(0, 500))
      throw new Error('Failed to parse extraction response as JSON')
    }
  }

  console.log(`[Extraction] Parsed ${parsed.skills?.length || 0} skills, ${parsed.entities?.length || 0} entities`)

  const now = Date.now()

  // Convert raw extraction to typed result with IDs
  const skills: SkillNode[] = (parsed.skills || []).map((s, idx) => ({
    id: `skill_${notebookId}_${now}_${idx}`,
    name: s.name,
    description: s.description,
    notebookId,
    bloomLevel: validateBloomLevel(s.bloomLevel),
    secondaryBloomLevels: s.secondaryBloomLevels?.map(validateBloomLevel),
    estimatedMinutes: s.estimatedMinutes ? Math.min(120, Math.max(5, s.estimatedMinutes)) : 30,
    difficulty: Math.min(10, Math.max(1, s.difficulty || 5)),
    // IRT 3PL model parameters
    irt: s.irt ? {
      difficulty: Math.min(3, Math.max(-3, s.irt.difficulty || 0)),
      discrimination: Math.min(2.5, Math.max(0.5, s.irt.discrimination || 1)),
      guessing: Math.min(0.5, Math.max(0, s.irt.guessing || 0.2)),
    } : undefined,
    isThresholdConcept: s.isThresholdConcept || false,
    thresholdProperties: s.thresholdProperties,
    cognitiveLoadEstimate: s.cognitiveLoadEstimate || 'medium',
    // New educational psychology properties
    elementInteractivity: s.elementInteractivity,
    chunksRequired: s.chunksRequired ? Math.min(7, Math.max(2, s.chunksRequired)) : undefined,
    masteryThreshold: s.masteryThreshold || (s.isThresholdConcept ? 0.90 : 0.80),
    commonMisconceptions: s.commonMisconceptions,
    transferDomains: s.transferDomains,
    assessmentTypes: s.assessmentTypes,
    suggestedAssessments: s.suggestedAssessments?.map(a => ({
      type: a.type,
      description: a.description,
      bloomAlignment: a.bloomAlignment.map(validateBloomLevel),
    })),
    reviewIntervals: s.reviewIntervals || [1, 3, 7, 14, 30, 60],
    scaffoldingLevels: s.scaffoldingLevels,
    keywords: s.keywords || [],
    domain: s.domain,
    subdomain: s.subdomain,
    sourceDocumentId,
    createdAt: now,
    updatedAt: now,
  }))

  // Create skill name to ID mapping
  const skillNameToId = new Map(skills.map(s => [s.name.toLowerCase(), s.id]))

  // Convert prerequisites with proper IDs
  const prerequisites: PrerequisiteRelationship[] = (parsed.prerequisites || [])
    .map(p => {
      const fromId = skillNameToId.get(p.fromSkillName.toLowerCase())
      const toId = skillNameToId.get(p.toSkillName.toLowerCase())
      if (!fromId || !toId) return null

      return {
        fromSkillId: fromId,
        toSkillId: toId,
        strength: p.strength || 'recommended',
        confidenceScore: 0.8,
        reasoning: p.reasoning,
        inferenceMethod: 'llm_extracted' as const,
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)

  // Convert entities
  const entities: EntityNode[] = (parsed.entities || []).map((e, idx) => ({
    id: `entity_${notebookId}_${now}_${idx}`,
    name: e.name,
    type: e.type || 'other',
    description: e.description,
    notebookId,
    sourceDocumentId,
    createdAt: now,
  }))

  // Create entity name to ID mapping
  const entityNameToId = new Map(entities.map(e => [e.name.toLowerCase(), e.id]))

  // Convert entity relationships
  const entityRelationships: EntityRelationship[] = (parsed.entityRelationships || [])
    .map(r => {
      const fromId = entityNameToId.get(r.fromEntityName.toLowerCase())
      const toId = entityNameToId.get(r.toEntityName.toLowerCase())
      if (!fromId || !toId) return null

      return {
        fromEntityId: fromId,
        toEntityId: toId,
        type: r.type || 'related_to',
        description: r.description,
        confidence: 0.8,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  return {
    skills,
    prerequisites,
    entities,
    entityRelationships,
    existingSkillReferences: parsed.existingSkillReferences,
  }
}

/**
 * Process large text in chunks for better extraction
 * Uses PARALLEL processing to complete within serverless timeouts
 */
async function extractFromTextChunked(
  text: string,
  notebookId: string,
  sourceDocumentId?: string,
  existingSkillNames?: string[]
): Promise<GraphExtractionResult> {
  // Split text into chunks at paragraph boundaries
  const chunks: string[] = []
  let currentChunk = ''
  const paragraphs = text.split(/\n\n+/)

  for (const para of paragraphs) {
    if ((currentChunk + para).length > MAX_EXTRACTION_CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = para
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  console.log(`[Extraction] Split into ${chunks.length} chunks, processing in PARALLEL`)

  // Process ALL chunks in parallel for speed
  const startTime = Date.now()
  const chunkPromises = chunks.map((chunk, i) => {
    console.log(`[Extraction] Starting chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`)
    return extractFromTextDirect(
      chunk,
      notebookId,
      sourceDocumentId,
      existingSkillNames // Pass original existing skills to all chunks
    ).catch(error => {
      console.error(`[Extraction] Chunk ${i + 1} failed:`, error)
      return null // Return null for failed chunks, continue with others
    })
  })

  const chunkResults = await Promise.all(chunkPromises)
  console.log(`[Extraction] All ${chunks.length} chunks completed in ${Date.now() - startTime}ms`)

  // Merge results
  const allResults: GraphExtractionResult = {
    skills: [],
    prerequisites: [],
    entities: [],
    entityRelationships: [],
    existingSkillReferences: [],
  }

  for (const chunkResult of chunkResults) {
    if (!chunkResult) continue // Skip failed chunks

    allResults.skills.push(...chunkResult.skills)
    allResults.prerequisites.push(...chunkResult.prerequisites)
    allResults.entities.push(...chunkResult.entities)
    allResults.entityRelationships.push(...chunkResult.entityRelationships)
    if (chunkResult.existingSkillReferences) {
      allResults.existingSkillReferences?.push(...chunkResult.existingSkillReferences)
    }
  }

  // Deduplicate skills first
  allResults.skills = deduplicateSkills(allResults.skills)
  allResults.entities = deduplicateEntities(allResults.entities)

  console.log(`[Extraction] Merged ${allResults.skills.length} unique skills from ${chunks.length} chunks`)
  console.log(`[Extraction] Initial prerequisites: ${allResults.prerequisites.length}`)

  // CRITICAL: Use Gemini to infer prerequisites between ALL skills
  // This is necessary because parallel chunk processing loses cross-chunk relationships
  if (allResults.skills.length > 1) {
    console.log(`[Extraction] Inferring prerequisites between ${allResults.skills.length} skills...`)
    const inferredPrereqs = await inferPrerequisitesFromSkills(allResults.skills, notebookId)
    console.log(`[Extraction] Inferred ${inferredPrereqs.length} prerequisites from skill analysis`)
    allResults.prerequisites.push(...inferredPrereqs)
  }

  // Also add heuristic-based cross-chunk prerequisites (Bloom level + keywords)
  const heuristicPrereqs = inferCrossChunkPrerequisites(allResults.skills)
  allResults.prerequisites.push(...heuristicPrereqs)

  // Deduplicate all prerequisites
  allResults.prerequisites = deduplicatePrerequisites(allResults.prerequisites)

  console.log(`[Extraction] Final: ${allResults.skills.length} skills, ${allResults.prerequisites.length} prerequisites`)

  return allResults
}

/**
 * Direct extraction (non-chunked) - internal helper
 */
async function extractFromTextDirect(
  text: string,
  notebookId: string,
  sourceDocumentId?: string,
  existingSkillNames?: string[]
): Promise<GraphExtractionResult> {
  const ai = getClient()

  const existingContext = existingSkillNames?.length
    ? `\n\nExisting skills already extracted (create PREREQUISITE relationships to these where appropriate):\n${existingSkillNames.join(', ')}`
    : ''

  const prompt = `You are an expert curriculum designer. Extract a CONNECTED knowledge graph from this educational content.

## CRITICAL REQUIREMENTS

### 1. QUALITY OVER QUANTITY
- Extract skills based on what the content actually teaches
- Each skill should be learnable in 5-30 minutes, testable with 3-5 questions

### 2. SOURCE-FIRST + COMMON SENSE
- PRIMARY: Skills from the source content
- SECONDARY: Add obvious prerequisite skills that are logically necessary

### 3. FULLY CONNECTED - NO ORPHANS
**EVERY skill must connect to at least one other skill.** Zero isolated nodes.
${existingContext}

TEXT TO ANALYZE:
${text}

Respond with JSON:
{
  "skills": [
    {
      "name": "string (unique, descriptive)",
      "description": "string (1-2 sentences)",
      "bloomLevel": 1-6,
      "estimatedMinutes": 5-30,
      "difficulty": 1-10,
      "isThresholdConcept": boolean,
      "keywords": ["relevant keywords"]
    }
  ],
  "prerequisites": [
    {
      "fromSkillName": "prerequisite (learned FIRST)",
      "toSkillName": "dependent skill",
      "strength": "required" | "recommended" | "helpful",
      "reasoning": "why this dependency"
    }
  ],
  "entities": [
    {
      "name": "entity name",
      "type": "concept" | "person" | "term" | "formula" | "other",
      "description": "brief description"
    }
  ],
  "entityRelationships": [
    {
      "fromEntityName": "source entity",
      "toEntityName": "target entity",
      "type": "related_to" | "part_of" | "causes" | "precedes" | "example_of"
    }
  ],
  "existingSkillReferences": ["names of existing skills referenced"]
}

**VALIDATION - Before returning:**
✓ Every skill appears in at least one prerequisite (as from OR to)
✓ If you find orphan skills, ADD relationships to connect them
✓ Include obvious prerequisites even if not in the source text`

  let response
  try {
    const startTime = Date.now()
    response = await ai.models.generateContent({
      model: EXTRACTION_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    })
    console.log(`[Extraction] Gemini API call completed in ${Date.now() - startTime}ms`)
  } catch (apiError) {
    console.error('[Extraction] Gemini API call failed:', apiError)
    throw new Error(`Gemini API failed: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`)
  }

  const responseText = response.text
  if (!responseText) {
    throw new Error('Empty response from extraction model')
  }

  let parsed: RawExtractionResult
  try {
    parsed = JSON.parse(responseText)
  } catch {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1])
    } else {
      throw new Error('Failed to parse extraction response as JSON')
    }
  }

  console.log(`[Extraction] Parsed ${parsed.skills?.length || 0} skills, ${parsed.prerequisites?.length || 0} prerequisites`)

  const now = Date.now()

  // Convert to typed result with IDs
  const skills: SkillNode[] = (parsed.skills || []).map((s, idx) => ({
    id: `skill_${notebookId}_${now}_${idx}`,
    name: s.name,
    description: s.description,
    notebookId,
    bloomLevel: validateBloomLevel(s.bloomLevel),
    estimatedMinutes: s.estimatedMinutes ? Math.min(120, Math.max(5, s.estimatedMinutes)) : 30,
    difficulty: Math.min(10, Math.max(1, s.difficulty || 5)),
    isThresholdConcept: s.isThresholdConcept || false,
    keywords: s.keywords || [],
    sourceDocumentId,
    createdAt: now,
    updatedAt: now,
  }))

  // Create skill name to ID mapping
  const skillNameToId = new Map(skills.map(s => [s.name.toLowerCase(), s.id]))

  // Also map existing skill names if provided
  if (existingSkillNames) {
    for (const name of existingSkillNames) {
      if (!skillNameToId.has(name.toLowerCase())) {
        // Create placeholder ID for existing skills
        skillNameToId.set(name.toLowerCase(), `existing_${name.toLowerCase().replace(/\s+/g, '_')}`)
      }
    }
  }

  // Convert prerequisites - be more lenient with matching
  const prerequisites: PrerequisiteRelationship[] = (parsed.prerequisites || [])
    .map(p => {
      const fromId = skillNameToId.get(p.fromSkillName.toLowerCase())
      const toId = skillNameToId.get(p.toSkillName.toLowerCase())

      // Skip if either skill not found
      if (!fromId || !toId) {
        console.log(`[Extraction] Skipping prerequisite: ${p.fromSkillName} → ${p.toSkillName} (skill not found)`)
        return null
      }

      return {
        fromSkillId: fromId,
        toSkillId: toId,
        strength: p.strength || 'recommended',
        confidenceScore: 0.85,
        reasoning: p.reasoning,
        inferenceMethod: 'llm_extracted' as const,
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)

  // Convert entities
  const entities: EntityNode[] = (parsed.entities || []).map((e, idx) => ({
    id: `entity_${notebookId}_${now}_${idx}`,
    name: e.name,
    type: e.type || 'other',
    description: e.description,
    notebookId,
    sourceDocumentId,
    createdAt: now,
  }))

  // Entity relationships
  const entityNameToId = new Map(entities.map(e => [e.name.toLowerCase(), e.id]))
  const entityRelationships: EntityRelationship[] = (parsed.entityRelationships || [])
    .map(r => {
      const fromId = entityNameToId.get(r.fromEntityName.toLowerCase())
      const toId = entityNameToId.get(r.toEntityName.toLowerCase())
      if (!fromId || !toId) return null

      return {
        fromEntityId: fromId,
        toEntityId: toId,
        type: r.type || 'related_to',
        description: r.description,
        confidence: 0.8,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  return {
    skills,
    prerequisites,
    entities,
    entityRelationships,
    existingSkillReferences: parsed.existingSkillReferences,
  }
}

/**
 * Use Gemini to infer prerequisite relationships between all extracted skills
 * This is a fast call because it only sends skill names, not full content
 */
async function inferPrerequisitesFromSkills(
  skills: SkillNode[],
  notebookId: string
): Promise<PrerequisiteRelationship[]> {
  if (skills.length < 2) return []

  const ai = getClient()

  // Build a simple list of skills with their IDs and names
  const skillList = skills.map(s => ({
    id: s.id,
    name: s.name,
    bloomLevel: s.bloomLevel,
  }))

  const prompt = `You are an expert curriculum designer. Given these ${skills.length} skills extracted from educational content, identify PREREQUISITE relationships to create a FULLY CONNECTED graph.

**CRITICAL: NO ORPHAN SKILLS. Every skill must have at least one connection.**

SKILLS:
${skillList.map((s, i) => `${i + 1}. [${s.id}] "${s.name}" (Bloom L${s.bloomLevel})`).join('\n')}

For EACH skill, ensure it connects to at least one other skill by asking:
- "What must be learned BEFORE this?" → Add prerequisite
- "What does this enable learning?" → This skill is a prerequisite for something else

Relationship types:
- **required**: Must master prerequisite first
- **recommended**: Learning is harder without it
- **helpful**: Nice background

Consider:
- Foundational skills → Advanced skills
- Definition → Calculation → Application → Analysis
- Bloom's level progressions

Respond with JSON:
{
  "prerequisites": [
    {
      "fromSkillId": "skill_id (prerequisite - learned FIRST)",
      "toSkillId": "skill_id (dependent - needs the prerequisite)",
      "strength": "required" | "recommended" | "helpful",
      "reasoning": "brief reason"
    }
  ]
}

**Use EXACT skill IDs in brackets [skill_xxx].**
**Ensure every skill appears in at least one relationship (as from OR to).**`

  try {
    const startTime = Date.now()
    const response = await ai.models.generateContent({
      model: EXTRACTION_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    })
    console.log(`[Extraction] Prerequisite inference completed in ${Date.now() - startTime}ms`)

    const responseText = response.text
    if (!responseText) {
      console.error('[Extraction] Empty response from prerequisite inference')
      return []
    }

    let parsed: { prerequisites?: { fromSkillId: string; toSkillId: string; strength?: string; reasoning?: string }[] }
    try {
      parsed = JSON.parse(responseText)
    } catch {
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1])
      } else {
        console.error('[Extraction] Failed to parse prerequisite inference response')
        return []
      }
    }

    // Validate skill IDs exist
    const validSkillIds = new Set(skills.map(s => s.id))

    const prerequisites: PrerequisiteRelationship[] = (parsed.prerequisites || [])
      .filter(p => {
        const fromValid = validSkillIds.has(p.fromSkillId)
        const toValid = validSkillIds.has(p.toSkillId)
        if (!fromValid || !toValid) {
          console.log(`[Extraction] Skipping invalid prerequisite: ${p.fromSkillId} → ${p.toSkillId}`)
        }
        return fromValid && toValid && p.fromSkillId !== p.toSkillId
      })
      .map(p => ({
        fromSkillId: p.fromSkillId,
        toSkillId: p.toSkillId,
        strength: (p.strength || 'recommended') as PrerequisiteRelationship['strength'],
        confidenceScore: 0.85,
        reasoning: p.reasoning,
        inferenceMethod: 'llm_inferred' as const,
      }))

    console.log(`[Extraction] Validated ${prerequisites.length} prerequisite relationships`)
    return prerequisites

  } catch (error) {
    console.error('[Extraction] Failed to infer prerequisites:', error)
    return []
  }
}

/**
 * Infer prerequisites across chunks based on Bloom levels and keywords
 */
function inferCrossChunkPrerequisites(skills: SkillNode[]): PrerequisiteRelationship[] {
  const inferred: PrerequisiteRelationship[] = []
  const now = Date.now()

  for (const skill1 of skills) {
    for (const skill2 of skills) {
      if (skill1.id === skill2.id) continue

      // Lower Bloom level → Higher Bloom level with keyword overlap
      if (skill1.bloomLevel < skill2.bloomLevel) {
        const keywords1 = new Set(skill1.keywords.map(k => k.toLowerCase()))
        const keywords2 = new Set(skill2.keywords.map(k => k.toLowerCase()))
        const overlap = [...keywords1].filter(k => keywords2.has(k))

        if (overlap.length >= 1) {
          // Check if relationship already exists
          const exists = inferred.some(
            r => r.fromSkillId === skill1.id && r.toSkillId === skill2.id
          )
          if (!exists) {
            inferred.push({
              fromSkillId: skill1.id,
              toSkillId: skill2.id,
              strength: overlap.length >= 2 ? 'recommended' : 'helpful',
              confidenceScore: 0.6 + overlap.length * 0.1,
              reasoning: `Bloom level progression (L${skill1.bloomLevel}→L${skill2.bloomLevel}) with shared keywords: ${overlap.join(', ')}`,
              inferenceMethod: 'bloom_heuristic',
            })
          }
        }
      }
    }
  }

  return inferred
}

/**
 * Deduplicate skills by name
 */
function deduplicateSkills(skills: SkillNode[]): SkillNode[] {
  const seen = new Map<string, SkillNode>()
  for (const skill of skills) {
    const key = skill.name.toLowerCase()
    if (!seen.has(key)) {
      seen.set(key, skill)
    }
  }
  return Array.from(seen.values())
}

/**
 * Deduplicate entities by name
 */
function deduplicateEntities(entities: EntityNode[]): EntityNode[] {
  const seen = new Map<string, EntityNode>()
  for (const entity of entities) {
    const key = entity.name.toLowerCase()
    if (!seen.has(key)) {
      seen.set(key, entity)
    }
  }
  return Array.from(seen.values())
}

/**
 * Deduplicate prerequisites
 */
function deduplicatePrerequisites(prereqs: PrerequisiteRelationship[]): PrerequisiteRelationship[] {
  const seen = new Set<string>()
  return prereqs.filter(p => {
    const key = `${p.fromSkillId}→${p.toSkillId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Batch extraction from multiple text chunks
 */
export async function batchExtractFromTexts(
  texts: { content: string; sourceId?: string }[],
  notebookId: string,
  existingSkillNames?: string[]
): Promise<GraphExtractionResult> {
  const allResults: GraphExtractionResult = {
    skills: [],
    prerequisites: [],
    entities: [],
    entityRelationships: [],
    existingSkillReferences: [],
  }

  // Track skills across chunks to build cross-chunk prerequisites
  const accumulatedSkillNames: string[] = [...(existingSkillNames || [])]

  for (const { content, sourceId } of texts) {
    try {
      const result = await extractFromText(
        content,
        notebookId,
        sourceId,
        accumulatedSkillNames
      )

      allResults.skills.push(...result.skills)
      allResults.prerequisites.push(...result.prerequisites)
      allResults.entities.push(...result.entities)
      allResults.entityRelationships.push(...result.entityRelationships)
      if (result.existingSkillReferences) {
        allResults.existingSkillReferences?.push(...result.existingSkillReferences)
      }

      // Add newly extracted skill names for subsequent chunks
      accumulatedSkillNames.push(...result.skills.map(s => s.name))

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (error) {
      console.error('Extraction failed for chunk:', error)
      // Continue with other chunks
    }
  }

  // Deduplicate entities by name (keep first occurrence)
  const seenEntities = new Set<string>()
  allResults.entities = allResults.entities.filter(e => {
    const key = e.name.toLowerCase()
    if (seenEntities.has(key)) return false
    seenEntities.add(key)
    return true
  })

  // Deduplicate skills by name (merge if duplicate)
  const seenSkills = new Map<string, SkillNode>()
  for (const skill of allResults.skills) {
    const key = skill.name.toLowerCase()
    if (!seenSkills.has(key)) {
      seenSkills.set(key, skill)
    }
    // Could merge properties here if needed
  }
  allResults.skills = Array.from(seenSkills.values())

  return allResults
}

/**
 * Infer cross-document prerequisites based on skill similarity
 */
export async function inferCrossDocumentLinks(
  skills: SkillNode[],
  embeddings: Map<string, number[]>
): Promise<PrerequisiteRelationship[]> {
  const inferred: PrerequisiteRelationship[] = []

  // Use Bloom's level heuristic: lower level skills are prerequisites for higher level
  for (const skill1 of skills) {
    for (const skill2 of skills) {
      if (skill1.id === skill2.id) continue

      // Bloom's heuristic: if skill1 is lower level and keywords overlap
      if (skill1.bloomLevel < skill2.bloomLevel) {
        const overlap = skill1.keywords.filter(k =>
          skill2.keywords.some(k2 => k2.toLowerCase().includes(k.toLowerCase()))
        )

        if (overlap.length >= 2) {
          inferred.push({
            fromSkillId: skill1.id,
            toSkillId: skill2.id,
            strength: 'helpful',
            confidenceScore: 0.5 + overlap.length * 0.1,
            reasoning: `Bloom's level heuristic: ${skill1.name} (L${skill1.bloomLevel}) likely precedes ${skill2.name} (L${skill2.bloomLevel}). Shared keywords: ${overlap.join(', ')}`,
            inferenceMethod: 'bloom_heuristic',
          })
        }
      }

      // Semantic similarity (if embeddings provided)
      const emb1 = embeddings.get(skill1.id)
      const emb2 = embeddings.get(skill2.id)
      if (emb1 && emb2) {
        const similarity = cosineSimilarity(emb1, emb2)
        if (similarity > 0.8 && skill1.bloomLevel < skill2.bloomLevel) {
          // Only infer if not already added
          const exists = inferred.some(
            r => r.fromSkillId === skill1.id && r.toSkillId === skill2.id
          )
          if (!exists) {
            inferred.push({
              fromSkillId: skill1.id,
              toSkillId: skill2.id,
              strength: 'recommended',
              confidenceScore: similarity * 0.8,
              reasoning: `High semantic similarity (${similarity.toFixed(2)}) with Bloom's level progression`,
              inferenceMethod: 'semantic_similarity',
            })
          }
        }
      }
    }
  }

  return inferred
}

// Helper types for raw LLM response
interface RawExtractionResult {
  skills?: RawSkill[]
  prerequisites?: RawPrerequisite[]
  entities?: RawEntity[]
  entityRelationships?: RawEntityRelationship[]
  existingSkillReferences?: string[]
}

interface RawSkill {
  name: string
  description: string
  bloomLevel: number
  secondaryBloomLevels?: number[]
  estimatedMinutes?: number
  difficulty?: number
  irt?: {
    difficulty: number
    discrimination: number
    guessing: number
  }
  isThresholdConcept?: boolean
  thresholdProperties?: {
    unlocksDomains?: string[]
    troublesomeAspects?: string[]
  }
  cognitiveLoadEstimate?: 'low' | 'medium' | 'high'
  elementInteractivity?: 'low' | 'medium' | 'high'
  chunksRequired?: number
  masteryThreshold?: number
  commonMisconceptions?: string[]
  transferDomains?: string[]
  assessmentTypes?: ('formative' | 'summative' | 'performance' | 'diagnostic' | 'peer')[]
  suggestedAssessments?: {
    type: 'formative' | 'summative' | 'performance' | 'diagnostic' | 'peer'
    description: string
    bloomAlignment: number[]
  }[]
  reviewIntervals?: number[]
  scaffoldingLevels?: {
    level1: string
    level2: string
    level3: string
    level4: string
  }
  keywords?: string[]
  domain?: string
  subdomain?: string
}

interface RawPrerequisite {
  fromSkillName: string
  toSkillName: string
  strength?: 'required' | 'recommended' | 'helpful'
  reasoning?: string
}

interface RawEntity {
  name: string
  type?: 'concept' | 'person' | 'event' | 'place' | 'term' | 'other'
  description?: string
}

interface RawEntityRelationship {
  fromEntityName: string
  toEntityName: string
  type?: string
  description?: string
}

// Validate Bloom's level is in range 1-6
function validateBloomLevel(level: number): BloomLevel {
  const clamped = Math.min(6, Math.max(1, Math.round(level)))
  return clamped as BloomLevel
}

// Cosine similarity for embeddings
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let magA = 0
  let magB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }

  magA = Math.sqrt(magA)
  magB = Math.sqrt(magB)

  if (magA === 0 || magB === 0) return 0
  return dotProduct / (magA * magB)
}

/**
 * Fast extraction for per-source processing
 * Uses a simplified prompt to complete within serverless timeout limits
 * Limits text to 8000 chars to ensure fast completion
 */
export async function extractFromTextFast(
  text: string,
  notebookId: string,
  sourceDocumentId?: string
): Promise<GraphExtractionResult> {
  const ai = getClient()

  // Limit text to first 8000 chars to ensure fast completion
  const MAX_FAST_TEXT = 8000
  const processedText = text.length > MAX_FAST_TEXT
    ? text.slice(0, MAX_FAST_TEXT) + '\n\n[Content truncated for fast processing...]'
    : text

  console.log(`[FastExtraction] Processing ${processedText.length} chars (original: ${text.length})`)

  const prompt = `Extract skills and prerequisites from this educational content. Create a CONNECTED graph - no orphan skills.

## REQUIREMENTS
1. Skills from source content + obvious prerequisites
2. Every skill must connect to at least one other skill
3. Include obvious prerequisite skills even if not explicitly mentioned

TEXT:
${processedText}

Respond with JSON:
{
  "skills": [{"name": "string", "description": "string", "bloomLevel": 1-6, "difficulty": 1-10, "isThresholdConcept": boolean}],
  "prerequisites": [{"fromSkillName": "prerequisite (learned FIRST)", "toSkillName": "dependent skill", "strength": "required"|"recommended"|"helpful"}]
}

**VALIDATION: Every skill must appear in at least one prerequisite (as from OR to).**`

  const startTime = Date.now()
  let response
  try {
    response = await ai.models.generateContent({
      model: EXTRACTION_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    })
    console.log(`[FastExtraction] Completed in ${Date.now() - startTime}ms`)
  } catch (apiError) {
    console.error('[FastExtraction] API failed:', apiError)
    throw new Error(`Fast extraction failed: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`)
  }

  const responseText = response.text
  if (!responseText) {
    throw new Error('Empty response from extraction')
  }

  let parsed: { skills?: RawSkill[]; prerequisites?: RawPrerequisite[] }
  try {
    parsed = JSON.parse(responseText)
  } catch {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1])
    } else {
      throw new Error('Failed to parse extraction response')
    }
  }

  console.log(`[FastExtraction] Extracted ${parsed.skills?.length || 0} skills, ${parsed.prerequisites?.length || 0} prerequisites`)

  const now = Date.now()

  // Convert to typed result
  const skills: SkillNode[] = (parsed.skills || []).map((s, idx) => ({
    id: `skill_${notebookId}_${now}_${idx}`,
    name: s.name,
    description: s.description || '',
    notebookId,
    bloomLevel: validateBloomLevel(s.bloomLevel || 2),
    estimatedMinutes: 30,
    difficulty: Math.min(10, Math.max(1, s.difficulty || 5)),
    isThresholdConcept: s.isThresholdConcept || false,
    cognitiveLoadEstimate: 'medium' as const,
    keywords: [],
    sourceDocumentId,
    createdAt: now,
    updatedAt: now,
  }))

  const skillNameToId = new Map(skills.map(s => [s.name.toLowerCase(), s.id]))

  const prerequisites: PrerequisiteRelationship[] = (parsed.prerequisites || [])
    .map(p => {
      const fromId = skillNameToId.get(p.fromSkillName.toLowerCase())
      const toId = skillNameToId.get(p.toSkillName.toLowerCase())
      if (!fromId || !toId) return null

      return {
        fromSkillId: fromId,
        toSkillId: toId,
        strength: p.strength || 'recommended',
        confidenceScore: 0.8,
        inferenceMethod: 'llm_extracted' as const,
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)

  return {
    skills,
    prerequisites,
    entities: [],
    entityRelationships: [],
  }
}
