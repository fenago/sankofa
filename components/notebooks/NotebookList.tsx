'use client'

import { NotebookCard } from './NotebookCard'
import { CreateNotebookDialog } from './CreateNotebookDialog'
import { useNotebooks } from '@/hooks/useNotebooks'
import { Loader2, BookOpen } from 'lucide-react'

export function NotebookList() {
  const { notebooks, loading, error, createNotebook, deleteNotebook } = useNotebooks()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error: {error}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notebooks</h1>
          <p className="text-gray-500 mt-1">
            Organize your learning by topic
          </p>
        </div>
        <CreateNotebookDialog onCreateNotebook={createNotebook} />
      </div>

      {notebooks.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            No notebooks yet
          </h3>
          <p className="text-gray-500 mb-4">
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
