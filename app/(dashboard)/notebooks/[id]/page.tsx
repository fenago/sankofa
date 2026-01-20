'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNotebook } from '@/hooks/useNotebooks'
import { useSources, invalidateSources } from '@/hooks/useSources'
import { useToast } from '@/hooks/use-toast'
import { Navbar } from '@/components/Navbar'
import { SourcesPanel } from '@/components/SourcesPanel'
import { ChatInterface } from '@/components/ChatInterface'
import { OutputsPanel } from '@/components/OutputsPanel'
import { SettingsDialog } from '@/components/SettingsDialog'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { Source, Message, ResponseLength } from '@/lib/types'
import { CustomPrompts, getStoredPrompts } from '@/lib/prompts'

interface NotebookPageProps {
  params: Promise<{ id: string }>
}

export default function NotebookPage({ params }: NotebookPageProps) {
  const { id: notebookId } = use(params)
  const { notebook, loading: notebookLoading, error: notebookError } = useNotebook(notebookId)
  const { sources, loading: sourcesLoading, refreshSources } = useSources(notebookId)
  const { toast } = useToast()

  // State (similar to home page)
  const [messages, setMessages] = useState<Message[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [slides, setSlides] = useState<any[]>([])
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [mindmapData, setMindmapData] = useState<any>(null)
  const [graphEnhanced, setGraphEnhanced] = useState(false)

  // Loading States
  const [isScraping, setIsScraping] = useState(false)
  const [isChatting, setIsChatting] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false)
  const [isGeneratingMindmap, setIsGeneratingMindmap] = useState(false)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [responseLength, setResponseLength] = useState<ResponseLength>('detailed')

  // Settings State
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [customPrompts, setCustomPrompts] = useState<CustomPrompts>({})

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<'sources' | 'chat' | 'outputs'>('sources')

  // Load custom prompts on mount
  useEffect(() => {
    setCustomPrompts(getStoredPrompts())
  }, [])

  const generateSummary = async (currentSources: Source[]) => {
    const context = currentSources
      .filter((s) => s.status === 'success')
      .map((s) => `Title: ${s.title}\nContent: ${s.text?.slice(0, 2000)}`)
      .join('\n\n')

    if (!context) {
      toast({ title: 'No sources to summarize', description: 'Add sources first.', variant: 'destructive' })
      return
    }

    setIsGeneratingSummary(true)
    try {
      setSummary('Generating summary...')
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate summary')
      }

      if (data.summary) {
        setSummary(data.summary)
      } else {
        throw new Error('No summary returned from API')
      }
    } catch (e) {
      console.error('Summary generation failed', e)
      setSummary(null)
      toast({
        title: 'Failed to generate summary',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  const handleAddUrl = async (url: string) => {
    setIsScraping(true)

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, notebookId }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to scrape')

      // Refresh sources from server to get the new source
      invalidateSources(notebookId)
      toast({ title: 'Source added successfully' })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Failed to add source',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsScraping(false)
    }
  }

  const handleAddFile = async (file: File) => {
    setIsScraping(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('notebookId', notebookId)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to upload PDF')

      // Refresh sources from server to get the new source
      invalidateSources(notebookId)
      toast({ title: 'PDF added successfully' })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Failed to add PDF',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsScraping(false)
    }
  }

  const handleRemoveSource = async (id: string) => {
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/sources/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        toast({
          title: 'Failed to delete source',
          variant: 'destructive',
        })
        return
      }

      // Refresh sources after successful delete
      invalidateSources(notebookId)
    } catch (error) {
      toast({
        title: 'Failed to delete source',
        variant: 'destructive',
      })
    }
  }

  const handleAnalyzeSources = () => {
    generateSummary(sources)
    handleGenerateMindmap()
    handleGenerateSlides()
  }

  const handleSendMessage = async (content: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, newMessage])
    setIsChatting(true)
    setStreamingContent('')

    try {
      // Build context from sources
      const context = sources
        .filter((s) => s.status === 'success')
        .map((s) => `Title: ${s.title}\nContent: ${s.text?.slice(0, 2000)}`)
        .join('\n\n')

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, newMessage].map((m) => ({ role: m.role, content: m.content })),
          context,
          responseLength,
          notebookId,
        }),
      })

      if (!response.ok || !response.body) throw new Error('Chat failed')

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let fullResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          // Flush any remaining bytes
          const remaining = decoder.decode()
          if (remaining) {
            fullResponse += remaining
            setStreamingContent((prev) => prev + remaining)
          }
          break
        }
        const text = decoder.decode(value, { stream: true })
        fullResponse += text
        setStreamingContent((prev) => prev + text)
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-ai-${Date.now()}`,
          role: 'assistant',
          content: fullResponse,
          timestamp: Date.now(),
        },
      ])
      setStreamingContent('')
    } catch (error) {
      console.error(error)
      toast({ title: 'Chat failed', variant: 'destructive' })
    } finally {
      setIsChatting(false)
    }
  }

  const handleGenerateAudio = async () => {
    const successfulSources = sources.filter((s) => s.status === 'success' && s.text)

    if (!summary && messages.length === 0 && successfulSources.length === 0) {
      toast({ title: 'Nothing to generate audio from', description: 'Add sources or chat first.' })
      return
    }

    setIsGeneratingAudio(true)
    try {
      let sourceContent = summary
      if (!sourceContent && successfulSources.length > 0) {
        sourceContent = successfulSources[0].text?.slice(0, 3000) || ''
      }
      if (!sourceContent) {
        sourceContent = messages[messages.length - 1]?.content || 'No content available.'
      }

      toast({ title: 'Generating script...', description: 'Creating conversational audio script' })
      const scriptRes = await fetch('/api/audio-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: sourceContent,
          customPrompt: customPrompts.audioScript,
        }),
      })

      if (!scriptRes.ok) {
        const data = await scriptRes.json().catch(() => ({}))
        throw new Error(data.error || 'Script generation failed')
      }

      const { script } = await scriptRes.json()

      toast({ title: 'Generating audio...', description: 'Converting script to speech' })
      const audioRes = await fetch('/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: script }),
      })

      if (!audioRes.ok) {
        const data = await audioRes.json().catch(() => ({}))
        if (audioRes.status === 401 && data.error?.includes('missing_permissions')) {
          throw new Error("API Key missing 'text_to_speech' permission")
        }
        throw new Error(data.error || 'Audio generation failed')
      }

      const blob = await audioRes.blob()
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      toast({ title: 'Audio generated', description: 'Your podcast-style overview is ready!' })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Audio generation failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingAudio(false)
    }
  }

  const handleGenerateSlides = async () => {
    if (sources.filter((s) => s.status === 'success').length === 0) {
      toast({ title: 'No sources available', description: 'Add sources to generate slides.' })
      return
    }

    setIsGeneratingSlides(true)
    try {
      const res = await fetch('/api/gemini/slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notebookId,
          sources: sources,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')

      setSlides(data.slides)
      toast({ title: 'Slides generated' })
    } catch (error) {
      console.error(error)
      toast({ title: 'Failed to generate slides', variant: 'destructive' })
    } finally {
      setIsGeneratingSlides(false)
    }
  }

  const handleClearChat = () => {
    setMessages([])
    setStreamingContent('')
  }

  const handleGenerateMindmap = async () => {
    if (sources.filter((s) => s.status === 'success').length === 0) {
      toast({ title: 'No sources available', description: 'Add sources to generate mindmap.' })
      return
    }

    setIsGeneratingMindmap(true)
    try {
      const res = await fetch('/api/gpt/mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notebookId,
          sources: sources,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')

      setMindmapData(data.root)
      setGraphEnhanced(data.graphEnhanced || false)
      toast({
        title: 'Mindmap generated',
        description: data.graphEnhanced ? 'Enhanced with knowledge graph data' : undefined
      })
    } catch (error) {
      console.error(error)
      toast({ title: 'Failed to generate mindmap', variant: 'destructive' })
    } finally {
      setIsGeneratingMindmap(false)
    }
  }

  if (notebookLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (notebookError || !notebook) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Notebook not found</h2>
        <p className="text-gray-500 mb-4">The notebook you're looking for doesn't exist or you don't have access.</p>
        <Button asChild>
          <Link href="/notebooks">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Notebooks
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <SessionProvider notebookId={notebookId} autoStart={true}>
    <div className="flex flex-col h-[calc(100vh-88px)] bg-white text-black font-sans overflow-hidden -mx-4 -my-6">
      {/* Notebook Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-gray-50">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/notebooks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: notebook.color || '#3b82f6' }}
        >
          <span className="text-white text-sm font-bold">
            {notebook.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate">{notebook.name}</h1>
          {notebook.description && (
            <p className="text-xs text-gray-500 truncate">{notebook.description}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        customPrompts={customPrompts}
        onPromptsChange={setCustomPrompts}
      />

      {/* Mobile Tab Navigation */}
      <div className="lg:hidden flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => setMobileTab('sources')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            mobileTab === 'sources' ? 'bg-white border-b-2 border-black' : 'text-gray-500'
          }`}
        >
          Sources {sources.length > 0 && `(${sources.length})`}
        </button>
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            mobileTab === 'chat' ? 'bg-white border-b-2 border-black' : 'text-gray-500'
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setMobileTab('outputs')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            mobileTab === 'outputs' ? 'bg-white border-b-2 border-black' : 'text-gray-500'
          }`}
        >
          Outputs
        </button>
      </div>

      {/* 3-column layout */}
      <div className="flex-1 grid lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Left: Sources */}
        <div
          className={`${
            mobileTab === 'sources' ? 'block' : 'hidden'
          } lg:block lg:col-span-3 border-r border-gray-200 h-full overflow-hidden min-w-0`}
        >
          <SourcesPanel
            sources={sources}
            onAddUrl={handleAddUrl}
            onAddFile={handleAddFile}
            onRemoveSource={handleRemoveSource}
            onAnalyze={handleAnalyzeSources}
            isLoading={isScraping}
          />
        </div>

        {/* Middle: Chat */}
        <div
          className={`${
            mobileTab === 'chat' ? 'block' : 'hidden'
          } lg:block lg:col-span-5 border-r border-gray-200 h-full overflow-hidden`}
        >
          <ChatInterface
            messages={messages}
            streamingContent={streamingContent}
            isLoading={isChatting}
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
            hasSource={sources.length > 0}
            responseLength={responseLength}
            onResponseLengthChange={setResponseLength}
          />
        </div>

        {/* Right: Outputs */}
        <div
          className={`${
            mobileTab === 'outputs' ? 'block' : 'hidden'
          } lg:block lg:col-span-4 h-full overflow-hidden bg-white`}
        >
          <div className="h-full overflow-y-auto">
            <OutputsPanel
              notebookId={notebookId}
              sources={sources}
              summary={summary}
              slides={slides}
              audioUrl={audioUrl}
              mindmapData={mindmapData}
              graphEnhanced={graphEnhanced}
              isGeneratingAudio={isGeneratingAudio}
              isGeneratingSlides={isGeneratingSlides}
              isGeneratingMindmap={isGeneratingMindmap}
              isGeneratingSummary={isGeneratingSummary}
              onGenerateAudio={handleGenerateAudio}
              onGenerateSlides={handleGenerateSlides}
              onGenerateMindmap={handleGenerateMindmap}
              onGenerateSummary={() => generateSummary(sources)}
            />
          </div>
        </div>
      </div>
    </div>
    </SessionProvider>
  )
}
