'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, FileText, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// Map slug to actual file path
const docMap: Record<string, { title: string; path: string }> = {
  'inverse-profiling-whitepaper': {
    title: 'Inverse Profiling Whitepaper',
    path: '/docs/LearnGraph_Inverse_Profiling_Whitepaper.md',
  },
  'competitive-positioning': {
    title: 'Competitive Positioning',
    path: '/docs/LearnGraph_Competitive_Positioning.md',
  },
  'educational-research-foundations': {
    title: 'Educational Research Foundations',
    path: '/docs/LearnGraph_Educational_Research_Foundations.md',
  },
  'theory-overview': {
    title: 'Theory Overview',
    path: '/docs/learngraph_theory.md',
  },
}

export default function DocViewerPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const doc = docMap[slug]

  useEffect(() => {
    if (!doc) {
      setError('Document not found')
      setLoading(false)
      return
    }

    fetch(`/api/docs?path=${encodeURIComponent(doc.path)}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load document')
        return res.text()
      })
      .then(text => {
        setContent(text)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [doc])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/research">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Research
            </Link>
          </Button>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-red-500">{error || 'Document not found'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-14 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/research">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                <h1 className="text-xl font-bold">{doc.title}</h1>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/docs?path=${encodeURIComponent(doc.path)}&download=true`} download>
                <Download className="h-4 w-4 mr-2" />
                Download
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6 prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content || ''}
            </ReactMarkdown>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
