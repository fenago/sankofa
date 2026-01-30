'use client'

import Link from 'next/link'
import { NotebookCard } from './NotebookCard'
import { CreateNotebookDialog } from './CreateNotebookDialog'
import { useNotebooks } from '@/hooks/useNotebooks'
import { Loader2, BookOpen, FlaskConical, Sparkles } from 'lucide-react'

export function NotebookList() {
  const { notebooks, loading, error, createNotebook, deleteNotebook } = useNotebooks()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Error: {error}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Notebooks
          </h1>
          <p className="text-muted-foreground mt-1">
            Organize your learning by topic
          </p>
        </div>
        <CreateNotebookDialog onCreateNotebook={createNotebook} />
      </div>

      {/* Research Foundations Link */}
      <div className="mb-4 text-right">
        <Link
          href="/research"
          className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
        >
          <FlaskConical className="h-3 w-3" />
          Research Foundations (29 frameworks)
        </Link>
      </div>

      {notebooks.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl bg-card/50">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-8 w-8 text-primary/50" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            No notebooks yet
          </h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Create your first notebook to start organizing your learning materials.
          </p>
          <CreateNotebookDialog onCreateNotebook={createNotebook} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {notebooks.map((notebook) => (
            <NotebookCard
              key={notebook.id}
              notebook={notebook}
              onDelete={deleteNotebook}
            />
          ))}
        </div>
      )}
    </div>
  )
}
