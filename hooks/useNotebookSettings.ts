'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import { fetcher } from '@/lib/swr-config'
import type { NotebookSettings, BKTParameters } from '@/lib/types/database'
import { DEFAULT_NOTEBOOK_SETTINGS } from '@/lib/types/database'

// SWR key for notebook settings
export const settingsKey = (notebookId: string) =>
  `/api/notebooks/${notebookId}/settings` as const

interface NotebookSettingsResponse {
  settings: NotebookSettings
}

interface UpdateSettingsResponse {
  success: boolean
  settings: NotebookSettings
}

export function useNotebookSettings(notebookId: string) {
  const { data, error, isLoading, mutate } = useSWR<NotebookSettingsResponse>(
    notebookId ? settingsKey(notebookId) : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  // Get current settings with defaults
  const settings: NotebookSettings = data?.settings || DEFAULT_NOTEBOOK_SETTINGS

  // Update settings
  const updateSettings = useCallback(async (
    updates: Partial<NotebookSettings>
  ): Promise<NotebookSettings | null> => {
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updates }),
      })

      const responseData: UpdateSettingsResponse = await res.json()

      if (!res.ok) {
        throw new Error((responseData as unknown as { error: string }).error || 'Failed to update settings')
      }

      // Update cache
      mutate({ settings: responseData.settings }, false)

      return responseData.settings
    } catch (e) {
      console.error('Failed to update settings:', e)
      return null
    }
  }, [notebookId, mutate])

  // Toggle inverse profiling
  const toggleInverseProfiling = useCallback(async () => {
    const newValue = !settings.inverse_profiling_enabled
    return updateSettings({ inverse_profiling_enabled: newValue })
  }, [settings.inverse_profiling_enabled, updateSettings])

  // Toggle session tracking
  const toggleSessionTracking = useCallback(async () => {
    const newValue = !settings.session_tracking_enabled
    return updateSettings({ session_tracking_enabled: newValue })
  }, [settings.session_tracking_enabled, updateSettings])

  // Toggle interaction logging
  const toggleInteractionLogging = useCallback(async () => {
    const newValue = !settings.interaction_logging_enabled
    return updateSettings({ interaction_logging_enabled: newValue })
  }, [settings.interaction_logging_enabled, updateSettings])

  // Update BKT parameters
  const updateBKTParameters = useCallback(async (
    params: Partial<BKTParameters>
  ): Promise<NotebookSettings | null> => {
    const updatedParams: BKTParameters = {
      ...settings.bkt_parameters,
      ...params,
    }
    return updateSettings({ bkt_parameters: updatedParams })
  }, [settings.bkt_parameters, updateSettings])

  // Check if any tracking is enabled
  const isTrackingEnabled = settings.session_tracking_enabled || settings.interaction_logging_enabled

  // Check if full inverse profiling is active
  const isInverseProfilingActive = settings.inverse_profiling_enabled && isTrackingEnabled

  return {
    settings,
    isLoading,
    error: error?.message ?? null,

    // Derived states
    isTrackingEnabled,
    isInverseProfilingActive,

    // Actions
    updateSettings,
    toggleInverseProfiling,
    toggleSessionTracking,
    toggleInteractionLogging,
    updateBKTParameters,

    // Refresh
    refetch: mutate,
  }
}
