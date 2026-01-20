'use client'

import React, { useState } from 'react'
import { Settings2, Brain, Activity, BarChart3, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useNotebookSettings } from '@/hooks/useNotebookSettings'

interface LearnerSettingsPanelProps {
  notebookId: string
  compact?: boolean
}

export function LearnerSettingsPanel({ notebookId, compact = false }: LearnerSettingsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const {
    settings,
    isLoading,
    isInverseProfilingActive,
    toggleInverseProfiling,
    toggleSessionTracking,
    toggleInteractionLogging,
    updateBKTParameters,
  } = useNotebookSettings(notebookId)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Settings2 className="h-4 w-4 animate-pulse" />
        <span>Loading settings...</span>
      </div>
    )
  }

  // Compact view - just a toggle button
  if (compact && !isExpanded) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className={`gap-2 ${isInverseProfilingActive ? 'text-green-600' : 'text-muted-foreground'}`}
      >
        <Brain className="h-4 w-4" />
        <span className="hidden sm:inline">
          {isInverseProfilingActive ? 'Profiling On' : 'Profiling Off'}
        </span>
      </Button>
    )
  }

  return (
    <Card className={compact ? 'absolute right-0 top-full mt-2 z-50 w-80 shadow-lg' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Learner Analytics</CardTitle>
          </div>
          {compact && (
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
              <ChevronUp className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          Configure how this notebook tracks and analyzes your learning
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Inverse Profiling Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Label htmlFor="inverse-profiling" className="font-medium">
                Inverse Profiling
              </Label>
              <div className="group relative">
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-2 text-xs bg-popover border rounded-md shadow-md z-10">
                  Automatically infers your learning characteristics (knowledge state,
                  cognitive patterns, motivation) from your behavior, rather than asking you directly.
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Infer learner characteristics from behavior
            </p>
          </div>
          <Switch
            id="inverse-profiling"
            checked={settings.inverse_profiling_enabled}
            onCheckedChange={toggleInverseProfiling}
          />
        </div>

        {/* Sub-toggles (only show when inverse profiling is on) */}
        {settings.inverse_profiling_enabled && (
          <div className="ml-4 space-y-3 border-l-2 pl-4">
            {/* Session Tracking */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label htmlFor="session-tracking" className="text-sm">
                    Session Tracking
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Track learning session duration & activity
                </p>
              </div>
              <Switch
                id="session-tracking"
                checked={settings.session_tracking_enabled}
                onCheckedChange={toggleSessionTracking}
              />
            </div>

            {/* Interaction Logging */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label htmlFor="interaction-logging" className="text-sm">
                    Interaction Logging
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Record practice attempts, hints, navigation
                </p>
              </div>
              <Switch
                id="interaction-logging"
                checked={settings.interaction_logging_enabled}
                onCheckedChange={toggleInteractionLogging}
              />
            </div>
          </div>
        )}

        {/* Advanced BKT Settings */}
        {settings.inverse_profiling_enabled && (
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full justify-between text-muted-foreground"
            >
              <span className="text-xs">Advanced BKT Parameters</span>
              {showAdvanced ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>

            {showAdvanced && (
              <div className="mt-3 space-y-3 text-sm">
                {/* Use skill-specific parameters */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-normal">Use skill-specific parameters</Label>
                    <p className="text-xs text-muted-foreground">
                      Fit BKT parameters per skill (vs. global)
                    </p>
                  </div>
                  <Switch
                    checked={settings.bkt_parameters.use_skill_specific}
                    onCheckedChange={(v) => updateBKTParameters({ use_skill_specific: v })}
                  />
                </div>

                {/* Parameter sliders (when not using skill-specific) */}
                {!settings.bkt_parameters.use_skill_specific && (
                  <div className="space-y-2 pt-2 border-t">
                    <BKTParameterSlider
                      label="P(L0) - Initial Knowledge"
                      description="Probability of already knowing a skill"
                      value={settings.bkt_parameters.default_pL0}
                      onChange={(v) => updateBKTParameters({ default_pL0: v })}
                    />
                    <BKTParameterSlider
                      label="P(T) - Learning Rate"
                      description="Probability of learning from each attempt"
                      value={settings.bkt_parameters.default_pT}
                      onChange={(v) => updateBKTParameters({ default_pT: v })}
                    />
                    <BKTParameterSlider
                      label="P(S) - Slip Rate"
                      description="Probability of error when knowing"
                      value={settings.bkt_parameters.default_pS}
                      onChange={(v) => updateBKTParameters({ default_pS: v })}
                    />
                    <BKTParameterSlider
                      label="P(G) - Guess Rate"
                      description="Probability of correct guess when not knowing"
                      value={settings.bkt_parameters.default_pG}
                      onChange={(v) => updateBKTParameters({ default_pG: v })}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Status indicator */}
        <div className="pt-2 border-t">
          <div className={`flex items-center gap-2 text-xs ${
            isInverseProfilingActive ? 'text-green-600' : 'text-muted-foreground'
          }`}>
            <div className={`h-2 w-2 rounded-full ${
              isInverseProfilingActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
            }`} />
            {isInverseProfilingActive
              ? 'Learner profiling is active for this notebook'
              : 'Learner profiling is disabled'}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Helper component for BKT parameter sliders
function BKTParameterSlider({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-normal">{label}</Label>
        <span className="text-xs text-muted-foreground font-mono">
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
      />
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}
