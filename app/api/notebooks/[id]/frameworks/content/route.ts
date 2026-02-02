/**
 * Content Framework Stats API
 *
 * Provides aggregated educational psychology metadata from extracted skills.
 * This shows WHAT was extracted from the content (not learner progress).
 *
 * GET /api/notebooks/[id]/frameworks/content
 * Returns: ContentFrameworkStats with all framework metadata distributions
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isNeo4JAvailable, getSession } from '@/lib/graph/neo4j'
import type { BloomLevel, FinkDimension } from '@/lib/types/graph'

interface RouteParams {
  params: Promise<{ id: string }>
}

export interface ContentFrameworkStats {
  totalSkills: number

  bloom: {
    distribution: Record<number, number>
    percentages: Record<number, number>
  }

  fink: {
    distribution: Record<string, number>
    percentages: Record<string, number>
    skillsWithMultipleDimensions: number
  }

  irt: {
    difficultyDistribution: { easy: number; medium: number; hard: number }
    avgDifficulty: number
    avgDiscrimination: number
    avgGuessing: number
    skillsWithIRT: number
  }

  cognitiveLoad: {
    distribution: { low: number; medium: number; high: number }
    avgChunksRequired: number
    elementInteractivity: { low: number; medium: number; high: number }
  }

  threshold: {
    count: number
    percentage: number
    domainsUnlocked: string[]
    troublesomeAspects: number
  }

  scaffolding: {
    skillsWithScaffolding: number
    percentage: number
  }

  assessment: {
    totalMisconceptions: number
    suggestedAssessments: { formative: number; summative: number; other: number }
    transferDomains: number
  }

  spaced: {
    skillsWithIntervals: number
    avgReviewIntervals: number[]
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: notebookId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify notebook exists
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('id')
      .eq('id', notebookId)
      .single()

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
    }

    // Initialize stats with defaults
    const stats: ContentFrameworkStats = {
      totalSkills: 0,
      bloom: {
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
        percentages: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      },
      fink: {
        distribution: {
          foundational_knowledge: 0,
          application: 0,
          integration: 0,
          human_dimension: 0,
          caring: 0,
          learning_how_to_learn: 0,
        },
        percentages: {
          foundational_knowledge: 0,
          application: 0,
          integration: 0,
          human_dimension: 0,
          caring: 0,
          learning_how_to_learn: 0,
        },
        skillsWithMultipleDimensions: 0,
      },
      irt: {
        difficultyDistribution: { easy: 0, medium: 0, hard: 0 },
        avgDifficulty: 0,
        avgDiscrimination: 0,
        avgGuessing: 0,
        skillsWithIRT: 0,
      },
      cognitiveLoad: {
        distribution: { low: 0, medium: 0, high: 0 },
        avgChunksRequired: 0,
        elementInteractivity: { low: 0, medium: 0, high: 0 },
      },
      threshold: {
        count: 0,
        percentage: 0,
        domainsUnlocked: [],
        troublesomeAspects: 0,
      },
      scaffolding: {
        skillsWithScaffolding: 0,
        percentage: 0,
      },
      assessment: {
        totalMisconceptions: 0,
        suggestedAssessments: { formative: 0, summative: 0, other: 0 },
        transferDomains: 0,
      },
      spaced: {
        skillsWithIntervals: 0,
        avgReviewIntervals: [],
      },
    }

    // Fetch data from Neo4J if available
    if (isNeo4JAvailable()) {
      try {
        const session = getSession()
        if (!session) {
          throw new Error('Failed to get Neo4J session')
        }

        // Get all skills with their metadata
        const skillsResult = await session.run(
          `MATCH (s:Skill {notebookId: $notebookId})
           RETURN
             s.id AS id,
             s.bloomLevel AS bloomLevel,
             s.finkDimensions AS finkDimensions,
             s.irtDifficulty AS irtDifficulty,
             s.irtDiscrimination AS irtDiscrimination,
             s.irtGuessing AS irtGuessing,
             s.cognitiveLoadEstimate AS cognitiveLoad,
             s.chunksRequired AS chunksRequired,
             s.elementInteractivity AS elementInteractivity,
             s.isThresholdConcept AS isThreshold,
             s.thresholdProperties AS thresholdProperties,
             s.scaffoldingLevels AS scaffoldingLevels,
             s.commonMisconceptions AS commonMisconceptions,
             s.suggestedAssessments AS suggestedAssessments,
             s.transferDomains AS transferDomains,
             s.reviewIntervals AS reviewIntervals`,
          { notebookId }
        )

        const allSkills = skillsResult.records.map(r => ({
          id: r.get('id') as string,
          bloomLevel: r.get('bloomLevel') as number | null,
          finkDimensions: (r.get('finkDimensions') as string[] | null) ?? [],
          irtDifficulty: r.get('irtDifficulty') as number | null,
          irtDiscrimination: r.get('irtDiscrimination') as number | null,
          irtGuessing: r.get('irtGuessing') as number | null,
          cognitiveLoad: r.get('cognitiveLoad') as string | null,
          chunksRequired: r.get('chunksRequired') as number | null,
          elementInteractivity: r.get('elementInteractivity') as string | null,
          isThreshold: r.get('isThreshold') as boolean | null,
          thresholdProperties: r.get('thresholdProperties') as string | null,
          scaffoldingLevels: r.get('scaffoldingLevels') as string | null,
          commonMisconceptions: (r.get('commonMisconceptions') as string[] | null) ?? [],
          suggestedAssessments: r.get('suggestedAssessments') as string | null,
          transferDomains: (r.get('transferDomains') as string[] | null) ?? [],
          reviewIntervals: (r.get('reviewIntervals') as number[] | null) ?? [],
        }))

        stats.totalSkills = allSkills.length

        if (stats.totalSkills === 0) {
          await session.close()
          return NextResponse.json({
            success: true,
            stats,
            hasContent: false,
          })
        }

        // Aggregation variables
        let totalIrtDifficulty = 0
        let totalIrtDiscrimination = 0
        let totalIrtGuessing = 0
        let irtCount = 0
        let totalChunks = 0
        let chunksCount = 0
        const domainsSet = new Set<string>()
        let troublesomeCount = 0
        const allIntervals: number[][] = []

        // Process each skill
        for (const skill of allSkills) {
          // Bloom's distribution
          if (skill.bloomLevel && skill.bloomLevel >= 1 && skill.bloomLevel <= 6) {
            stats.bloom.distribution[skill.bloomLevel]++
          }

          // Fink's distribution (skill can belong to multiple dimensions)
          if (skill.finkDimensions && skill.finkDimensions.length > 0) {
            for (const dim of skill.finkDimensions) {
              if (dim in stats.fink.distribution) {
                stats.fink.distribution[dim]++
              }
            }
            if (skill.finkDimensions.length > 1) {
              stats.fink.skillsWithMultipleDimensions++
            }
          }

          // IRT parameters
          if (skill.irtDifficulty !== null) {
            irtCount++
            totalIrtDifficulty += skill.irtDifficulty
            totalIrtDiscrimination += skill.irtDiscrimination ?? 1
            totalIrtGuessing += skill.irtGuessing ?? 0.2

            // Difficulty distribution (-3 to -1 = easy, -1 to 1 = medium, 1 to 3 = hard)
            if (skill.irtDifficulty < -1) {
              stats.irt.difficultyDistribution.easy++
            } else if (skill.irtDifficulty <= 1) {
              stats.irt.difficultyDistribution.medium++
            } else {
              stats.irt.difficultyDistribution.hard++
            }
          }

          // Cognitive load
          if (skill.cognitiveLoad) {
            const load = skill.cognitiveLoad.toLowerCase()
            if (load === 'low') stats.cognitiveLoad.distribution.low++
            else if (load === 'medium') stats.cognitiveLoad.distribution.medium++
            else if (load === 'high') stats.cognitiveLoad.distribution.high++
          }

          if (skill.chunksRequired) {
            totalChunks += skill.chunksRequired
            chunksCount++
          }

          if (skill.elementInteractivity) {
            const ei = skill.elementInteractivity.toLowerCase()
            if (ei === 'low') stats.cognitiveLoad.elementInteractivity.low++
            else if (ei === 'medium') stats.cognitiveLoad.elementInteractivity.medium++
            else if (ei === 'high') stats.cognitiveLoad.elementInteractivity.high++
          }

          // Threshold concepts
          if (skill.isThreshold) {
            stats.threshold.count++

            // Parse threshold properties if stored as JSON
            if (skill.thresholdProperties) {
              try {
                const props = typeof skill.thresholdProperties === 'string'
                  ? JSON.parse(skill.thresholdProperties)
                  : skill.thresholdProperties
                if (props.unlocksDomains) {
                  for (const domain of props.unlocksDomains) {
                    domainsSet.add(domain)
                  }
                }
                if (props.troublesomeAspects) {
                  troublesomeCount += props.troublesomeAspects.length
                }
              } catch {
                // Ignore parse errors
              }
            }
          }

          // Scaffolding
          if (skill.scaffoldingLevels) {
            stats.scaffolding.skillsWithScaffolding++
          }

          // Misconceptions
          if (skill.commonMisconceptions && skill.commonMisconceptions.length > 0) {
            stats.assessment.totalMisconceptions += skill.commonMisconceptions.length
          }

          // Suggested assessments
          if (skill.suggestedAssessments) {
            try {
              const assessments = typeof skill.suggestedAssessments === 'string'
                ? JSON.parse(skill.suggestedAssessments)
                : skill.suggestedAssessments
              if (Array.isArray(assessments)) {
                for (const a of assessments) {
                  if (a.type === 'formative') stats.assessment.suggestedAssessments.formative++
                  else if (a.type === 'summative') stats.assessment.suggestedAssessments.summative++
                  else stats.assessment.suggestedAssessments.other++
                }
              }
            } catch {
              // Ignore parse errors
            }
          }

          // Transfer domains
          if (skill.transferDomains && skill.transferDomains.length > 0) {
            stats.assessment.transferDomains += skill.transferDomains.length
          }

          // Review intervals
          if (skill.reviewIntervals && skill.reviewIntervals.length > 0) {
            stats.spaced.skillsWithIntervals++
            allIntervals.push(skill.reviewIntervals)
          }
        }

        // Calculate percentages and averages
        const total = stats.totalSkills

        // Bloom percentages
        for (let level = 1; level <= 6; level++) {
          stats.bloom.percentages[level] = Math.round((stats.bloom.distribution[level] / total) * 100)
        }

        // Fink percentages (can exceed 100% since skills belong to multiple dimensions)
        const finkDimensions = Object.keys(stats.fink.distribution) as FinkDimension[]
        for (const dim of finkDimensions) {
          stats.fink.percentages[dim] = Math.round((stats.fink.distribution[dim] / total) * 100)
        }

        // IRT averages
        if (irtCount > 0) {
          stats.irt.avgDifficulty = Math.round((totalIrtDifficulty / irtCount) * 100) / 100
          stats.irt.avgDiscrimination = Math.round((totalIrtDiscrimination / irtCount) * 100) / 100
          stats.irt.avgGuessing = Math.round((totalIrtGuessing / irtCount) * 100) / 100
          stats.irt.skillsWithIRT = irtCount
        }

        // Cognitive load average
        if (chunksCount > 0) {
          stats.cognitiveLoad.avgChunksRequired = Math.round((totalChunks / chunksCount) * 10) / 10
        }

        // Threshold percentage and domains
        stats.threshold.percentage = Math.round((stats.threshold.count / total) * 100)
        stats.threshold.domainsUnlocked = Array.from(domainsSet)
        stats.threshold.troublesomeAspects = troublesomeCount

        // Scaffolding percentage
        stats.scaffolding.percentage = Math.round((stats.scaffolding.skillsWithScaffolding / total) * 100)

        // Average review intervals
        if (allIntervals.length > 0) {
          const maxLen = Math.max(...allIntervals.map(arr => arr.length))
          const avgIntervals: number[] = []
          for (let i = 0; i < maxLen; i++) {
            const values = allIntervals.filter(arr => arr[i] !== undefined).map(arr => arr[i])
            if (values.length > 0) {
              avgIntervals.push(Math.round(values.reduce((a, b) => a + b, 0) / values.length))
            }
          }
          stats.spaced.avgReviewIntervals = avgIntervals
        }

        await session.close()
      } catch (neo4jError) {
        console.error('Error fetching Neo4J data:', neo4jError)
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      hasContent: stats.totalSkills > 0,
    })
  } catch (error) {
    console.error('Error fetching content framework stats:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
