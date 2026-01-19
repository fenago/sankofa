'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, X, Download, Image as ImageIcon, Wand2, Save, Check, Clock, Sparkles, Palette, Info, Library } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { studentArtifacts, teacherArtifacts, curriculumArtifacts, ArtifactType } from '@/lib/artifacts/types'

interface Skill {
  id: string
  name: string
  description?: string
}

interface ArtifactGeneratorProps {
  notebookId: string
  skill: Skill | null
  toolId: string
  audience: 'student' | 'teacher' | 'curriculum'
  compact?: boolean
}

interface GeneratedArtifact {
  type: string
  skillName: string
  skillDescription?: string
  imageData: string
  textContent?: string
  toolId: string
  audience: 'student' | 'teacher' | 'curriculum'
}

// Progress overlay during generation
function GeneratingOverlay({
  artifactType,
  skillName,
  elapsedSeconds,
  currentStep,
}: {
  artifactType: string
  skillName: string
  elapsedSeconds: number
  currentStep: 'refining' | 'generating' | 'processing'
}) {
  const steps = {
    refining: { label: 'Refining prompt...', icon: Sparkles, progress: 33 },
    generating: { label: 'Generating image...', icon: Palette, progress: 66 },
    processing: { label: 'Processing result...', icon: ImageIcon, progress: 90 },
  }

  const current = steps[currentStep]
  const Icon = current.icon

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <Wand2 className="h-8 w-8 text-purple-600 animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Creating {artifactType}</h3>
          <p className="text-sm text-gray-500 mt-1">for "{skillName}"</p>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${current.progress}%` }}
            />
          </div>
        </div>

        {/* Current step */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <Icon className="h-4 w-4 text-purple-600 animate-pulse" />
          <span className="text-sm text-gray-600">{current.label}</span>
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-mono">{formatTime(elapsedSeconds)}</span>
        </div>

        {/* Estimated time hint */}
        <p className="text-xs text-gray-400 text-center mt-4">
          AI image generation typically takes 15-30 seconds
        </p>
      </div>
    </div>
  )
}

// Artifact button with description
function ArtifactButton({
  artifact,
  onClick,
  disabled,
}: {
  artifact: ArtifactType
  onClick: () => void
  disabled: boolean
}) {
  const [showInfo, setShowInfo] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={onClick}
        disabled={disabled}
        className="w-full flex items-center gap-3 p-2.5 text-left rounded-lg hover:bg-purple-50 border border-gray-200 hover:border-purple-300 transition-colors disabled:opacity-50 group"
      >
        <span className="text-xl flex-shrink-0">{artifact.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-800">{artifact.name}</div>
          <div className="text-xs text-gray-500 truncate">{artifact.description}</div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setShowInfo(!showInfo)
          }}
          className="p-1 rounded-full hover:bg-purple-100 text-gray-400 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </button>
      {showInfo && (
        <div className="absolute left-full ml-2 top-0 z-50 w-64 p-3 bg-white rounded-lg shadow-xl border text-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{artifact.icon}</span>
            <span className="font-semibold text-gray-800">{artifact.name}</span>
          </div>
          <p className="text-gray-600 text-xs">{artifact.description}</p>
          <p className="text-purple-600 text-xs mt-2 font-medium">Click to generate</p>
        </div>
      )}
    </div>
  )
}

export function ArtifactGenerator({
  notebookId,
  skill,
  toolId,
  audience,
  compact = false,
}: ArtifactGeneratorProps) {
  const { toast } = useToast()
  const [generating, setGenerating] = useState<string | null>(null)
  const [artifact, setArtifact] = useState<GeneratedArtifact | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [currentStep, setCurrentStep] = useState<'refining' | 'generating' | 'processing'>('refining')
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Get artifacts for this tool
  const artifactMap = audience === 'student'
    ? studentArtifacts
    : audience === 'teacher'
      ? teacherArtifacts
      : curriculumArtifacts

  const artifacts = artifactMap[toolId] || []

  // Timer effect
  useEffect(() => {
    if (generating) {
      setElapsedSeconds(0)
      setCurrentStep('refining')

      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1
          // Update step based on elapsed time
          if (next >= 5 && next < 20) {
            setCurrentStep('generating')
          } else if (next >= 20) {
            setCurrentStep('processing')
          }
          return next
        })
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [generating])

  if (artifacts.length === 0) return null

  const generateArtifact = async (artifactType: ArtifactType) => {
    if (!skill) {
      toast({
        title: 'No skill selected',
        description: 'Please select a skill first',
        variant: 'destructive',
      })
      return
    }

    setGenerating(artifactType.id)
    setShowPicker(false)

    try {
      const response = await fetch(`/api/notebooks/${notebookId}/artifacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillName: skill.name,
          skillDescription: skill.description,
          artifactType: artifactType.name,
          artifactPrompt: artifactType.promptTemplate(skill.name, skill.description),
          audience,
          toolId,
          useHighQuality: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate artifact')
      }

      const data = await response.json()

      setArtifact({
        type: artifactType.name,
        skillName: skill.name,
        skillDescription: skill.description,
        imageData: data.artifact.imageData,
        textContent: data.artifact.textContent,
        toolId,
        audience,
      })

      toast({
        title: 'Artifact generated!',
        description: `${artifactType.name} created in ${elapsedSeconds}s`,
      })
    } catch (error) {
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setGenerating(null)
    }
  }

  const downloadArtifact = () => {
    if (!artifact) return

    const link = document.createElement('a')
    link.href = artifact.imageData
    link.download = `${artifact.skillName}-${artifact.type.toLowerCase().replace(/\s+/g, '-')}.png`
    link.click()
  }

  // Compact mode: just show the trigger button
  if (compact) {
    return (
      <>
        <div className="relative inline-block">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPicker(!showPicker)}
            disabled={!skill || !!generating}
            className="gap-2"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
            {generating ? 'Creating...' : 'Visual Artifact'}
          </Button>

          {showPicker && (
            <div className="absolute z-50 mt-2 w-80 bg-white rounded-lg shadow-xl border p-3 left-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Create Visual Artifact</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setShowPicker(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1.5">
                {artifacts.map((art) => (
                  <ArtifactButton
                    key={art.id}
                    artifact={art}
                    onClick={() => generateArtifact(art)}
                    disabled={!!generating}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Generating Overlay */}
        {generating && skill && (
          <GeneratingOverlay
            artifactType={artifacts.find(a => a.id === generating)?.name || 'Artifact'}
            skillName={skill.name}
            elapsedSeconds={elapsedSeconds}
            currentStep={currentStep}
          />
        )}

        {/* Artifact Modal */}
        {artifact && (
          <ArtifactModal
            artifact={artifact}
            notebookId={notebookId}
            onClose={() => setArtifact(null)}
            onDownload={downloadArtifact}
          />
        )}
      </>
    )
  }

  // Full mode: show all artifact buttons with descriptions
  return (
    <>
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-gray-700">Create Visual Artifacts</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {artifacts.map((art) => (
            <button
              key={art.id}
              onClick={() => generateArtifact(art)}
              disabled={!skill || generating === art.id}
              className="flex items-center gap-3 p-3 text-left rounded-lg hover:bg-purple-50 border border-gray-200 hover:border-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating === art.id ? (
                <Loader2 className="h-5 w-5 animate-spin text-purple-600 flex-shrink-0" />
              ) : (
                <span className="text-xl flex-shrink-0">{art.icon}</span>
              )}
              <div className="min-w-0">
                <div className="font-medium text-sm text-gray-800">{art.name}</div>
                <div className="text-xs text-gray-500">{art.description}</div>
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          AI-generated illustrations using Gemini 3.0 Pro Image
        </p>
      </div>

      {/* Generating Overlay */}
      {generating && skill && (
        <GeneratingOverlay
          artifactType={artifacts.find(a => a.id === generating)?.name || 'Artifact'}
          skillName={skill.name}
          elapsedSeconds={elapsedSeconds}
          currentStep={currentStep}
        />
      )}

      {/* Artifact Modal */}
      {artifact && (
        <ArtifactModal
          artifact={artifact}
          notebookId={notebookId}
          onClose={() => setArtifact(null)}
          onDownload={downloadArtifact}
        />
      )}
    </>
  )
}

// Artifact display modal with Save to Library
function ArtifactModal({
  artifact,
  notebookId,
  onClose,
  onDownload,
}: {
  artifact: GeneratedArtifact
  notebookId: string
  onClose: () => void
  onDownload: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const saveToLibrary = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/notebooks/${notebookId}/artifacts/library`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillName: artifact.skillName,
          skillDescription: artifact.skillDescription,
          artifactType: artifact.type,
          audience: artifact.audience,
          toolId: artifact.toolId,
          imageData: artifact.imageData,
          textContent: artifact.textContent,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save artifact')
      }

      setSaved(true)
      toast({
        title: 'Saved to Library!',
        description: 'Artifact added to your resource library',
      })
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{artifact.type}</h3>
                <p className="text-purple-100 text-sm">{artifact.skillName}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b">
          <span className="text-sm text-gray-500">Generated with Gemini 3.0 Pro Image</span>
          <div className="flex items-center gap-2">
            {saved ? (
              <Link href={`/notebooks/${notebookId}/library`}>
                <Button variant="outline" className="gap-2">
                  <Library className="h-4 w-4" />
                  View Library
                </Button>
              </Link>
            ) : (
              <Button
                variant="outline"
                onClick={saveToLibrary}
                disabled={saving}
                className="gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Saving...' : 'Save to Library'}
              </Button>
            )}
            <Button onClick={onDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Download Image
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-gray-100">
          <img
            src={artifact.imageData}
            alt={`${artifact.type} for ${artifact.skillName}`}
            className="max-w-full max-h-full rounded-lg shadow-lg"
          />
        </div>

        {/* Text Content (if any) */}
        {artifact.textContent && (
          <div className="px-6 py-4 border-t bg-white">
            <p className="text-sm text-gray-600">{artifact.textContent}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Quick artifact buttons for inline use
export function QuickArtifactButtons({
  notebookId,
  skill,
  toolId,
  audience,
}: ArtifactGeneratorProps) {
  const { toast } = useToast()
  const [generating, setGenerating] = useState<string | null>(null)
  const [artifact, setArtifact] = useState<GeneratedArtifact | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [currentStep, setCurrentStep] = useState<'refining' | 'generating' | 'processing'>('refining')
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const artifactMap = audience === 'student'
    ? studentArtifacts
    : audience === 'teacher'
      ? teacherArtifacts
      : curriculumArtifacts

  const artifacts = artifactMap[toolId] || []

  // Only show first 4 artifacts as quick buttons
  const quickArtifacts = artifacts.slice(0, 4)

  // Timer effect
  useEffect(() => {
    if (generating) {
      setElapsedSeconds(0)
      setCurrentStep('refining')

      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1
          if (next >= 5 && next < 20) {
            setCurrentStep('generating')
          } else if (next >= 20) {
            setCurrentStep('processing')
          }
          return next
        })
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [generating])

  if (quickArtifacts.length === 0) return null

  const generateArtifact = async (artifactType: ArtifactType) => {
    if (!skill) {
      toast({
        title: 'No skill selected',
        description: 'Please select a skill first',
        variant: 'destructive',
      })
      return
    }

    setGenerating(artifactType.id)

    try {
      const response = await fetch(`/api/notebooks/${notebookId}/artifacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillName: skill.name,
          skillDescription: skill.description,
          artifactType: artifactType.name,
          artifactPrompt: artifactType.promptTemplate(skill.name, skill.description),
          audience,
          toolId,
          useHighQuality: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate artifact')
      }

      const data = await response.json()

      setArtifact({
        type: artifactType.name,
        skillName: skill.name,
        skillDescription: skill.description,
        imageData: data.artifact.imageData,
        textContent: data.artifact.textContent,
        toolId,
        audience,
      })

      toast({
        title: 'Artifact generated!',
        description: `${artifactType.name} created in ${elapsedSeconds}s`,
      })
    } catch (error) {
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setGenerating(null)
    }
  }

  const downloadArtifact = () => {
    if (!artifact) return
    const link = document.createElement('a')
    link.href = artifact.imageData
    link.download = `${artifact.skillName}-${artifact.type.toLowerCase().replace(/\s+/g, '-')}.png`
    link.click()
  }

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {quickArtifacts.map((art) => (
          <div key={art.id} className="relative group">
            <button
              onClick={() => generateArtifact(art)}
              disabled={!skill || generating === art.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating === art.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <span>{art.icon}</span>
              )}
              {art.name}
            </button>
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 w-48 shadow-lg">
                <div className="font-medium mb-0.5">{art.name}</div>
                <div className="text-gray-300">{art.description}</div>
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Generating Overlay */}
      {generating && skill && (
        <GeneratingOverlay
          artifactType={quickArtifacts.find(a => a.id === generating)?.name || 'Artifact'}
          skillName={skill.name}
          elapsedSeconds={elapsedSeconds}
          currentStep={currentStep}
        />
      )}

      {/* Artifact Modal */}
      {artifact && (
        <ArtifactModal
          artifact={artifact}
          notebookId={notebookId}
          onClose={() => setArtifact(null)}
          onDownload={downloadArtifact}
        />
      )}
    </>
  )
}
