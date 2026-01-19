/**
 * Neo4J graph store operations for GraphRAG
 */

import { runQuery, runWriteTransaction } from './neo4j'
import type {
  SkillNode,
  EntityNode,
  PrerequisiteRelationship,
  EntityRelationship,
  GraphExtractionResult,
} from '@/lib/types/graph'

// Neo4J Node type - the driver returns nodes with this structure
interface Neo4JNode<T> {
  identity: { low: number; high: number }
  labels: string[]
  properties: T
}

// Helper to extract properties from Neo4J node
function extractProperties<T>(node: Neo4JNode<T> | T): T {
  if (node && typeof node === 'object' && 'properties' in node) {
    return (node as Neo4JNode<T>).properties
  }
  return node as T
}

/**
 * Store extracted skills in Neo4J
 */
export async function storeSkills(skills: SkillNode[]): Promise<void> {
  if (skills.length === 0) return

  await runWriteTransaction(async (tx) => {
    for (const skill of skills) {
      await tx.run(
        `
        MERGE (s:Skill {id: $id})
        SET s.name = $name,
            s.description = $description,
            s.notebookId = $notebookId,
            s.bloomLevel = $bloomLevel,
            s.secondaryBloomLevels = $secondaryBloomLevels,
            s.estimatedMinutes = $estimatedMinutes,
            s.difficulty = $difficulty,
            s.irtDifficulty = $irtDifficulty,
            s.irtDiscrimination = $irtDiscrimination,
            s.irtGuessing = $irtGuessing,
            s.isThresholdConcept = $isThresholdConcept,
            s.cognitiveLoadEstimate = $cognitiveLoadEstimate,
            s.elementInteractivity = $elementInteractivity,
            s.chunksRequired = $chunksRequired,
            s.masteryThreshold = $masteryThreshold,
            s.commonMisconceptions = $commonMisconceptions,
            s.transferDomains = $transferDomains,
            s.assessmentTypes = $assessmentTypes,
            s.suggestedAssessments = $suggestedAssessments,
            s.reviewIntervals = $reviewIntervals,
            s.scaffoldingLevels = $scaffoldingLevels,
            s.keywords = $keywords,
            s.domain = $domain,
            s.subdomain = $subdomain,
            s.sourceDocumentId = $sourceDocumentId,
            s.createdAt = $createdAt,
            s.updatedAt = $updatedAt
        `,
        {
          id: skill.id,
          name: skill.name,
          description: skill.description,
          notebookId: skill.notebookId,
          bloomLevel: skill.bloomLevel,
          secondaryBloomLevels: skill.secondaryBloomLevels || [],
          estimatedMinutes: skill.estimatedMinutes || null,
          difficulty: skill.difficulty || null,
          // IRT 3PL parameters
          irtDifficulty: skill.irt?.difficulty ?? null,
          irtDiscrimination: skill.irt?.discrimination ?? null,
          irtGuessing: skill.irt?.guessing ?? null,
          isThresholdConcept: skill.isThresholdConcept,
          cognitiveLoadEstimate: skill.cognitiveLoadEstimate || null,
          // New educational psychology properties
          elementInteractivity: skill.elementInteractivity || null,
          chunksRequired: skill.chunksRequired || null,
          masteryThreshold: skill.masteryThreshold || 0.80,
          commonMisconceptions: skill.commonMisconceptions || [],
          transferDomains: skill.transferDomains || [],
          assessmentTypes: skill.assessmentTypes || [],
          // Store complex objects as JSON strings
          suggestedAssessments: skill.suggestedAssessments ? JSON.stringify(skill.suggestedAssessments) : null,
          reviewIntervals: skill.reviewIntervals || [1, 3, 7, 14, 30, 60],
          scaffoldingLevels: skill.scaffoldingLevels ? JSON.stringify(skill.scaffoldingLevels) : null,
          keywords: skill.keywords,
          domain: skill.domain || null,
          subdomain: skill.subdomain || null,
          sourceDocumentId: skill.sourceDocumentId || null,
          createdAt: skill.createdAt,
          updatedAt: skill.updatedAt,
        }
      )
    }
  })
}

/**
 * Store prerequisite relationships in Neo4J
 */
export async function storePrerequisites(prerequisites: PrerequisiteRelationship[]): Promise<void> {
  if (prerequisites.length === 0) return

  await runWriteTransaction(async (tx) => {
    for (const prereq of prerequisites) {
      await tx.run(
        `
        MATCH (from:Skill {id: $fromSkillId})
        MATCH (to:Skill {id: $toSkillId})
        MERGE (from)-[r:PREREQUISITE_OF]->(to)
        SET r.strength = $strength,
            r.confidenceScore = $confidenceScore,
            r.reasoning = $reasoning,
            r.inferenceMethod = $inferenceMethod
        `,
        {
          fromSkillId: prereq.fromSkillId,
          toSkillId: prereq.toSkillId,
          strength: prereq.strength,
          confidenceScore: prereq.confidenceScore,
          reasoning: prereq.reasoning || null,
          inferenceMethod: prereq.inferenceMethod || null,
        }
      )
    }
  })
}

/**
 * Store entities in Neo4J
 */
export async function storeEntities(entities: EntityNode[]): Promise<void> {
  if (entities.length === 0) return

  await runWriteTransaction(async (tx) => {
    for (const entity of entities) {
      await tx.run(
        `
        MERGE (e:Entity {id: $id})
        SET e.name = $name,
            e.type = $type,
            e.description = $description,
            e.notebookId = $notebookId,
            e.sourceDocumentId = $sourceDocumentId,
            e.createdAt = $createdAt
        `,
        {
          id: entity.id,
          name: entity.name,
          type: entity.type,
          description: entity.description || null,
          notebookId: entity.notebookId,
          sourceDocumentId: entity.sourceDocumentId || null,
          createdAt: entity.createdAt,
        }
      )
    }
  })
}

/**
 * Store entity relationships in Neo4J
 */
export async function storeEntityRelationships(relationships: EntityRelationship[]): Promise<void> {
  if (relationships.length === 0) return

  await runWriteTransaction(async (tx) => {
    for (const rel of relationships) {
      // Use a generic RELATES_TO relationship with a type property
      await tx.run(
        `
        MATCH (from:Entity {id: $fromEntityId})
        MATCH (to:Entity {id: $toEntityId})
        MERGE (from)-[r:RELATES_TO]->(to)
        SET r.type = $type,
            r.description = $description,
            r.confidence = $confidence
        `,
        {
          fromEntityId: rel.fromEntityId,
          toEntityId: rel.toEntityId,
          type: rel.type,
          description: rel.description || null,
          confidence: rel.confidence,
        }
      )
    }
  })
}

/**
 * Store complete graph extraction result
 */
export async function storeGraphExtraction(result: GraphExtractionResult): Promise<void> {
  await storeSkills(result.skills)
  await storeEntities(result.entities)
  await storePrerequisites(result.prerequisites)
  await storeEntityRelationships(result.entityRelationships)
}

/**
 * Get all skills for a notebook
 */
export async function getSkillsByNotebook(notebookId: string): Promise<SkillNode[]> {
  const result = await runQuery<{ s: Neo4JNode<SkillNode> | SkillNode }>(
    `
    MATCH (s:Skill {notebookId: $notebookId})
    RETURN s
    ORDER BY s.createdAt DESC
    `,
    { notebookId }
  )

  return result.map(r => extractProperties(r.s))
}

/**
 * Get all entities for a notebook
 */
export async function getEntitiesByNotebook(notebookId: string): Promise<EntityNode[]> {
  const result = await runQuery<{ e: Neo4JNode<EntityNode> | EntityNode }>(
    `
    MATCH (e:Entity {notebookId: $notebookId})
    RETURN e
    ORDER BY e.createdAt DESC
    `,
    { notebookId }
  )

  return result.map(r => extractProperties(r.e))
}

/**
 * Get skill prerequisites (skills that this skill depends on)
 */
export async function getSkillPrerequisites(skillId: string): Promise<{
  skill: SkillNode
  relationship: PrerequisiteRelationship
}[]> {
  const result = await runQuery<{
    prereq: Neo4JNode<SkillNode> | SkillNode
    r: Neo4JNode<PrerequisiteRelationship> | PrerequisiteRelationship
  }>(
    `
    MATCH (prereq:Skill)-[r:PREREQUISITE_OF]->(s:Skill {id: $skillId})
    RETURN prereq, r
    `,
    { skillId }
  )

  return result.map(r => ({
    skill: extractProperties(r.prereq),
    relationship: extractProperties(r.r),
  }))
}

/**
 * Get skills that depend on this skill
 */
export async function getSkillDependents(skillId: string): Promise<{
  skill: SkillNode
  relationship: PrerequisiteRelationship
}[]> {
  const result = await runQuery<{
    dependent: Neo4JNode<SkillNode> | SkillNode
    r: Neo4JNode<PrerequisiteRelationship> | PrerequisiteRelationship
  }>(
    `
    MATCH (s:Skill {id: $skillId})-[r:PREREQUISITE_OF]->(dependent:Skill)
    RETURN dependent, r
    `,
    { skillId }
  )

  return result.map(r => ({
    skill: extractProperties(r.dependent),
    relationship: extractProperties(r.r),
  }))
}

/**
 * Get related entities for an entity
 */
export async function getRelatedEntities(entityId: string): Promise<{
  entity: EntityNode
  relationship: EntityRelationship
}[]> {
  const result = await runQuery<{
    related: Neo4JNode<EntityNode> | EntityNode
    r: Neo4JNode<EntityRelationship> | EntityRelationship
  }>(
    `
    MATCH (e:Entity {id: $entityId})-[r:RELATES_TO]-(related:Entity)
    RETURN related, r
    `,
    { entityId }
  )

  return result.map(r => ({
    entity: extractProperties(r.related),
    relationship: extractProperties(r.r),
  }))
}

/**
 * Get the skill graph for a notebook (skills + prerequisites)
 */
export async function getSkillGraph(notebookId: string): Promise<{
  skills: SkillNode[]
  prerequisites: PrerequisiteRelationship[]
}> {
  const skillsResult = await runQuery<{ s: Neo4JNode<SkillNode> | SkillNode }>(
    `
    MATCH (s:Skill {notebookId: $notebookId})
    RETURN s
    `,
    { notebookId }
  )

  const prereqsResult = await runQuery<{
    fromId: string
    toId: string
    r: Neo4JNode<Omit<PrerequisiteRelationship, 'fromSkillId' | 'toSkillId'>> | Omit<PrerequisiteRelationship, 'fromSkillId' | 'toSkillId'>
  }>(
    `
    MATCH (from:Skill {notebookId: $notebookId})-[r:PREREQUISITE_OF]->(to:Skill {notebookId: $notebookId})
    RETURN from.id as fromId, to.id as toId, r
    `,
    { notebookId }
  )

  return {
    skills: skillsResult.map(r => extractProperties(r.s)),
    prerequisites: prereqsResult.map(r => ({
      ...extractProperties(r.r),
      fromSkillId: r.fromId,
      toSkillId: r.toId,
    })),
  }
}

/**
 * Delete all graph data for a notebook
 */
export async function deleteNotebookGraph(notebookId: string): Promise<void> {
  await runWriteTransaction(async (tx) => {
    // Delete all relationships and nodes for this notebook
    await tx.run(
      `
      MATCH (n {notebookId: $notebookId})
      DETACH DELETE n
      `,
      { notebookId }
    )
  })
  console.log(`[Neo4J] Deleted all graph data for notebook: ${notebookId}`)
}

/**
 * Delete all graph data for a specific source document
 */
export async function deleteSourceGraph(sourceDocumentId: string): Promise<void> {
  await runWriteTransaction(async (tx) => {
    // Delete all nodes that reference this source document
    await tx.run(
      `
      MATCH (n {sourceDocumentId: $sourceDocumentId})
      DETACH DELETE n
      `,
      { sourceDocumentId }
    )
  })
  console.log(`[Neo4J] Deleted all graph data for source: ${sourceDocumentId}`)
}

/**
 * Delete all graph data for multiple notebooks (user cleanup)
 */
export async function deleteNotebooksGraph(notebookIds: string[]): Promise<number> {
  if (notebookIds.length === 0) return 0

  let totalDeleted = 0
  await runWriteTransaction(async (tx) => {
    const result = await tx.run(
      `
      MATCH (n)
      WHERE n.notebookId IN $notebookIds
      WITH n, count(*) as nodeCount
      DETACH DELETE n
      RETURN count(*) as deleted
      `,
      { notebookIds }
    )
    totalDeleted = result.records[0]?.get('deleted')?.toNumber?.() || 0
  })
  console.log(`[Neo4J] Deleted graph data for ${notebookIds.length} notebooks (${totalDeleted} nodes)`)
  return totalDeleted
}

/**
 * Remove orphaned nodes (nodes without a valid notebookId)
 */
export async function cleanupOrphanedNodes(): Promise<{ skills: number; entities: number }> {
  let skillsDeleted = 0
  let entitiesDeleted = 0

  await runWriteTransaction(async (tx) => {
    // Delete orphaned skills (no notebookId or null notebookId)
    const skillResult = await tx.run(
      `
      MATCH (s:Skill)
      WHERE s.notebookId IS NULL OR s.notebookId = ''
      WITH s, count(*) as cnt
      DETACH DELETE s
      RETURN count(*) as deleted
      `
    )
    skillsDeleted = skillResult.records[0]?.get('deleted')?.toNumber?.() || 0

    // Delete orphaned entities
    const entityResult = await tx.run(
      `
      MATCH (e:Entity)
      WHERE e.notebookId IS NULL OR e.notebookId = ''
      WITH e, count(*) as cnt
      DETACH DELETE e
      RETURN count(*) as deleted
      `
    )
    entitiesDeleted = entityResult.records[0]?.get('deleted')?.toNumber?.() || 0
  })

  console.log(`[Neo4J] Cleaned up orphaned nodes: ${skillsDeleted} skills, ${entitiesDeleted} entities`)
  return { skills: skillsDeleted, entities: entitiesDeleted }
}

/**
 * Get graph statistics for a notebook
 */
export async function getGraphStats(notebookId: string): Promise<{
  skillCount: number
  entityCount: number
  prerequisiteCount: number
  entityRelationshipCount: number
}> {
  const results = await runQuery<{
    skillCount: number
    entityCount: number
    prerequisiteCount: number
    entityRelationshipCount: number
  }>(
    `
    MATCH (s:Skill {notebookId: $notebookId})
    WITH count(s) as skillCount
    MATCH (e:Entity {notebookId: $notebookId})
    WITH skillCount, count(e) as entityCount
    OPTIONAL MATCH (s1:Skill {notebookId: $notebookId})-[p:PREREQUISITE_OF]->(s2:Skill {notebookId: $notebookId})
    WITH skillCount, entityCount, count(p) as prerequisiteCount
    OPTIONAL MATCH (e1:Entity {notebookId: $notebookId})-[r:RELATES_TO]->(e2:Entity {notebookId: $notebookId})
    RETURN skillCount, entityCount, prerequisiteCount, count(r) as entityRelationshipCount
    `,
    { notebookId }
  )

  if (results.length === 0) {
    return { skillCount: 0, entityCount: 0, prerequisiteCount: 0, entityRelationshipCount: 0 }
  }

  const row = results[0]
  return {
    skillCount: typeof row.skillCount === 'object' && 'toNumber' in row.skillCount
      ? (row.skillCount as { toNumber: () => number }).toNumber()
      : Number(row.skillCount) || 0,
    entityCount: typeof row.entityCount === 'object' && 'toNumber' in row.entityCount
      ? (row.entityCount as { toNumber: () => number }).toNumber()
      : Number(row.entityCount) || 0,
    prerequisiteCount: typeof row.prerequisiteCount === 'object' && 'toNumber' in row.prerequisiteCount
      ? (row.prerequisiteCount as { toNumber: () => number }).toNumber()
      : Number(row.prerequisiteCount) || 0,
    entityRelationshipCount: typeof row.entityRelationshipCount === 'object' && 'toNumber' in row.entityRelationshipCount
      ? (row.entityRelationshipCount as { toNumber: () => number }).toNumber()
      : Number(row.entityRelationshipCount) || 0,
  }
}

/**
 * Get all graph statistics (admin use)
 */
export async function getAllGraphStats(): Promise<{
  totalSkills: number
  totalEntities: number
  totalPrerequisites: number
  totalEntityRelationships: number
  orphanedSkills: number
  orphanedEntities: number
}> {
  const results = await runQuery<{
    totalSkills: number
    totalEntities: number
    totalPrerequisites: number
    totalEntityRelationships: number
    orphanedSkills: number
    orphanedEntities: number
  }>(
    `
    MATCH (s:Skill) WITH count(s) as totalSkills
    MATCH (e:Entity) WITH totalSkills, count(e) as totalEntities
    OPTIONAL MATCH ()-[p:PREREQUISITE_OF]->() WITH totalSkills, totalEntities, count(p) as totalPrerequisites
    OPTIONAL MATCH ()-[r:RELATES_TO]->() WITH totalSkills, totalEntities, totalPrerequisites, count(r) as totalEntityRelationships
    OPTIONAL MATCH (os:Skill) WHERE os.notebookId IS NULL OR os.notebookId = '' WITH totalSkills, totalEntities, totalPrerequisites, totalEntityRelationships, count(os) as orphanedSkills
    OPTIONAL MATCH (oe:Entity) WHERE oe.notebookId IS NULL OR oe.notebookId = ''
    RETURN totalSkills, totalEntities, totalPrerequisites, totalEntityRelationships, orphanedSkills, count(oe) as orphanedEntities
    `
  )

  if (results.length === 0) {
    return {
      totalSkills: 0,
      totalEntities: 0,
      totalPrerequisites: 0,
      totalEntityRelationships: 0,
      orphanedSkills: 0,
      orphanedEntities: 0,
    }
  }

  const row = results[0]
  const toNum = (val: unknown): number => {
    if (typeof val === 'object' && val !== null && 'toNumber' in val) {
      return (val as { toNumber: () => number }).toNumber()
    }
    return Number(val) || 0
  }

  return {
    totalSkills: toNum(row.totalSkills),
    totalEntities: toNum(row.totalEntities),
    totalPrerequisites: toNum(row.totalPrerequisites),
    totalEntityRelationships: toNum(row.totalEntityRelationships),
    orphanedSkills: toNum(row.orphanedSkills),
    orphanedEntities: toNum(row.orphanedEntities),
  }
}

/**
 * Search skills by name or keywords
 */
export async function searchSkills(
  notebookId: string,
  query: string,
  limit: number = 10
): Promise<SkillNode[]> {
  const result = await runQuery<{ s: Neo4JNode<SkillNode> | SkillNode }>(
    `
    MATCH (s:Skill {notebookId: $notebookId})
    WHERE toLower(s.name) CONTAINS toLower($query)
       OR ANY(keyword IN s.keywords WHERE toLower(keyword) CONTAINS toLower($query))
    RETURN s
    LIMIT $limit
    `,
    { notebookId, query, limit }
  )

  return result.map(r => extractProperties(r.s))
}

/**
 * Get skills with no prerequisites (root skills / entry points)
 */
export async function getRootSkills(notebookId: string): Promise<SkillNode[]> {
  const result = await runQuery<{ s: Neo4JNode<SkillNode> | SkillNode }>(
    `
    MATCH (s:Skill {notebookId: $notebookId})
    WHERE NOT ()-[:PREREQUISITE_OF]->(s)
    RETURN s
    ORDER BY s.bloomLevel ASC, s.difficulty ASC
    `,
    { notebookId }
  )

  return result.map(r => extractProperties(r.s))
}

/**
 * Get all prerequisite relationships for a notebook
 */
export async function getAllPrerequisites(notebookId: string): Promise<PrerequisiteRelationship[]> {
  const result = await runQuery<{
    fromId: string
    toId: string
    strength: 'required' | 'recommended' | 'helpful'
    confidenceScore: number
    reasoning?: string
    inferenceMethod?: string
  }>(
    `
    MATCH (from:Skill {notebookId: $notebookId})-[r:PREREQUISITE_OF]->(to:Skill {notebookId: $notebookId})
    RETURN from.id as fromId, to.id as toId, r.strength as strength,
           r.confidenceScore as confidenceScore, r.reasoning as reasoning,
           r.inferenceMethod as inferenceMethod
    `,
    { notebookId }
  )

  return result.map(r => ({
    fromSkillId: r.fromId,
    toSkillId: r.toId,
    strength: r.strength,
    confidenceScore: r.confidenceScore,
    reasoning: r.reasoning,
    inferenceMethod: r.inferenceMethod as PrerequisiteRelationship['inferenceMethod'],
  }))
}

/**
 * Generate a topologically sorted learning path from start to goal skill
 * Uses Kahn's algorithm for topological sort
 */
export async function generateLearningPath(
  notebookId: string,
  goalSkillId: string,
  masteredSkillIds: string[] = []
): Promise<{
  path: SkillNode[]
  totalEstimatedMinutes: number
  thresholdConcepts: SkillNode[]
}> {
  // First, get all skills that are prerequisites (direct or transitive) of the goal
  const result = await runQuery<{ s: Neo4JNode<SkillNode> | SkillNode; depth: number }>(
    `
    MATCH path = (prereq:Skill)-[:PREREQUISITE_OF*0..]->(goal:Skill {id: $goalSkillId})
    WHERE prereq.notebookId = $notebookId
    WITH prereq, length(path) as depth
    RETURN DISTINCT prereq as s, depth
    ORDER BY depth DESC
    `,
    { notebookId, goalSkillId }
  )

  const allSkills = result.map(r => extractProperties(r.s))
  const masteredSet = new Set(masteredSkillIds)

  // Filter out already mastered skills
  const remainingSkills = allSkills.filter(s => !masteredSet.has(s.id))

  // Get prerequisites among remaining skills
  const prereqs = await getAllPrerequisites(notebookId)
  const relevantSkillIds = new Set(remainingSkills.map(s => s.id))
  const relevantPrereqs = prereqs.filter(
    p => relevantSkillIds.has(p.fromSkillId) && relevantSkillIds.has(p.toSkillId)
  )

  // Build adjacency list and in-degree map for topological sort
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  for (const skill of remainingSkills) {
    inDegree.set(skill.id, 0)
    adjacency.set(skill.id, [])
  }

  for (const prereq of relevantPrereqs) {
    const current = inDegree.get(prereq.toSkillId) || 0
    inDegree.set(prereq.toSkillId, current + 1)
    const adj = adjacency.get(prereq.fromSkillId) || []
    adj.push(prereq.toSkillId)
    adjacency.set(prereq.fromSkillId, adj)
  }

  // Kahn's algorithm
  const queue: string[] = []
  for (const [skillId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(skillId)
    }
  }

  const sortedIds: string[] = []
  while (queue.length > 0) {
    // Sort queue by Bloom level and difficulty for consistent ordering
    queue.sort((a, b) => {
      const skillA = remainingSkills.find(s => s.id === a)!
      const skillB = remainingSkills.find(s => s.id === b)!
      if (skillA.bloomLevel !== skillB.bloomLevel) {
        return skillA.bloomLevel - skillB.bloomLevel
      }
      return (skillA.difficulty || 5) - (skillB.difficulty || 5)
    })

    const current = queue.shift()!
    sortedIds.push(current)

    for (const neighbor of adjacency.get(current) || []) {
      const newDegree = (inDegree.get(neighbor) || 1) - 1
      inDegree.set(neighbor, newDegree)
      if (newDegree === 0) {
        queue.push(neighbor)
      }
    }
  }

  // Build final path
  const skillMap = new Map(remainingSkills.map(s => [s.id, s]))
  const path = sortedIds.map(id => skillMap.get(id)!).filter(Boolean)

  // Calculate totals
  const totalEstimatedMinutes = path.reduce((sum, s) => sum + (s.estimatedMinutes || 30), 0)
  const thresholdConcepts = path.filter(s => s.isThresholdConcept)

  return {
    path,
    totalEstimatedMinutes,
    thresholdConcepts,
  }
}

/**
 * Get Zone of Proximal Development skills
 * These are skills where all required prerequisites are mastered
 */
export async function getZPDSkills(
  notebookId: string,
  masteredSkillIds: string[]
): Promise<{
  skill: SkillNode
  readinessScore: number
  prerequisitesMastered: string[]
  prerequisitesPending: string[]
}[]> {
  const masteredSet = new Set(masteredSkillIds)

  // Get all skills and their prerequisites
  const { skills, prerequisites } = await getSkillGraph(notebookId)

  // Build prerequisite map
  const prereqMap = new Map<string, PrerequisiteRelationship[]>()
  for (const prereq of prerequisites) {
    const existing = prereqMap.get(prereq.toSkillId) || []
    existing.push(prereq)
    prereqMap.set(prereq.toSkillId, existing)
  }

  const zpdSkills: {
    skill: SkillNode
    readinessScore: number
    prerequisitesMastered: string[]
    prerequisitesPending: string[]
  }[] = []

  for (const skill of skills) {
    // Skip already mastered skills
    if (masteredSet.has(skill.id)) continue

    const prereqs = prereqMap.get(skill.id) || []
    const requiredPrereqs = prereqs.filter(p => p.strength === 'required')
    const recommendedPrereqs = prereqs.filter(p => p.strength === 'recommended')
    const helpfulPrereqs = prereqs.filter(p => p.strength === 'helpful')

    // Calculate mastery status
    const masteredRequired = requiredPrereqs.filter(p => masteredSet.has(p.fromSkillId))
    const masteredRecommended = recommendedPrereqs.filter(p => masteredSet.has(p.fromSkillId))
    const masteredHelpful = helpfulPrereqs.filter(p => masteredSet.has(p.fromSkillId))

    // A skill is in ZPD if all required prerequisites are met
    const allRequiredMet = masteredRequired.length === requiredPrereqs.length

    if (allRequiredMet || prereqs.length === 0) {
      // Calculate readiness score
      const requiredScore = requiredPrereqs.length === 0 ? 1 : masteredRequired.length / requiredPrereqs.length
      const recommendedScore = recommendedPrereqs.length === 0 ? 1 : masteredRecommended.length / recommendedPrereqs.length
      const helpfulScore = helpfulPrereqs.length === 0 ? 1 : masteredHelpful.length / helpfulPrereqs.length

      // Weighted average: required (60%), recommended (30%), helpful (10%)
      const readinessScore = requiredScore * 0.6 + recommendedScore * 0.3 + helpfulScore * 0.1

      const prerequisitesMastered = prereqs
        .filter(p => masteredSet.has(p.fromSkillId))
        .map(p => p.fromSkillId)
      const prerequisitesPending = prereqs
        .filter(p => !masteredSet.has(p.fromSkillId))
        .map(p => p.fromSkillId)

      zpdSkills.push({
        skill,
        readinessScore,
        prerequisitesMastered,
        prerequisitesPending,
      })
    }
  }

  // Sort by readiness score descending, then by Bloom level ascending
  zpdSkills.sort((a, b) => {
    if (Math.abs(a.readinessScore - b.readinessScore) > 0.1) {
      return b.readinessScore - a.readinessScore
    }
    return a.skill.bloomLevel - b.skill.bloomLevel
  })

  return zpdSkills
}

/**
 * Get curriculum overview with learning stages
 */
export async function getCurriculumOverview(notebookId: string): Promise<{
  stages: {
    bloomLevel: number
    bloomLabel: string
    skills: SkillNode[]
    totalMinutes: number
    thresholdCount: number
  }[]
  totalSkills: number
  totalMinutes: number
  totalThresholdConcepts: number
}> {
  const skills = await getSkillsByNotebook(notebookId)

  const bloomLabels: Record<number, string> = {
    1: 'Remember',
    2: 'Understand',
    3: 'Apply',
    4: 'Analyze',
    5: 'Evaluate',
    6: 'Create',
  }

  // Group by Bloom level
  const byBloom = new Map<number, SkillNode[]>()
  for (let i = 1; i <= 6; i++) {
    byBloom.set(i, [])
  }
  for (const skill of skills) {
    const level = skill.bloomLevel || 1
    const existing = byBloom.get(level) || []
    existing.push(skill)
    byBloom.set(level, existing)
  }

  const stages = Array.from(byBloom.entries()).map(([level, levelSkills]) => ({
    bloomLevel: level,
    bloomLabel: bloomLabels[level] || 'Unknown',
    skills: levelSkills,
    totalMinutes: levelSkills.reduce((sum, s) => sum + (s.estimatedMinutes || 30), 0),
    thresholdCount: levelSkills.filter(s => s.isThresholdConcept).length,
  }))

  return {
    stages,
    totalSkills: skills.length,
    totalMinutes: skills.reduce((sum, s) => sum + (s.estimatedMinutes || 30), 0),
    totalThresholdConcepts: skills.filter(s => s.isThresholdConcept).length,
  }
}
