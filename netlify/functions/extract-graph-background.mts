/**
 * Netlify Background Function for async graph extraction
 * Runs for up to 15 minutes without timeout issues
 *
 * Triggered via: /.netlify/functions/extract-graph-background
 */

import type { Context, Config } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

// Export config for background execution
export const config: Config = {
  path: '/.netlify/functions/extract-graph-background',
}

interface ExtractRequest {
  jobId: string
  notebookId: string
  sourceId: string
  text: string
}

interface RawSkill {
  name: string
  description: string
  bloomLevel: number
  estimatedMinutes?: number
  difficulty?: number
  irt?: {
    difficulty: number
    discrimination: number
    guessing: number
  }
  isThresholdConcept?: boolean
  cognitiveLoadEstimate?: 'low' | 'medium' | 'high'
  commonMisconceptions?: string[]
  keywords?: string[]
}

interface RawPrerequisite {
  fromSkillName: string
  toSkillName: string
  strength?: 'required' | 'recommended' | 'helpful'
  reasoning?: string
}

interface RawEntity {
  name: string
  type?: string
  description?: string
}

interface RawEntityRelationship {
  fromEntityName: string
  toEntityName: string
  type?: string
  description?: string
}

interface RawExtractionResult {
  skills?: RawSkill[]
  prerequisites?: RawPrerequisite[]
  entities?: RawEntity[]
  entityRelationships?: RawEntityRelationship[]
  existingSkillReferences?: string[]
}

// Background handler - returns 202 immediately, continues processing
export default async function handler(request: Request, context: Context) {
  // Immediately acknowledge receipt
  console.log('[BackgroundExtraction] Function triggered')

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const body = await request.json() as ExtractRequest
  const { jobId, notebookId, sourceId, text } = body

  if (!jobId || !notebookId || !sourceId || !text) {
    return new Response('Missing required fields', { status: 400 })
  }

  // Start background processing
  context.waitUntil(processExtraction(jobId, notebookId, sourceId, text))

  // Return 202 Accepted immediately
  return new Response(JSON.stringify({
    status: 'accepted',
    jobId,
    message: 'Extraction started in background'
  }), {
    status: 202,
    headers: { 'Content-Type': 'application/json' }
  })
}

async function processExtraction(
  jobId: string,
  notebookId: string,
  sourceId: string,
  text: string
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
  const geminiKey = process.env.GEMINI_API_KEY!
  const neo4jUri = process.env.NEO4J_URI
  const neo4jUser = process.env.NEO4J_USER
  const neo4jPassword = process.env.NEO4J_PASSWORD

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log(`[BackgroundExtraction] Processing job ${jobId}, source ${sourceId}, ${text.length} chars`)

  try {
    // Update job status to processing
    await supabase
      .from('extraction_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId)

    // Run full extraction
    const extractionResult = await runExtraction(geminiKey, text, notebookId, sourceId)

    console.log(`[BackgroundExtraction] Extracted ${extractionResult.skills.length} skills, ${extractionResult.prerequisites.length} prerequisites`)

    // Store in Neo4J if available
    if (neo4jUri && neo4jUser && neo4jPassword) {
      await storeInNeo4J(
        neo4jUri,
        neo4jUser,
        neo4jPassword,
        extractionResult,
        sourceId
      )
    }

    // Update job as completed
    await supabase
      .from('extraction_jobs')
      .update({
        status: 'completed',
        skill_count: extractionResult.skills.length,
        prerequisite_count: extractionResult.prerequisites.length,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)

    console.log(`[BackgroundExtraction] Job ${jobId} completed successfully`)

  } catch (error) {
    console.error(`[BackgroundExtraction] Job ${jobId} failed:`, error)

    await supabase
      .from('extraction_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)
  }
}

async function runExtraction(
  apiKey: string,
  text: string,
  notebookId: string,
  sourceDocumentId: string
) {
  const ai = new GoogleGenAI({ apiKey })
  const model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview'

  // Use the full detailed prompt for quality extraction
  const prompt = `You are an expert curriculum designer. Analyze this educational content and extract a knowledge graph that accurately represents the learning structure.

Your goal is to create a USEFUL and ACCURATE knowledge graph for learning.

Extract:
1. **Skills/Concepts**: The learnable skills, concepts, techniques, and procedures
   - What does a learner need to know or be able to do after studying this?
   - Include both knowledge (understanding concepts) and abilities (applying techniques)
   - Use your expertise: if an obvious foundational skill is needed but not explicitly stated, include it

2. **Prerequisites**: The dependency relationships between skills
   - Which skills must be learned before others?
   - Include OBVIOUS prerequisites even if not explicitly stated (e.g., "calculating mean" before "calculating standard deviation")
   - Use pedagogical judgment - what would a good teacher identify as prerequisites?

3. **Entities**: Key terms, people, formulas, theorems, and important references

4. **Entity Relationships**: How entities relate to each other

For each skill, assess:
- Bloom's Taxonomy level (1=Remember, 2=Understand, 3=Apply, 4=Analyze, 5=Evaluate, 6=Create)
- Whether it's a "threshold concept" (transformative knowledge that unlocks new understanding)
- Estimated time to learn (in minutes)
- Difficulty (1-10)
- IRT parameters for assessment:
  - difficulty: -3 to +3 (0 = average)
  - discrimination: 0.5 to 2.5
  - guessing: 0 to 0.5
- Cognitive load estimate
- Common misconceptions students might have
- Keywords for the skill

TEXT TO ANALYZE:
${text}

Respond with valid JSON:
{
  "skills": [
    {
      "name": "string (unique, descriptive name)",
      "description": "string (1-2 sentences explaining the skill)",
      "bloomLevel": 1-6,
      "estimatedMinutes": number,
      "difficulty": 1-10,
      "irt": {
        "difficulty": -3 to +3,
        "discrimination": 0.5 to 2.5,
        "guessing": 0 to 0.5
      },
      "isThresholdConcept": boolean,
      "cognitiveLoadEstimate": "low" | "medium" | "high",
      "commonMisconceptions": ["misconception 1", "misconception 2"],
      "keywords": ["relevant keywords"]
    }
  ],
  "prerequisites": [
    {
      "fromSkillName": "prerequisite skill name (must be learned FIRST)",
      "toSkillName": "dependent skill name (requires the prerequisite)",
      "strength": "required" | "recommended" | "helpful",
      "reasoning": "why this prerequisite relationship exists"
    }
  ],
  "entities": [
    {
      "name": "entity name",
      "type": "concept" | "person" | "event" | "place" | "term" | "formula" | "other",
      "description": "brief description"
    }
  ],
  "entityRelationships": [
    {
      "fromEntityName": "source entity",
      "toEntityName": "target entity",
      "type": "related_to" | "part_of" | "causes" | "precedes" | "example_of" | "opposite_of",
      "description": "optional description"
    }
  ]
}

GUIDELINES:
- Focus on creating a USEFUL learning graph, not just a literal extraction
- Include obvious prerequisites even if not explicitly mentioned in the text
- Use your expertise as a curriculum designer - add foundational skills that learners would need
- A truly foundational skill (like basic arithmetic) doesn't need prerequisites
- Be thorough - analyze the entire content
- The graph should help a learner understand the progression of skills`

  console.log(`[BackgroundExtraction] Calling Gemini API with ${text.length} chars`)
  const startTime = Date.now()

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.3,
    },
  })

  console.log(`[BackgroundExtraction] Gemini completed in ${Date.now() - startTime}ms`)

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

  const now = Date.now()

  // Transform to typed result
  const skills = (parsed.skills || []).map((s, idx) => ({
    id: `skill_${notebookId}_${now}_${idx}`,
    name: s.name,
    description: s.description,
    notebookId,
    bloomLevel: Math.min(6, Math.max(1, Math.round(s.bloomLevel || 2))),
    estimatedMinutes: s.estimatedMinutes ? Math.min(120, Math.max(5, s.estimatedMinutes)) : 30,
    difficulty: Math.min(10, Math.max(1, s.difficulty || 5)),
    irt: s.irt ? {
      difficulty: Math.min(3, Math.max(-3, s.irt.difficulty || 0)),
      discrimination: Math.min(2.5, Math.max(0.5, s.irt.discrimination || 1)),
      guessing: Math.min(0.5, Math.max(0, s.irt.guessing || 0.2)),
    } : undefined,
    isThresholdConcept: s.isThresholdConcept || false,
    cognitiveLoadEstimate: s.cognitiveLoadEstimate || 'medium',
    commonMisconceptions: s.commonMisconceptions || [],
    keywords: s.keywords || [],
    sourceDocumentId,
    createdAt: now,
    updatedAt: now,
  }))

  const skillNameToId = new Map(skills.map(s => [s.name.toLowerCase(), s.id]))

  const prerequisites = (parsed.prerequisites || [])
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
        inferenceMethod: 'llm_extracted',
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)

  const entities = (parsed.entities || []).map((e, idx) => ({
    id: `entity_${notebookId}_${now}_${idx}`,
    name: e.name,
    type: e.type || 'other',
    description: e.description,
    notebookId,
    sourceDocumentId,
    createdAt: now,
  }))

  const entityNameToId = new Map(entities.map(e => [e.name.toLowerCase(), e.id]))

  const entityRelationships = (parsed.entityRelationships || [])
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

  return { skills, prerequisites, entities, entityRelationships }
}

async function storeInNeo4J(
  uri: string,
  user: string,
  password: string,
  result: Awaited<ReturnType<typeof runExtraction>>,
  sourceId: string
) {
  // Dynamic import to avoid bundling issues
  const neo4j = await import('neo4j-driver')
  const driver = neo4j.default.driver(uri, neo4j.default.auth.basic(user, password))
  const session = driver.session()

  try {
    // Delete existing skills for this source first
    await session.run(
      `
      MATCH (s:Skill {sourceDocumentId: $sourceId})
      DETACH DELETE s
      `,
      { sourceId }
    )

    // Delete existing entities for this source
    await session.run(
      `
      MATCH (e:Entity {sourceDocumentId: $sourceId})
      DETACH DELETE e
      `,
      { sourceId }
    )

    // Store skills
    for (const skill of result.skills) {
      await session.run(
        `
        CREATE (s:Skill {
          id: $id,
          name: $name,
          description: $description,
          notebookId: $notebookId,
          sourceDocumentId: $sourceDocumentId,
          bloomLevel: $bloomLevel,
          difficulty: $difficulty,
          estimatedMinutes: $estimatedMinutes,
          isThresholdConcept: $isThresholdConcept,
          cognitiveLoadEstimate: $cognitiveLoadEstimate,
          irtDifficulty: $irtDifficulty,
          irtDiscrimination: $irtDiscrimination,
          irtGuessing: $irtGuessing,
          keywords: $keywords,
          commonMisconceptions: $commonMisconceptions,
          createdAt: $createdAt,
          updatedAt: $updatedAt
        })
        `,
        {
          id: skill.id,
          name: skill.name,
          description: skill.description,
          notebookId: skill.notebookId,
          sourceDocumentId: skill.sourceDocumentId,
          bloomLevel: skill.bloomLevel,
          difficulty: skill.difficulty,
          estimatedMinutes: skill.estimatedMinutes,
          isThresholdConcept: skill.isThresholdConcept,
          cognitiveLoadEstimate: skill.cognitiveLoadEstimate,
          irtDifficulty: skill.irt?.difficulty ?? 0,
          irtDiscrimination: skill.irt?.discrimination ?? 1,
          irtGuessing: skill.irt?.guessing ?? 0.2,
          keywords: skill.keywords,
          commonMisconceptions: skill.commonMisconceptions,
          createdAt: skill.createdAt,
          updatedAt: skill.updatedAt,
        }
      )
    }

    // Store prerequisites
    for (const prereq of result.prerequisites) {
      await session.run(
        `
        MATCH (from:Skill {id: $fromId})
        MATCH (to:Skill {id: $toId})
        CREATE (from)-[:PREREQUISITE_OF {
          strength: $strength,
          confidenceScore: $confidenceScore,
          reasoning: $reasoning,
          inferenceMethod: $inferenceMethod
        }]->(to)
        `,
        {
          fromId: prereq.fromSkillId,
          toId: prereq.toSkillId,
          strength: prereq.strength,
          confidenceScore: prereq.confidenceScore,
          reasoning: prereq.reasoning || '',
          inferenceMethod: prereq.inferenceMethod,
        }
      )
    }

    // Store entities
    for (const entity of result.entities) {
      await session.run(
        `
        CREATE (e:Entity {
          id: $id,
          name: $name,
          type: $type,
          description: $description,
          notebookId: $notebookId,
          sourceDocumentId: $sourceDocumentId,
          createdAt: $createdAt
        })
        `,
        {
          id: entity.id,
          name: entity.name,
          type: entity.type,
          description: entity.description || '',
          notebookId: entity.notebookId,
          sourceDocumentId: entity.sourceDocumentId,
          createdAt: entity.createdAt,
        }
      )
    }

    // Store entity relationships
    for (const rel of result.entityRelationships) {
      await session.run(
        `
        MATCH (from:Entity {id: $fromId})
        MATCH (to:Entity {id: $toId})
        CREATE (from)-[:RELATES_TO {
          type: $type,
          description: $description,
          confidence: $confidence
        }]->(to)
        `,
        {
          fromId: rel.fromEntityId,
          toId: rel.toEntityId,
          type: rel.type,
          description: rel.description || '',
          confidence: rel.confidence,
        }
      )
    }

    console.log(`[BackgroundExtraction] Stored ${result.skills.length} skills, ${result.prerequisites.length} prerequisites in Neo4J`)
  } finally {
    await session.close()
    await driver.close()
  }
}
