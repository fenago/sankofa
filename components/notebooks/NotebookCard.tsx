'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { BookOpen, Trash2, MoreVertical } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import type { Notebook } from '@/lib/types/database'

interface NotebookCardProps {
  notebook: Notebook
  onDelete?: (id: string) => void
}

export function NotebookCard({ notebook, onDelete }: NotebookCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onDelete && confirm('Are you sure you want to delete this notebook? This action cannot be undone.')) {
      onDelete(notebook.id)
    }
  }

  return (
    <Link href={`/notebooks/${notebook.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: notebook.color || '#3b82f6' }}
            >
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardTitle className="text-lg font-semibold mt-3 line-clamp-1">
            {notebook.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notebook.description ? (
            <p className="text-sm text-gray-500 line-clamp-2">
              {notebook.description}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">No description</p>
          )}
          <p className="text-xs text-gray-400 mt-4">
            Updated {formatDistanceToNow(new Date(notebook.updated_at || notebook.created_at || Date.now()), { addSuffix: true })}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
