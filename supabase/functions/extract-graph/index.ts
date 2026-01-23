/**
 * Supabase Edge Function for graph extraction
 * Has 150 second timeout on paid plans
 *
 * Deploy: supabase functions deploy extract-graph
 * Invoke: POST https://<project-ref>.supabase.co/functions/v1/extract-graph
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExtractRequest {
  jobId: string
  notebookId: string
  sourceId: string
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
  assessmentTypes?: string[]
  suggestedAssessments?: {
    type: string
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
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  let jobId: string | undefined

  try {
    console.log('[ExtractGraph] Edge function invoked')

    const body = await req.json() as ExtractRequest
    jobId = body.jobId
    const { notebookId, sourceId } = body

    if (!jobId || !notebookId || !sourceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: jobId, notebookId, sourceId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[ExtractGraph] Processing job ${jobId}, notebook ${notebookId}, source ${sourceId}`)

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!

    console.log(`[ExtractGraph] Supabase URL: ${supabaseUrl}`)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update job status to processing
    const { error: processingError } = await supabase
      .from('extraction_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', jobId)

    if (processingError) {
      console.error(`[ExtractGraph] Failed to set processing status:`, processingError)
    }

    // Fetch source content
    const { data: source } = await supabase
      .from('sources')
      .select('raw_text')
      .eq('id', sourceId)
      .single()

    let text = source?.raw_text

    if (!text) {
      // Try to reconstruct from chunks
      const { data: chunks } = await supabase
        .from('chunks')
        .select('content')
        .eq('source_id', sourceId)
        .order('chunk_index', { ascending: true })

      if (chunks && chunks.length > 0) {
        text = chunks.map((c: { content: string }) => c.content).join('\n\n')
      }
    }

    if (!text) {
      await supabase
        .from('extraction_jobs')
        .update({
          status: 'failed',
          error_message: 'No content available for source',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)

      return new Response(
        JSON.stringify({ error: 'No content available for source' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[ExtractGraph] Starting extraction: ${text.length} chars`)

    // Run extraction via Gemini REST API
    const extractionResult = await runExtraction(geminiApiKey, text, notebookId, sourceId)

    console.log(`[ExtractGraph] Extracted ${extractionResult.skills.length} skills, ${extractionResult.prerequisites.length} prerequisites in ${Date.now() - startTime}ms`)

    // Store results in Supabase for Next.js to sync to Neo4J
    // (Neo4J AuraDB Free doesn't support HTTP API, only Bolt protocol)
    const { error: updateError } = await supabase
      .from('extraction_jobs')
      .update({
        status: 'completed',
        skill_count: extractionResult.skills.length,
        prerequisite_count: extractionResult.prerequisites.length,
        result_data: extractionResult,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (updateError) {
      console.error(`[ExtractGraph] Failed to update job in Supabase:`, updateError)
      throw new Error(`Supabase update failed: ${updateError.message}`)
    }

    console.log(`[ExtractGraph] Stored results in Supabase, pending Neo4J sync`)

    console.log(`[ExtractGraph] Job ${jobId} completed in ${Date.now() - startTime}ms`)

    return new Response(
      JSON.stringify({
        success: true,
        skillCount: extractionResult.skills.length,
        prerequisiteCount: extractionResult.prerequisites.length,
        durationMs: Date.now() - startTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error(`[ExtractGraph] Error:`, error)

    // Try to mark job as failed
    if (jobId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        await supabase
          .from('extraction_jobs')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId)
      } catch (updateError) {
        console.error('[ExtractGraph] Failed to update job status:', updateError)
      }
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Extraction failed'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function runExtraction(
  apiKey: string,
  text: string,
  notebookId: string,
  sourceDocumentId: string
) {
  // Use Gemini 3 Flash as default
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-3-flash-preview'

  // Comprehensive extraction prompt with full ed psych frameworks
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

## EDUCATIONAL PSYCHOLOGY FRAMEWORKS

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

## CONTENT TO ANALYZE

${text}

## OUTPUT FORMAT (JSON)

{
  "skills": [
    {
      "name": "Specific skill name",
      "description": "What will the learner know/do?",
      "bloomLevel": 1-6,
      "secondaryBloomLevels": [],
      "estimatedMinutes": 5-45,
      "difficulty": 1-10,
      "irt": { "difficulty": -3 to +3, "discrimination": 0.5-2.5, "guessing": 0-0.5 },
      "isThresholdConcept": true/false,
      "thresholdProperties": { "unlocksDomains": [], "troublesomeAspects": [] },
      "cognitiveLoadEstimate": "low|medium|high",
      "chunksRequired": 2-7,
      "elementInteractivity": "low|medium|high",
      "masteryThreshold": 0.80,
      "assessmentTypes": ["formative", "summative"],
      "suggestedAssessments": [{ "type": "formative", "description": "", "bloomAlignment": [1,2] }],
      "reviewIntervals": [1, 3, 7, 14, 30, 60],
      "scaffoldingLevels": { "level1": "", "level2": "", "level3": "", "level4": "" },
      "commonMisconceptions": [],
      "transferDomains": [],
      "keywords": [],
      "domain": "",
      "subdomain": ""
    }
  ],
  "prerequisites": [
    {
      "fromSkillName": "prerequisite (learned FIRST)",
      "toSkillName": "dependent skill",
      "strength": "required|recommended|helpful",
      "reasoning": "why this dependency"
    }
  ],
  "entities": [{ "name": "", "type": "concept|person|term|formula|other", "description": "" }],
  "entityRelationships": [{ "fromEntityName": "", "toEntityName": "", "type": "related_to|part_of|causes", "description": "" }]
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

  console.log(`[ExtractGraph] Calling Gemini API with ${text.length} chars`)
  const geminiStartTime = Date.now()

  // Call Gemini REST API directly
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  console.log(`[ExtractGraph] Gemini completed in ${Date.now() - geminiStartTime}ms`)

  const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text
  if (!responseText) {
    throw new Error('Empty response from extraction model')
  }

  let parsed: RawExtractionResult
  try {
    parsed = JSON.parse(responseText)
  } catch (parseError) {
    console.log(`[ExtractGraph] Direct JSON parse failed, trying to extract from markdown...`)
    console.log(`[ExtractGraph] Response preview: ${responseText.substring(0, 500)}...`)

    // Try to extract JSON from markdown code blocks
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[1])
      } catch {
        console.error(`[ExtractGraph] Failed to parse JSON from code block`)
        throw new Error('Failed to parse extraction response as JSON')
      }
    } else {
      // Try to find JSON object directly (might have extra text before/after)
      const jsonObjectMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonObjectMatch) {
        try {
          parsed = JSON.parse(jsonObjectMatch[0])
          console.log(`[ExtractGraph] Successfully extracted JSON object from response`)
        } catch {
          console.error(`[ExtractGraph] Failed to parse extracted JSON object`)
          console.error(`[ExtractGraph] Full response: ${responseText}`)
          throw new Error('Failed to parse extraction response as JSON')
        }
      } else {
        console.error(`[ExtractGraph] No JSON found in response: ${responseText}`)
        throw new Error('Failed to parse extraction response as JSON')
      }
    }
  }

  const now = Date.now()

  // Helper to validate Bloom level
  const validateBloomLevel = (level: number): number => Math.min(6, Math.max(1, Math.round(level || 2)))

  // Transform to typed result with full educational psychology metadata
  const skills = (parsed.skills || []).map((s, idx) => ({
    id: `skill_${notebookId}_${now}_${idx}`,
    name: s.name,
    description: s.description,
    notebookId,
    bloomLevel: validateBloomLevel(s.bloomLevel),
    secondaryBloomLevels: s.secondaryBloomLevels?.map(validateBloomLevel),
    estimatedMinutes: s.estimatedMinutes ? Math.min(120, Math.max(5, s.estimatedMinutes)) : 30,
    difficulty: Math.min(10, Math.max(1, s.difficulty || 5)),
    irt: s.irt ? {
      difficulty: Math.min(3, Math.max(-3, s.irt.difficulty || 0)),
      discrimination: Math.min(2.5, Math.max(0.5, s.irt.discrimination || 1)),
      guessing: Math.min(0.5, Math.max(0, s.irt.guessing || 0.2)),
    } : undefined,
    isThresholdConcept: s.isThresholdConcept || false,
    thresholdProperties: s.thresholdProperties,
    cognitiveLoadEstimate: s.cognitiveLoadEstimate || 'medium',
    elementInteractivity: s.elementInteractivity,
    chunksRequired: s.chunksRequired ? Math.min(7, Math.max(2, s.chunksRequired)) : undefined,
    masteryThreshold: s.masteryThreshold || (s.isThresholdConcept ? 0.90 : 0.80),
    assessmentTypes: s.assessmentTypes,
    suggestedAssessments: s.suggestedAssessments?.map(a => ({
      type: a.type,
      description: a.description,
      bloomAlignment: a.bloomAlignment?.map(validateBloomLevel) || [],
    })),
    reviewIntervals: s.reviewIntervals || [1, 3, 7, 14, 30, 60],
    scaffoldingLevels: s.scaffoldingLevels,
    commonMisconceptions: s.commonMisconceptions || [],
    transferDomains: s.transferDomains || [],
    keywords: s.keywords || [],
    domain: s.domain,
    subdomain: s.subdomain,
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
