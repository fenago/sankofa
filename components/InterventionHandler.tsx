'use client'

import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Brain,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  Target,
  Coffee,
  Flame,
  Rocket,
  Heart,
} from 'lucide-react'
import type { ActiveIntervention } from '@/hooks/useAdaptiveLearning'

interface InterventionHandlerProps {
  interventions: ActiveIntervention[]
  onDismiss: (dismissKey: string) => void
  onAction?: (triggerId: string, action: string) => void
}

export function InterventionHandler({
  interventions,
  onDismiss,
  onAction,
}: InterventionHandlerProps) {
  const { toast } = useToast()
  const [shownToasts, setShownToasts] = useState<Set<string>>(new Set())
  const [dialogIntervention, setDialogIntervention] = useState<ActiveIntervention | null>(null)

  // Get icon for intervention
  const getInterventionIcon = useCallback((triggerId: string) => {
    const icons: Record<string, React.ReactNode> = {
      overconfidence_high: <AlertTriangle className="h-5 w-5" />,
      underconfidence_high: <Heart className="h-5 w-5" />,
      help_avoidant_struggling: <Lightbulb className="h-5 w-5" />,
      help_excessive: <Sparkles className="h-5 w-5" />,
      low_persistence_failure: <Target className="h-5 w-5" />,
      success_streak: <Flame className="h-5 w-5" />,
      long_session: <Coffee className="h-5 w-5" />,
      mastery_all_easy: <Rocket className="h-5 w-5" />,
      extended_struggle: <Brain className="h-5 w-5" />,
    }
    return icons[triggerId] ?? <Lightbulb className="h-5 w-5" />
  }, [])

  // Handle showing interventions
  useEffect(() => {
    for (const intervention of interventions) {
      // Skip already shown
      if (shownToasts.has(intervention.dismissKey)) continue

      // High priority interventions get a dialog
      if (intervention.priority === 'high') {
        setDialogIntervention(intervention)
        setShownToasts((prev) => new Set([...prev, intervention.dismissKey]))
        break // Only show one dialog at a time
      }

      // Medium/low priority get a toast
      const toastVariant = intervention.dimension === 'metacognitive' ? 'default' : 'default'
      const icon = getInterventionIcon(intervention.triggerId)

      toast({
        title: intervention.emoji
          ? `${intervention.emoji} ${intervention.triggerName}`
          : intervention.triggerName,
        description: intervention.message,
        duration: intervention.priority === 'medium' ? 8000 : 5000,
        action: intervention.actionLabel ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onAction?.(intervention.triggerId, intervention.actionLabel!)
              onDismiss(intervention.dismissKey)
            }}
          >
            {intervention.actionLabel}
          </Button>
        ) : undefined,
      })

      setShownToasts((prev) => new Set([...prev, intervention.dismissKey]))
    }
  }, [interventions, shownToasts, toast, onDismiss, onAction, getInterventionIcon])

  // Handle dialog dismiss
  const handleDialogDismiss = useCallback(() => {
    if (dialogIntervention) {
      onDismiss(dialogIntervention.dismissKey)
      setDialogIntervention(null)
    }
  }, [dialogIntervention, onDismiss])

  // Handle dialog action
  const handleDialogAction = useCallback(() => {
    if (dialogIntervention) {
      onAction?.(dialogIntervention.triggerId, dialogIntervention.actionLabel ?? 'action')
      onDismiss(dialogIntervention.dismissKey)
      setDialogIntervention(null)
    }
  }, [dialogIntervention, onAction, onDismiss])

  return (
    <Dialog open={!!dialogIntervention} onOpenChange={(open) => !open && handleDialogDismiss()}>
      {dialogIntervention && (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogIntervention.emoji && (
                <span className="text-2xl">{dialogIntervention.emoji}</span>
              )}
              {!dialogIntervention.emoji && getInterventionIcon(dialogIntervention.triggerId)}
              <span>{dialogIntervention.triggerName}</span>
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              {dialogIntervention.message}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <Button variant="outline" onClick={handleDialogDismiss}>
              Dismiss
            </Button>
            {dialogIntervention.actionLabel && (
              <Button onClick={handleDialogAction}>
                {dialogIntervention.actionLabel}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  )
}

/**
 * Minimal toast-only handler for less intrusive interventions
 */
export function InterventionToastHandler({
  interventions,
  onDismiss,
  onAction,
}: InterventionHandlerProps) {
  const { toast } = useToast()
  const [shownToasts, setShownToasts] = useState<Set<string>>(new Set())

  useEffect(() => {
    for (const intervention of interventions) {
      if (shownToasts.has(intervention.dismissKey)) continue

      toast({
        title: intervention.emoji
          ? `${intervention.emoji} ${intervention.triggerName}`
          : intervention.triggerName,
        description: intervention.message,
        duration: intervention.priority === 'high' ? 10000 : 5000,
        action: intervention.actionLabel ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onAction?.(intervention.triggerId, intervention.actionLabel!)
              onDismiss(intervention.dismissKey)
            }}
          >
            {intervention.actionLabel}
          </Button>
        ) : undefined,
      })

      setShownToasts((prev) => new Set([...prev, intervention.dismissKey]))
    }
  }, [interventions, shownToasts, toast, onDismiss, onAction])

  return null
}
