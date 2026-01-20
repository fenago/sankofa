'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/swr-config'
import { notebookKeys } from './useNotebooks'

export interface GraphSkill {
  id: string
  name: string
  description?: string
  notebookId: string
  sourceDocumentId?: string
  level?: number
}

export interface GraphEntity {
  id: string
  name: string
  type: string
  description?: string
  notebookId: string
  sourceDocumentId?: string
}

export interface GraphRelationship {
  source: string
  target: string
  type: string
}

export interface GraphData {
  skills: GraphSkill[]
  entities: GraphEntity[]
  prerequisites: GraphRelationship[]
  entityRelationships: GraphRelationship[]
}

export interface LearningPathOverview {
  skills: Array<{
    id: string
    name: string
    description?: string
    level?: number
    prerequisiteCount: number
    dependentCount: number
  }>
  totalSkills: number
  rootSkills: string[]
  leafSkills: string[]
}

// Stable empty arrays to prevent infinite re-renders
const EMPTY_SKILLS: GraphSkill[] = []
const EMPTY_ENTITIES: GraphEntity[] = []
const EMPTY_RELATIONSHIPS: GraphRelationship[] = []

// Hook for graph data (skills, entities, relationships)
export function useGraph(notebookId: string | null) {
  const { data, error, isLoading, mutate: revalidate } = useSWR<GraphData>(
    notebookId ? notebookKeys.graph(notebookId) : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }
  )

  // Memoize return values to prevent unnecessary re-renders
  const skills = useMemo(() => data?.skills ?? EMPTY_SKILLS, [data?.skills])
  const entities = useMemo(() => data?.entities ?? EMPTY_ENTITIES, [data?.entities])
  const prerequisites = useMemo(() => data?.prerequisites ?? EMPTY_RELATIONSHIPS, [data?.prerequisites])
  const entityRelationships = useMemo(() => data?.entityRelationships ?? EMPTY_RELATIONSHIPS, [data?.entityRelationships])

  return {
    skills,
    entities,
    prerequisites,
    entityRelationships,
    loading: isLoading,
    error: error?.message ?? null,
    refetch: revalidate,
  }
}

// Stable empty arrays for learning path
const EMPTY_LP_SKILLS: LearningPathOverview['skills'] = []
const EMPTY_STRINGS: string[] = []
const EMPTY_ARTIFACTS: any[] = []

// Hook for learning path overview
export function useLearningPath(notebookId: string | null, action: string = 'overview') {
  const { data, error, isLoading, mutate: revalidate } = useSWR<LearningPathOverview>(
    notebookId ? notebookKeys.learningPath(notebookId, action) : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }
  )

  const skills = useMemo(() => data?.skills ?? EMPTY_LP_SKILLS, [data?.skills])
  const rootSkills = useMemo(() => data?.rootSkills ?? EMPTY_STRINGS, [data?.rootSkills])
  const leafSkills = useMemo(() => data?.leafSkills ?? EMPTY_STRINGS, [data?.leafSkills])

  return {
    data,
    skills,
    totalSkills: data?.totalSkills ?? 0,
    rootSkills,
    leafSkills,
    loading: isLoading,
    error: error?.message ?? null,
    refetch: revalidate,
  }
}

// Hook for artifacts library
export function useArtifacts(notebookId: string | null, audience?: string) {
  const { data, error, isLoading, mutate: revalidate } = useSWR<{ artifacts: any[] }>(
    notebookId ? notebookKeys.artifacts(notebookId, audience) : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 2000,
    }
  )

  const artifacts = useMemo(() => data?.artifacts ?? EMPTY_ARTIFACTS, [data?.artifacts])

  return {
    artifacts,
    loading: isLoading,
    error: error?.message ?? null,
    refetch: revalidate,
  }
}
