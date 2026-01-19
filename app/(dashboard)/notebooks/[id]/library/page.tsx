'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Library, Download, Trash2, Loader2, Image as ImageIcon, Filter, X, Search, Grid, List, Calendar, User, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

interface Artifact {
  id: string
  skillName: string
  skillDescription?: string
  artifactType: string
  audience: 'student' | 'teacher' | 'curriculum'
  toolId: string
  imageData: string
  textContent?: string
  modelUsed?: string
  createdAt: string
}

export default function ArtifactLibraryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: notebookId } = use(params)
  const { toast } = useToast()

  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAudience, setSelectedAudience] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchArtifacts()
  }, [notebookId, selectedAudience])

  const fetchArtifacts = async () => {
    setLoading(true)
    try {
      const url = new URL(`/api/notebooks/${notebookId}/artifacts/library`, window.location.origin)
      if (selectedAudience) {
        url.searchParams.set('audience', selectedAudience)
      }

      const response = await fetch(url.toString())
      if (!response.ok) {
        throw new Error('Failed to fetch artifacts')
      }

      const data = await response.json()
      setArtifacts(data.artifacts || [])
    } catch (error) {
      toast({
        title: 'Error loading library',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteArtifact = async (artifactId: string) => {
    setDeleting(artifactId)
    try {
      const response = await fetch(
        `/api/notebooks/${notebookId}/artifacts/library?artifactId=${artifactId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        throw new Error('Failed to delete artifact')
      }

      setArtifacts(prev => prev.filter(a => a.id !== artifactId))
      if (selectedArtifact?.id === artifactId) {
        setSelectedArtifact(null)
      }

      toast({
        title: 'Artifact deleted',
        description: 'The artifact has been removed from your library',
      })
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setDeleting(null)
    }
  }

  const downloadArtifact = (artifact: Artifact) => {
    const link = document.createElement('a')
    link.href = artifact.imageData
    link.download = `${artifact.skillName}-${artifact.artifactType.toLowerCase().replace(/\s+/g, '-')}.png`
    link.click()
  }

  const filteredArtifacts = artifacts.filter(artifact => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      artifact.skillName.toLowerCase().includes(query) ||
      artifact.artifactType.toLowerCase().includes(query) ||
      artifact.toolId.toLowerCase().includes(query)
    )
  })

  const audienceCounts = {
    all: artifacts.length,
    student: artifacts.filter(a => a.audience === 'student').length,
    teacher: artifacts.filter(a => a.audience === 'teacher').length,
    curriculum: artifacts.filter(a => a.audience === 'curriculum').length,
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getAudienceColor = (audience: string) => {
    switch (audience) {
      case 'student': return 'bg-blue-100 text-blue-800'
      case 'teacher': return 'bg-green-100 text-green-800'
      case 'curriculum': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/notebooks/${notebookId}`}>
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Notebook
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Library className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Artifact Library</h1>
                  <p className="text-sm text-gray-500">Your saved visual artifacts</p>
                </div>
              </div>
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search artifacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Audience filter */}
          <div className="flex gap-2">
            <Button
              variant={selectedAudience === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedAudience(null)}
            >
              All ({audienceCounts.all})
            </Button>
            <Button
              variant={selectedAudience === 'student' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedAudience('student')}
              className="gap-1"
            >
              <User className="h-3 w-3" />
              Students ({audienceCounts.student})
            </Button>
            <Button
              variant={selectedAudience === 'teacher' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedAudience('teacher')}
              className="gap-1"
            >
              <User className="h-3 w-3" />
              Teachers ({audienceCounts.teacher})
            </Button>
            <Button
              variant={selectedAudience === 'curriculum' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedAudience('curriculum')}
              className="gap-1"
            >
              <Wand2 className="h-3 w-3" />
              Curriculum ({audienceCounts.curriculum})
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredArtifacts.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <ImageIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No artifacts found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery
                ? 'Try a different search term'
                : 'Generate and save visual artifacts to see them here'}
            </p>
            <Link href={`/notebooks/${notebookId}/for-teachers`}>
              <Button className="gap-2">
                <Wand2 className="h-4 w-4" />
                Create Artifacts
              </Button>
            </Link>
          </div>
        )}

        {/* Grid view */}
        {!loading && filteredArtifacts.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredArtifacts.map((artifact) => (
              <Card
                key={artifact.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => setSelectedArtifact(artifact)}
              >
                <div className="aspect-video relative bg-gray-100">
                  <img
                    src={artifact.imageData}
                    alt={`${artifact.artifactType} for ${artifact.skillName}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                      View
                    </span>
                  </div>
                </div>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm text-gray-900 truncate">
                        {artifact.skillName}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">{artifact.artifactType}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${getAudienceColor(artifact.audience)}`}>
                      {artifact.audience}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <Calendar className="h-3 w-3" />
                    {formatDate(artifact.createdAt)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* List view */}
        {!loading && filteredArtifacts.length > 0 && viewMode === 'list' && (
          <div className="space-y-2">
            {filteredArtifacts.map((artifact) => (
              <Card
                key={artifact.id}
                className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedArtifact(artifact)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                    <img
                      src={artifact.imageData}
                      alt={`${artifact.artifactType} for ${artifact.skillName}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900">{artifact.skillName}</h3>
                    <p className="text-sm text-gray-500">{artifact.artifactType}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getAudienceColor(artifact.audience)}`}>
                    {artifact.audience}
                  </span>
                  <div className="text-sm text-gray-400">
                    {formatDate(artifact.createdAt)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        downloadArtifact(artifact)
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteArtifact(artifact.id)
                      }}
                      disabled={deleting === artifact.id}
                      className="text-red-600 hover:bg-red-50"
                    >
                      {deleting === artifact.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Artifact Detail Modal */}
      {selectedArtifact && (
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
                    <h3 className="font-semibold text-lg">{selectedArtifact.artifactType}</h3>
                    <p className="text-purple-100 text-sm">{selectedArtifact.skillName}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedArtifact(null)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b">
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full ${getAudienceColor(selectedArtifact.audience)}`}>
                  {selectedArtifact.audience}
                </span>
                <span className="text-sm text-gray-500">
                  {formatDate(selectedArtifact.createdAt)}
                </span>
                {selectedArtifact.modelUsed && (
                  <span className="text-sm text-gray-400">
                    Generated with {selectedArtifact.modelUsed}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => deleteArtifact(selectedArtifact.id)}
                  disabled={deleting === selectedArtifact.id}
                  className="gap-2 text-red-600 hover:bg-red-50"
                >
                  {deleting === selectedArtifact.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete
                </Button>
                <Button onClick={() => downloadArtifact(selectedArtifact)} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-gray-100">
              <img
                src={selectedArtifact.imageData}
                alt={`${selectedArtifact.artifactType} for ${selectedArtifact.skillName}`}
                className="max-w-full max-h-full rounded-lg shadow-lg"
              />
            </div>

            {/* Description */}
            {selectedArtifact.skillDescription && (
              <div className="px-6 py-4 border-t bg-white">
                <p className="text-sm text-gray-600">{selectedArtifact.skillDescription}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
