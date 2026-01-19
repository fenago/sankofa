"use client"

import { use, useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Search,
  Save,
  RotateCcw,
  Check,
  X,
  Edit2,
  FileText,
  GraduationCap,
  BookOpen,
  Users,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react"

interface PromptData {
  audience: 'student' | 'teacher' | 'curriculum'
  toolId: string
  artifactId: string
  artifactName: string
  artifactIcon: string
  artifactDescription: string
  defaultPrompt: string
  customPrompt: string | null
  hasOverride: boolean
  overrideId: string | null
  isActive: boolean
}

const audienceConfig = {
  student: {
    label: 'For Students',
    icon: GraduationCap,
    color: 'blue',
  },
  teacher: {
    label: 'For Teachers',
    icon: Users,
    color: 'green',
  },
  curriculum: {
    label: 'Curriculum',
    icon: BookOpen,
    color: 'purple',
  },
}

const toolLabels: Record<string, string> = {
  'study-guide': 'Study Guide',
  'practice-questions': 'Practice Questions',
  'concept-explainer': 'Concept Explainer',
  'misconception-addresser': 'Misconception Addresser',
  'prerequisite-checker': 'Prerequisite Checker',
  'lesson-plan': 'Lesson Plan',
  'curriculum-overview': 'Curriculum Overview',
  'threshold-concepts': 'Threshold Concepts',
  'cognitive-load': 'Cognitive Load',
  'learning-path': 'Learning Path',
}

export default function PromptsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: notebookId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get filter params from URL
  const filterAudience = searchParams.get('audience') as 'student' | 'teacher' | 'curriculum' | null
  const filterToolId = searchParams.get('toolId')
  const filterArtifactId = searchParams.get('artifactId')

  const [prompts, setPrompts] = useState<PromptData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAudience, setSelectedAudience] = useState<'student' | 'teacher' | 'curriculum' | 'all'>(
    filterAudience || 'all'
  )
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set())
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchPrompts = useCallback(async () => {
    try {
      setLoading(true)
      const url = new URL(`/api/notebooks/${notebookId}/prompts`, window.location.origin)
      if (filterAudience) url.searchParams.set('audience', filterAudience)
      if (filterToolId) url.searchParams.set('toolId', filterToolId)
      if (filterArtifactId) url.searchParams.set('artifactId', filterArtifactId)

      const response = await fetch(url.toString())
      const data = await response.json()

      if (data.prompts) {
        setPrompts(data.prompts)

        // If filtering by a specific artifact, expand its tool
        if (filterArtifactId && filterToolId) {
          setExpandedTools(new Set([`${filterAudience}:${filterToolId}`]))
          // Auto-open edit mode for the specific artifact
          const key = `${filterAudience}:${filterToolId}:${filterArtifactId}`
          const prompt = data.prompts.find(
            (p: PromptData) => p.audience === filterAudience && p.toolId === filterToolId && p.artifactId === filterArtifactId
          )
          if (prompt) {
            setEditingPrompt(key)
            setEditedContent(prompt.customPrompt || prompt.defaultPrompt)
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch prompts:", error)
    } finally {
      setLoading(false)
    }
  }, [notebookId, filterAudience, filterToolId, filterArtifactId])

  useEffect(() => {
    fetchPrompts()
  }, [fetchPrompts])

  const toggleTool = (key: string) => {
    setExpandedTools(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  const startEditing = (prompt: PromptData) => {
    const key = `${prompt.audience}:${prompt.toolId}:${prompt.artifactId}`
    setEditingPrompt(key)
    setEditedContent(prompt.customPrompt || prompt.defaultPrompt)
  }

  const cancelEditing = () => {
    setEditingPrompt(null)
    setEditedContent("")
  }

  const savePrompt = async (prompt: PromptData) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/notebooks/${notebookId}/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience: prompt.audience,
          toolId: prompt.toolId,
          artifactId: prompt.artifactId,
          customPrompt: editedContent,
        }),
      })

      if (response.ok) {
        await fetchPrompts()
        setEditingPrompt(null)
        setEditedContent("")
      }
    } catch (error) {
      console.error("Failed to save prompt:", error)
    } finally {
      setSaving(false)
    }
  }

  const resetToDefault = async (prompt: PromptData) => {
    if (!prompt.overrideId) return

    try {
      setSaving(true)
      const response = await fetch(
        `/api/notebooks/${notebookId}/prompts?overrideId=${prompt.overrideId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        await fetchPrompts()
        setEditingPrompt(null)
        setEditedContent("")
      }
    } catch (error) {
      console.error("Failed to reset prompt:", error)
    } finally {
      setSaving(false)
    }
  }

  // Group prompts by audience and tool
  const groupedPrompts = prompts.reduce((acc, prompt) => {
    const audienceKey = prompt.audience
    const toolKey = prompt.toolId

    if (!acc[audienceKey]) {
      acc[audienceKey] = {}
    }
    if (!acc[audienceKey][toolKey]) {
      acc[audienceKey][toolKey] = []
    }
    acc[audienceKey][toolKey].push(prompt)
    return acc
  }, {} as Record<string, Record<string, PromptData[]>>)

  // Filter by search and audience
  const filteredGroupedPrompts = Object.entries(groupedPrompts)
    .filter(([audience]) => selectedAudience === 'all' || audience === selectedAudience)
    .reduce((acc, [audience, tools]) => {
      const filteredTools = Object.entries(tools).reduce((toolAcc, [toolId, toolPrompts]) => {
        const filtered = toolPrompts.filter(p =>
          searchQuery === '' ||
          p.artifactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.artifactDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.defaultPrompt.toLowerCase().includes(searchQuery.toLowerCase())
        )
        if (filtered.length > 0) {
          toolAcc[toolId] = filtered
        }
        return toolAcc
      }, {} as Record<string, PromptData[]>)

      if (Object.keys(filteredTools).length > 0) {
        acc[audience] = filteredTools
      }
      return acc
    }, {} as Record<string, Record<string, PromptData[]>>)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Prompt Library
              </h1>
              <p className="text-sm text-gray-500">
                View and customize artifact generation prompts
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Audience Filter */}
          <div className="flex gap-2">
            <Button
              variant={selectedAudience === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedAudience('all')}
            >
              All
            </Button>
            {Object.entries(audienceConfig).map(([key, config]) => {
              const Icon = config.icon
              return (
                <Button
                  key={key}
                  variant={selectedAudience === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedAudience(key as 'student' | 'teacher' | 'curriculum')}
                  className="gap-1"
                >
                  <Icon className="h-4 w-4" />
                  {config.label}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Prompts List */}
        <div className="space-y-6">
          {Object.entries(filteredGroupedPrompts).map(([audience, tools]) => {
            const config = audienceConfig[audience as keyof typeof audienceConfig]
            const Icon = config.icon

            return (
              <div key={audience} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Audience Header */}
                <div className={`px-4 py-3 bg-${config.color}-50 border-b border-${config.color}-100`}>
                  <h2 className={`font-semibold text-${config.color}-800 flex items-center gap-2`}>
                    <Icon className="h-5 w-5" />
                    {config.label}
                  </h2>
                </div>

                {/* Tools */}
                <div className="divide-y divide-gray-100">
                  {Object.entries(tools).map(([toolId, toolPrompts]) => {
                    const toolKey = `${audience}:${toolId}`
                    const isExpanded = expandedTools.has(toolKey)

                    return (
                      <div key={toolKey}>
                        {/* Tool Header */}
                        <button
                          onClick={() => toggleTool(toolKey)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <span className="font-medium text-gray-700">
                            {toolLabels[toolId] || toolId}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400">
                              {toolPrompts.length} artifact{toolPrompts.length !== 1 ? 's' : ''}
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </button>

                        {/* Artifacts */}
                        {isExpanded && (
                          <div className="border-t border-gray-100 bg-gray-50/50">
                            {toolPrompts.map((prompt) => {
                              const promptKey = `${prompt.audience}:${prompt.toolId}:${prompt.artifactId}`
                              const isEditing = editingPrompt === promptKey

                              return (
                                <div
                                  key={promptKey}
                                  className="px-4 py-4 border-b border-gray-100 last:border-b-0"
                                >
                                  {/* Artifact Header */}
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xl">{prompt.artifactIcon}</span>
                                      <div>
                                        <h4 className="font-medium text-gray-800">
                                          {prompt.artifactName}
                                        </h4>
                                        <p className="text-sm text-gray-500">
                                          {prompt.artifactDescription}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {prompt.hasOverride && (
                                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full flex items-center gap-1">
                                          <Sparkles className="h-3 w-3" />
                                          Customized
                                        </span>
                                      )}
                                      {!isEditing && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => startEditing(prompt)}
                                        >
                                          <Edit2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Prompt Content */}
                                  {isEditing ? (
                                    <div className="space-y-3">
                                      <textarea
                                        value={editedContent}
                                        onChange={(e) => setEditedContent(e.target.value)}
                                        className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="Enter custom prompt..."
                                      />
                                      <div className="flex items-center justify-between">
                                        <div className="text-xs text-gray-500">
                                          Use <code className="bg-gray-100 px-1 rounded">{'{skillName}'}</code> and{' '}
                                          <code className="bg-gray-100 px-1 rounded">{'{skillDescription}'}</code> as placeholders
                                        </div>
                                        <div className="flex gap-2">
                                          {prompt.hasOverride && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => resetToDefault(prompt)}
                                              disabled={saving}
                                              className="gap-1"
                                            >
                                              <RotateCcw className="h-4 w-4" />
                                              Reset to Default
                                            </Button>
                                          )}
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={cancelEditing}
                                            disabled={saving}
                                          >
                                            <X className="h-4 w-4" />
                                            Cancel
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={() => savePrompt(prompt)}
                                            disabled={saving}
                                            className="gap-1"
                                          >
                                            {saving ? (
                                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            ) : (
                                              <Save className="h-4 w-4" />
                                            )}
                                            Save
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono overflow-x-auto max-h-48 overflow-y-auto">
                                        {prompt.customPrompt || prompt.defaultPrompt}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {Object.keys(filteredGroupedPrompts).length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700">No prompts found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}
      </main>
    </div>
  )
}
