'use client'

import useSWR from 'swr'
import type { SkillNode, LearnerSkillState, PrerequisiteRelationship } from '@/lib/types/graph'

interface PrerequisiteWithState {
  skill: SkillNode
  relationship: PrerequisiteRelationship
  learnerState: LearnerSkillState | null
}

interface SkillDetailsResponse {
  available: boolean
  skill: SkillNode
  learnerState: LearnerSkillState | null
  prerequisites: PrerequisiteWithState[]
  dependents: PrerequisiteWithState[]
  readiness: {
    ready: boolean
    score: number
    requiredCount: number
    masteredCount: number
  }
}

const fetcher = async (url: string): Promise<SkillDetailsResponse> => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export function useSkillDetails(notebookId: string, skillId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<SkillDetailsResponse>(
    skillId ? `/api/notebooks/${notebookId}/skills/${skillId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  )

  return {
    skill: data?.skill || null,
    learnerState: data?.learnerState || null,
    prerequisites: data?.prerequisites || [],
    dependents: data?.dependents || [],
    readiness: data?.readiness || { ready: false, score: 0, requiredCount: 0, masteredCount: 0 },
    available: data?.available ?? false,
    isLoading,
    error,
    mutate,
  }
}
