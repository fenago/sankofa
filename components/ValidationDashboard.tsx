'use client'

import React, { useState } from 'react'
import {
  BarChart3,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Activity,
  Cpu,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Settings,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useValidationOverview, useSkillValidation } from '@/hooks/useValidation'

interface ValidationDashboardProps {
  notebookId: string
}

export function ValidationDashboard({ notebookId }: ValidationDashboardProps) {
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const [showAllSkills, setShowAllSkills] = useState(false)
  const [isFitting, setIsFitting] = useState(false)

  const {
    hasData,
    aggregateMetrics,
    skillValidations,
    loading,
    error,
    refetch,
    fitAllSkills,
  } = useValidationOverview(notebookId)

  const handleFitAll = async () => {
    setIsFitting(true)
    await fitAllSkills()
    setIsFitting(false)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading validation data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Error: {error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            BKT Model Validation
          </CardTitle>
          <CardDescription>
            Validate and calibrate Bayesian Knowledge Tracing parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-center">
              No practice data available yet.
              <br />
              Complete some practice questions to see validation metrics.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                BKT Model Validation
              </CardTitle>
              <CardDescription>
                Performance metrics for mastery prediction accuracy
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-1"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleFitAll}
                disabled={isFitting}
                className="gap-1"
              >
                {isFitting ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Cpu className="h-3.5 w-3.5" />
                )}
                Fit Parameters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {aggregateMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* AUC Score */}
              <MetricCard
                label="AUC-ROC Score"
                value={aggregateMetrics.avgAuc}
                format="percentage"
                icon={<Target className="h-4 w-4" />}
                description="Prediction discrimination"
                quality={getAucQuality(aggregateMetrics.avgAuc)}
              />

              {/* Brier Score */}
              <MetricCard
                label="Brier Score"
                value={aggregateMetrics.avgBrierScore}
                format="decimal"
                icon={<TrendingUp className="h-4 w-4" />}
                description="Lower is better"
                quality={getBrierQuality(aggregateMetrics.avgBrierScore)}
                lowerIsBetter
              />

              {/* Validated Skills */}
              <MetricCard
                label="Validated Skills"
                value={aggregateMetrics.validatedSkills}
                format="count"
                icon={<CheckCircle2 className="h-4 w-4" />}
                description="Skills with enough data"
              />

              {/* Total Interactions */}
              <MetricCard
                label="Total Interactions"
                value={aggregateMetrics.totalInteractions}
                format="count"
                icon={<Activity className="h-4 w-4" />}
                description="Practice attempts analyzed"
              />
            </div>
          )}

          {/* Overall Quality Indicator */}
          {aggregateMetrics && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <QualityBadge quality={aggregateMetrics.overallQuality} />
                <span className="text-sm text-muted-foreground">
                  {aggregateMetrics.overallQuality === 'good'
                    ? 'Model predictions are accurate and well-calibrated'
                    : aggregateMetrics.overallQuality === 'acceptable'
                    ? 'Model predictions are reasonable but could be improved'
                    : 'Consider fitting skill-specific parameters to improve accuracy'}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skill-Level Validation */}
      {skillValidations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Per-Skill Validation</CardTitle>
                <CardDescription>
                  Metrics for individual skills
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllSkills(!showAllSkills)}
                className="gap-1"
              >
                {showAllSkills ? (
                  <>
                    Show Less <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Show All ({skillValidations.length}) <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(showAllSkills ? skillValidations : skillValidations.slice(0, 5)).map(
                (skill) => (
                  <SkillValidationRow
                    key={skill.skillId}
                    skill={skill}
                    isSelected={selectedSkillId === skill.skillId}
                    onSelect={() =>
                      setSelectedSkillId(
                        selectedSkillId === skill.skillId ? null : skill.skillId
                      )
                    }
                    notebookId={notebookId}
                  />
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Skill Detail */}
      {selectedSkillId && (
        <SkillDetailCard notebookId={notebookId} skillId={selectedSkillId} />
      )}
    </div>
  )
}

// Helper Components

function MetricCard({
  label,
  value,
  format,
  icon,
  description,
  quality,
  lowerIsBetter,
}: {
  label: string
  value: number
  format: 'percentage' | 'decimal' | 'count'
  icon: React.ReactNode
  description: string
  quality?: 'good' | 'acceptable' | 'poor'
  lowerIsBetter?: boolean
}) {
  const formatValue = () => {
    switch (format) {
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`
      case 'decimal':
        return value.toFixed(3)
      case 'count':
        return value.toLocaleString()
    }
  }

  const getColor = () => {
    if (!quality) return 'text-foreground'
    switch (quality) {
      case 'good':
        return 'text-green-600'
      case 'acceptable':
        return 'text-yellow-600'
      case 'poor':
        return 'text-red-600'
    }
  }

  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className={`text-2xl font-semibold ${getColor()}`}>{formatValue()}</div>
      <div className="text-xs text-muted-foreground mt-1">{description}</div>
    </div>
  )
}

function QualityBadge({ quality }: { quality: 'good' | 'acceptable' | 'needs_improvement' }) {
  const config = {
    good: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      label: 'Good',
      className: 'text-green-600 bg-green-100',
    },
    acceptable: {
      icon: <AlertCircle className="h-4 w-4" />,
      label: 'Acceptable',
      className: 'text-yellow-600 bg-yellow-100',
    },
    needs_improvement: {
      icon: <AlertCircle className="h-4 w-4" />,
      label: 'Needs Improvement',
      className: 'text-red-600 bg-red-100',
    },
  }

  const { icon, label, className } = config[quality]

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {icon}
      {label}
    </span>
  )
}

interface SkillValidation {
  skillId: string
  skillName?: string
  metrics: {
    auc: number
    brierScore: number
    accuracy: number
  }
  params: {
    pL0: number
    pT: number
    pS: number
    pG: number
  }
  fitQuality: string
  sampleSize: number
}

function SkillValidationRow({
  skill,
  isSelected,
  onSelect,
  notebookId,
}: {
  skill: SkillValidation
  isSelected: boolean
  onSelect: () => void
  notebookId: string
}) {
  const aucQuality = getAucQuality(skill.metrics.auc)

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
        isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${
              aucQuality === 'good'
                ? 'bg-green-500'
                : aucQuality === 'acceptable'
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
          />
          <div>
            <div className="font-medium text-sm truncate max-w-[200px]">
              {skill.skillName || skill.skillId}
            </div>
            <div className="text-xs text-muted-foreground">
              {skill.sampleSize} attempts | {skill.fitQuality}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">AUC</div>
            <div className={getAucQuality(skill.metrics.auc) === 'good' ? 'text-green-600' : ''}>
              {(skill.metrics.auc * 100).toFixed(1)}%
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Accuracy</div>
            <div>{(skill.metrics.accuracy * 100).toFixed(1)}%</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SkillDetailCard({
  notebookId,
  skillId,
}: {
  notebookId: string
  skillId: string
}) {
  const { hasData, metrics, params, masteryEstimate, sampleSize, loading, fitSkill } =
    useSkillValidation(notebookId, skillId)
  const [isFitting, setIsFitting] = useState(false)

  const handleFit = async () => {
    setIsFitting(true)
    await fitSkill()
    setIsFitting(false)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading skill details...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!hasData || !metrics || !params) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Skill: {skillId}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFit}
            disabled={isFitting}
            className="gap-1"
          >
            {isFitting ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Settings className="h-3.5 w-3.5" />
            )}
            Fit Parameters
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Metrics */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Validation Metrics</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">AUC-ROC:</span>
                <span>{(metrics.auc * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Brier Score:</span>
                <span>{metrics.brierScore.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Accuracy:</span>
                <span>{(metrics.accuracy * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Log Loss:</span>
                <span>{metrics.logLoss.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sample Size:</span>
                <span>{sampleSize}</span>
              </div>
            </div>
          </div>

          {/* Parameters */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">BKT Parameters</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">P(L0) Initial:</span>
                <span>{params.pL0.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">P(T) Learning:</span>
                <span>{params.pT.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">P(S) Slip:</span>
                <span>{params.pS.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">P(G) Guess:</span>
                <span>{params.pG.toFixed(3)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mastery Estimate with Confidence Interval */}
        {masteryEstimate && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50">
            <h4 className="text-sm font-medium mb-2">Current Mastery Estimate</h4>
            <div className="flex items-center gap-4">
              <div className="text-2xl font-semibold">
                {(masteryEstimate.pMastery * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">
                {(masteryEstimate.confidenceInterval.level * 100).toFixed(0)}% CI: [
                {(masteryEstimate.confidenceInterval.lower * 100).toFixed(1)}%,{' '}
                {(masteryEstimate.confidenceInterval.upper * 100).toFixed(1)}%]
              </div>
            </div>
            {/* Visual confidence interval */}
            <div className="mt-2 relative h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="absolute h-full bg-primary/30"
                style={{
                  left: `${masteryEstimate.confidenceInterval.lower * 100}%`,
                  width: `${
                    (masteryEstimate.confidenceInterval.upper -
                      masteryEstimate.confidenceInterval.lower) *
                    100
                  }%`,
                }}
              />
              <div
                className="absolute h-full w-1 bg-primary"
                style={{ left: `${masteryEstimate.pMastery * 100}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Utility functions
function getAucQuality(auc: number): 'good' | 'acceptable' | 'poor' {
  if (auc >= 0.7) return 'good'
  if (auc >= 0.6) return 'acceptable'
  return 'poor'
}

function getBrierQuality(brier: number): 'good' | 'acceptable' | 'poor' {
  if (brier <= 0.2) return 'good'
  if (brier <= 0.3) return 'acceptable'
  return 'poor'
}
