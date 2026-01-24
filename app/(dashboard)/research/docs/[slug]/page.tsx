'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeft,
  Download,
  Loader2,
  FileText,
  Brain,
  TrendingUp,
  BookOpen,
  ChevronRight,
  Clock,
  User,
  Calendar,
  Menu,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Map slug to actual file path with metadata
const docMap: Record<string, {
  title: string
  path: string
  icon: typeof FileText
  color: string
  author: string
  date: string
  version: string
  readTime: string
  description: string
}> = {
  'inverse-profiling-whitepaper': {
    title: 'Inverse Profiling Whitepaper',
    path: '/docs/LearnGraph_Inverse_Profiling_Whitepaper.md',
    icon: Brain,
    color: 'purple',
    author: 'Dr. Ernesto Lee',
    date: 'January 2026',
    version: '1.1',
    readTime: '45 min read',
    description: 'Comprehensive technical documentation of the Inverse Profiling system including BKT, ZPD, scaffolding, and real-time adaptation.',
  },
  'competitive-positioning': {
    title: 'Competitive Positioning',
    path: '/docs/LearnGraph_Competitive_Positioning.md',
    icon: TrendingUp,
    color: 'blue',
    author: 'Dr. Ernesto Lee',
    date: 'January 2026',
    version: '1.0',
    readTime: '25 min read',
    description: 'Market analysis, competitive landscape, unique value propositions, and go-to-market strategy.',
  },
  'educational-research-foundations': {
    title: 'Educational Research Foundations',
    path: '/docs/LearnGraph_Educational_Research_Foundations.md',
    icon: BookOpen,
    color: 'green',
    author: 'Dr. Ernesto Lee',
    date: 'January 2026',
    version: '1.0',
    readTime: '90 min read',
    description: 'Detailed research foundations with evidence levels, controversies, limitations, and measurable outcomes.',
  },
  'theory-overview': {
    title: 'Theory Overview',
    path: '/docs/learngraph_theory.md',
    icon: FileText,
    color: 'orange',
    author: 'Dr. Ernesto Lee',
    date: 'January 2026',
    version: '1.0',
    readTime: '15 min read',
    description: 'Quick reference guide to all 29 educational psychology frameworks.',
  },
}

// Extract headings from markdown content
function extractHeadings(content: string): { level: number; text: string; id: string }[] {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm
  const headings: { level: number; text: string; id: string }[] = []
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length
    const text = match[2].replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
    headings.push({ level, text, id })
  }

  return headings
}

// Custom components for ReactMarkdown
/* eslint-disable @typescript-eslint/no-explicit-any */
const MarkdownComponents: Record<string, React.ComponentType<any>> = {
  // Styled tables
  table: ({ children }: any) => (
    <div className="my-6 w-full overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="w-full border-collapse text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
      {children}
    </thead>
  ),
  th: ({ children }: any) => (
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="px-4 py-3 text-sm text-gray-600 border-b border-gray-100 last:border-b-0">
      {children}
    </td>
  ),
  tr: ({ children }: any) => (
    <tr className="hover:bg-gray-50/50 transition-colors">
      {children}
    </tr>
  ),
  // Styled code - inline only (block code is handled by pre)
  code: ({ className, children, ...props }: any) => {
    return (
      <code
        className={className || "px-1.5 py-0.5 text-sm font-mono bg-purple-50 text-purple-700 rounded border border-purple-200"}
        {...props}
      >
        {children}
      </code>
    )
  },
  // Styled code blocks for ASCII diagrams
  pre: ({ children }: any) => {
    // Extract the code content from the children
    const codeElement = children?.props?.children
    const content = String(codeElement || '').replace(/\n$/, '')
    const isAsciiDiagram = content.includes('┌') || content.includes('│') || content.includes('├')

    if (isAsciiDiagram) {
      return (
        <div className="my-6 -mx-6 md:-mx-10 lg:-mx-12">
          <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-1 shadow-xl mx-2">
            <div className="rounded-lg bg-slate-900 p-4 md:p-6 overflow-x-auto">
              <pre className="text-[11px] sm:text-xs md:text-sm font-mono text-emerald-400 leading-relaxed whitespace-pre w-max min-w-full">
                {content}
              </pre>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="my-4 -mx-6 md:-mx-10 lg:-mx-12">
        <div className="rounded-lg bg-gray-900 p-4 overflow-x-auto shadow-lg mx-2">
          <pre className="text-sm font-mono text-gray-100 w-max min-w-full">
            {children}
          </pre>
        </div>
      </div>
    )
  },
  // Styled headings with anchor links
  h1: ({ children }: any) => {
    const text = String(children)
    const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
    return (
      <h1 id={id} className="scroll-mt-24 text-3xl md:text-4xl font-bold text-gray-900 mt-12 mb-6 pb-4 border-b-2 border-purple-200">
        {children}
      </h1>
    )
  },
  h2: ({ children }: any) => {
    const text = String(children)
    const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
    return (
      <h2 id={id} className="scroll-mt-24 text-2xl md:text-3xl font-bold text-gray-800 mt-10 mb-4 flex items-center gap-3">
        <div className="w-1.5 h-8 bg-purple-500 rounded-full" />
        {children}
      </h2>
    )
  },
  h3: ({ children }: any) => {
    const text = String(children)
    const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
    return (
      <h3 id={id} className="scroll-mt-24 text-xl md:text-2xl font-semibold text-gray-800 mt-8 mb-3">
        {children}
      </h3>
    )
  },
  h4: ({ children }: any) => (
    <h4 className="text-lg font-semibold text-gray-700 mt-6 mb-2">{children}</h4>
  ),
  // Styled paragraphs
  p: ({ children }: any) => (
    <p className="text-gray-600 leading-relaxed mb-4 text-base">{children}</p>
  ),
  // Styled lists
  ul: ({ children }: any) => (
    <ul className="my-4 ml-6 space-y-2 text-gray-600">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="my-4 ml-6 space-y-2 text-gray-600 list-decimal">{children}</ol>
  ),
  li: ({ children }: any) => (
    <li className="leading-relaxed pl-2">{children}</li>
  ),
  // Styled blockquotes
  blockquote: ({ children }: any) => (
    <blockquote className="my-6 pl-6 border-l-4 border-purple-300 bg-purple-50/50 py-4 pr-4 rounded-r-lg italic text-gray-700">
      {children}
    </blockquote>
  ),
  // Styled horizontal rules
  hr: () => (
    <hr className="my-12 border-t-2 border-gray-200" />
  ),
  // Styled links
  a: ({ href, children }: any) => (
    <a
      href={href}
      className="text-purple-600 hover:text-purple-800 underline decoration-purple-300 hover:decoration-purple-500 transition-colors"
    >
      {children}
    </a>
  ),
  // Styled strong/bold
  strong: ({ children }: any) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  // Styled emphasis
  em: ({ children }: any) => (
    <em className="italic text-gray-700">{children}</em>
  ),
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function DocViewerPage() {
  const params = useParams()
  const slug = params.slug as string
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<string>('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const doc = docMap[slug]

  const headings = useMemo(() => {
    if (!content) return []
    return extractHeadings(content)
  }, [content])

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

  // Track active section based on scroll position
  useEffect(() => {
    if (!content || headings.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-20% 0px -70% 0px',
      }
    )

    // Observe all headings
    const timer = setTimeout(() => {
      headings.forEach((heading) => {
        const element = document.getElementById(heading.id)
        if (element) {
          observer.observe(element)
        }
      })
    }, 100)

    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [content, headings])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading document...</p>
        </div>
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <Button variant="ghost" asChild className="mb-8">
            <Link href="/research">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Research
            </Link>
          </Button>
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Document Not Found</h1>
            <p className="text-gray-500">{error || 'The requested document could not be loaded.'}</p>
          </div>
        </div>
      </div>
    )
  }

  const Icon = doc.icon
  const colorClasses = {
    purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', gradient: 'from-purple-600 to-purple-800' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', gradient: 'from-blue-600 to-blue-800' },
    green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', gradient: 'from-green-600 to-green-800' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', gradient: 'from-orange-600 to-orange-800' },
  }[doc.color] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', gradient: 'from-gray-600 to-gray-800' }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Mobile Navigation Toggle */}
      <button
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-purple-700 transition-colors"
      >
        {mobileNavOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile Navigation Overlay */}
      {mobileNavOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={cn(
        "fixed z-40 top-14 bottom-0 w-80 bg-white/95 backdrop-blur-sm border-r border-gray-200 overflow-y-auto transition-transform duration-300",
        "lg:translate-x-0",
        mobileNavOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6">
          <Link href="/research" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Research
          </Link>

          <div className="mb-6">
            <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-3", colorClasses.bg, colorClasses.text)}>
              <Icon className="h-3.5 w-3.5" />
              Whitepaper
            </div>
            <h2 className="font-bold text-gray-900 text-lg leading-tight">{doc.title}</h2>
          </div>

          <nav className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Table of Contents</p>
            {headings.filter(h => h.level <= 2).map((heading, index) => (
              <a
                key={index}
                href={`#${heading.id}`}
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  "flex items-center gap-2 py-2 px-3 rounded-lg text-sm transition-all duration-200",
                  heading.level === 1 ? "font-semibold" : "pl-5 text-sm",
                  activeSection === heading.id
                    ? "bg-purple-100 text-purple-900 font-medium"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <ChevronRight className={cn(
                  "h-3 w-3 transition-transform",
                  activeSection === heading.id ? "text-purple-600" : "text-gray-400"
                )} />
                <span className="truncate">{heading.text}</span>
              </a>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-80">
        {/* Hero Header */}
        <header className={cn("bg-gradient-to-br text-white", colorClasses.gradient)}>
          <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className={cn("p-3 rounded-xl", colorClasses.bg)}>
                <Icon className={cn("h-8 w-8", colorClasses.text)} />
              </div>
              <Button variant="secondary" size="sm" asChild className="shrink-0">
                <a href={`/api/docs?path=${encodeURIComponent(doc.path)}&download=true`} download>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              {doc.title}
            </h1>

            <p className="text-lg md:text-xl opacity-90 mb-8 leading-relaxed max-w-2xl">
              {doc.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm opacity-80">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{doc.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{doc.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Version {doc.version}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{doc.readTime}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Document Content */}
        <div className="max-w-4xl mx-auto px-6 py-12" ref={contentRef}>
          <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10 lg:p-12">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={MarkdownComponents}
            >
              {content || ''}
            </ReactMarkdown>
          </article>

          {/* Footer */}
          <footer className="mt-12 text-center">
            <div className="inline-flex items-center gap-4">
              <Button variant="outline" asChild>
                <Link href="/research">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Research
                </Link>
              </Button>
              <Button asChild>
                <a href={`/api/docs?path=${encodeURIComponent(doc.path)}&download=true`} download>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </a>
              </Button>
            </div>
            <p className="mt-6 text-sm text-gray-400">
              LearnGraph Research Documentation | {doc.date}
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}
