'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Shuffle, HelpCircle, TrendingUp } from 'lucide-react'

interface InterleavedModeToggleProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  skillCount: number
  estimatedBoost?: number
  disabled?: boolean
}

export function InterleavedModeToggle({
  enabled,
  onToggle,
  skillCount,
  estimatedBoost,
  disabled = false,
}: InterleavedModeToggleProps) {
  const [showDetails, setShowDetails] = useState(false)

  const canInterleave = skillCount >= 2

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shuffle className={`h-4 w-4 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />
          <Label htmlFor="interleave-mode" className="font-medium">
            Interleaved Practice
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5">
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-sm">
                  <strong>Interleaving</strong> mixes different skills in your practice session
                  instead of practicing one skill at a time. Research shows this improves
                  long-term retention by 20-30%.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Switch
          id="interleave-mode"
          checked={enabled}
          onCheckedChange={onToggle}
          disabled={disabled || !canInterleave}
        />
      </div>

      {!canInterleave && (
        <p className="text-xs text-muted-foreground">
          Select at least 2 skills to enable interleaved practice
        </p>
      )}

      {enabled && canInterleave && (
        <div className="bg-primary/5 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-green-700 font-medium">
              Estimated retention boost: +{((estimatedBoost || 0.25) * 100).toFixed(0)}%
            </span>
          </div>

          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide' : 'Show'} research details
          </Button>

          {showDetails && (
            <div className="text-xs text-muted-foreground space-y-2 pt-2 border-t">
              <p>
                <strong>Bjork & Bjork (2011)</strong> found interleaving produces
                effect sizes of d=0.5-0.8, meaning substantial improvements in
                transfer and long-term retention.
              </p>
              <p>
                While it may feel harder during practice, this "desirable difficulty"
                strengthens memory retrieval pathways.
              </p>
              <p className="italic">
                "If you want to forget quickly, block your practice.
                If you want to remember, interleave it."
              </p>
            </div>
          )}
        </div>
      )}

      {enabled && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex -space-x-1">
            {Array.from({ length: Math.min(skillCount, 4) }).map((_, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full border-2 border-background"
                style={{
                  backgroundColor: `hsl(${(i * 360) / skillCount}, 70%, 60%)`,
                }}
              />
            ))}
            {skillCount > 4 && (
              <div className="w-4 h-4 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[8px]">
                +{skillCount - 4}
              </div>
            )}
          </div>
          <span>Mixing {skillCount} skills</span>
        </div>
      )}
    </div>
  )
}

export default InterleavedModeToggle
