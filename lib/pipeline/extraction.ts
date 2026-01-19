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

const EXTRACTION_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

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

  const existingContext = existingSkillNames?.length
    ? `\n\nExisting skills in this notebook (reference these by name if the text discusses them):\n${existingSkillNames.join(', ')}`
    : ''

  const prompt = `Analyze the following educational content and extract:

1. **Skills/Concepts**: Learning objectives or competencies that can be mastered
2. **Entities**: Key terms, people, events, or concepts mentioned
3. **Prerequisites**: Relationships where one skill must be learned before another
4. **Entity Relationships**: How entities relate to each other

For each skill, determine:
- Bloom's Taxonomy level (1=Remember, 2=Understand, 3=Apply, 4=Analyze, 5=Evaluate, 6=Create)
- Whether it's a "threshold concept" (transformative, troublesome knowledge that unlocks new understanding)
- Estimated time to learn (in minutes)
- Difficulty (1-10)
- IRT parameters (Item Response Theory 3PL model):
  - difficulty: -3 to +3 (0 = average, positive = harder)
  - discrimination: 0.5 to 2.5 (how well it differentiates learner ability)
  - guessing: 0 to 0.5 (probability of guessing correctly, lower for open-ended)
- Cognitive load (low/medium/high) and element interactivity
- Working memory chunks required (2-7, based on Miller's Law)
- Mastery threshold (0.80 for regular skills, 0.90 for threshold concepts)
- Common misconceptions students might have
- Transfer domains (where else this skill applies)
- Suggested assessments aligned with Bloom's level
- Spaced repetition review intervals (in days)
- Scaffolding levels (worked examples → hints → independent practice)
${existingContext}

TEXT TO ANALYZE:
${text}

Respond with valid JSON matching this structure:
{
  "skills": [
    {
      "name": "string (unique, descriptive name)",
      "description": "string (1-2 sentences explaining the skill)",
      "bloomLevel": 1-6,
      "secondaryBloomLevels": [optional array of 1-6],
      "estimatedMinutes": number,
      "difficulty": 1-10,
      "irt": {
        "difficulty": -3 to +3,
        "discrimination": 0.5 to 2.5,
        "guessing": 0 to 0.5
      },
      "isThresholdConcept": boolean,
      "thresholdProperties": {
        "unlocksDomains": ["optional array of domains this unlocks"],
        "troublesomeAspects": ["what makes this concept difficult"]
      },
      "cognitiveLoadEstimate": "low" | "medium" | "high",
      "elementInteractivity": "low" | "medium" | "high",
      "chunksRequired": 2-7,
      "masteryThreshold": 0.80 or 0.90,
      "commonMisconceptions": ["misconception 1", "misconception 2"],
      "transferDomains": ["domain where skill transfers"],
      "assessmentTypes": ["formative", "summative", "performance", "diagnostic", "peer"],
      "suggestedAssessments": [
        {
          "type": "formative" | "summative" | "performance" | "diagnostic" | "peer",
          "description": "specific assessment activity",
          "bloomAlignment": [1-6]
        }
      ],
      "reviewIntervals": [1, 3, 7, 14, 30, 60],
      "scaffoldingLevels": {
        "level1": "Full worked example description",
        "level2": "Partial solution description",
        "level3": "Hints on request description",
        "level4": "Independent practice description"
      },
      "keywords": ["relevant keywords"],
      "domain": "optional domain classification",
      "subdomain": "optional subdomain"
    }
  ],
  "prerequisites": [
    {
      "fromSkillName": "prerequisite skill name",
      "toSkillName": "dependent skill name",
      "strength": "required" | "recommended" | "helpful",
      "reasoning": "why this prerequisite exists"
    }
  ],
  "entities": [
    {
      "name": "entity name",
      "type": "concept" | "person" | "event" | "place" | "term" | "other",
      "description": "brief description"
    }
  ],
  "entityRelationships": [
    {
      "fromEntityName": "source entity",
      "toEntityName": "target entity",
      "type": "related_to" | "part_of" | "causes" | "precedes" | "example_of" | "opposite_of",
      "description": "optional description of relationship"
    }
  ],
  "existingSkillReferences": ["names of existing skills referenced in this text"]
}

Only extract skills and entities that are clearly present in the text. Be conservative - quality over quantity.`

  const response = await ai.models.generateContent({
    model: EXTRACTION_MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  })

  const responseText = response.text
  if (!responseText) {
    throw new Error('Empty response from extraction model')
  }

  let parsed: RawExtractionResult
  try {
    parsed = JSON.parse(responseText)
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1])
    } else {
      throw new Error('Failed to parse extraction response as JSON')
    }
  }

  const now = Date.now()

  // Convert raw extraction to typed result with IDs
  const skills: SkillNode[] = (parsed.skills || []).map((s, idx) => ({
    id: `skill_${notebookId}_${now}_${idx}`,
    name: s.name,
    description: s.description,
    notebookId,
    bloomLevel: validateBloomLevel(s.bloomLevel),
    secondaryBloomLevels: s.secondaryBloomLevels?.map(validateBloomLevel),
    estimatedMinutes: s.estimatedMinutes,
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
