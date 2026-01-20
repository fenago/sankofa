'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface WorkedExampleProps {
  content: string
}

export function WorkedExample({ content }: WorkedExampleProps) {
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700">
          <BookOpen className="h-4 w-4" />
          Worked Example
        </CardTitle>
      </CardHeader>
      <CardContent className="prose prose-sm max-w-none prose-headings:text-blue-800 prose-p:text-gray-700">
        <ReactMarkdown>{content}</ReactMarkdown>
      </CardContent>
    </Card>
  )
}
