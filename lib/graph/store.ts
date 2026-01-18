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
            s.isThresholdConcept = $isThresholdConcept,
            s.cognitiveLoadEstimate = $cognitiveLoadEstimate,
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
          isThresholdConcept: skill.isThresholdConcept,
          cognitiveLoadEstimate: skill.cognitiveLoadEstimate || null,
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
