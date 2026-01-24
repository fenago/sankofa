'use client'

import { useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Download,
  FileJson,
  FileSpreadsheet,
  History,
  Shield,
  Info
} from 'lucide-react'
import { ExportOptions } from '@/components/export/ExportOptions'
import { ExportProgress } from '@/components/export/ExportProgress'
import { useExport } from '@/hooks/useLearningAnalytics'
import type { ExportOptions as ExportOptionsType } from '@/lib/analytics/types'

interface ExportHistoryItem {
  id: string
  format: 'json' | 'csv'
  timestamp: Date
  fileSize: number
  options: ExportOptionsType
}

export default function ExportPage() {
  const params = useParams()
  const notebookId = params.id as string
  const [exportStatus, setExportStatus] = useState<'idle' | 'preparing' | 'processing' | 'complete' | 'error'>('idle')
  const [exportProgress, setExportProgress] = useState(0)
  const [currentExport, setCurrentExport] = useState<{
    format: 'json' | 'csv'
    fileName: string
    fileSize: number
    downloadUrl: string
  } | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([])

  const { exportData, isExporting } = useExport(notebookId)

  const handleExport = useCallback(async (options: ExportOptionsType) => {
    setExportStatus('preparing')
    setExportProgress(0)
    setExportError(null)

    try {
      setExportProgress(20)
      setExportStatus('processing')

      // The exportData hook handles the download directly
      const result = await exportData({
        format: options.format === 'pdf' ? 'json' : options.format,
        anonymize: options.anonymize,
        include: [
          options.includeSkillMastery && 'mastery',
          options.includeInteractions && 'interactions',
          options.includeAssessments && 'assessments',
          options.includeMetadata && 'metadata',
        ].filter(Boolean) as string[],
      })

      if (result) {
        setExportProgress(100)
        setExportStatus('complete')

        const fileName = `learning-data-${new Date().toISOString().split('T')[0]}.${options.format}`

        setCurrentExport({
          format: options.format === 'pdf' ? 'json' : options.format,
          fileName,
          fileSize: 0, // Size not available after download
          downloadUrl: '',
        })

        // Add to history
        setExportHistory(prev => [{
          id: `export-${Date.now()}`,
          format: options.format === 'pdf' ? 'json' : options.format,
          timestamp: new Date(),
          fileSize: 0,
          options,
        }, ...prev.slice(0, 9)])
      } else {
        throw new Error('Export failed')
      }

    } catch (error) {
      setExportStatus('error')
      setExportError(error instanceof Error ? error.message : 'Export failed')
    }
  }, [exportData])

  const handleReset = () => {
    setExportStatus('idle')
    setExportProgress(0)
    setCurrentExport(null)
    setExportError(null)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(date))
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Download className="h-6 w-6" />
          Export Learning Data
        </h1>
        <p className="text-gray-500 mt-1">
          Download your learning progress for backup, analysis, or research
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Export Options */}
        <div className="space-y-6">
          <ExportOptions
            onExport={handleExport}
            isExporting={isExporting || exportStatus === 'preparing' || exportStatus === 'processing'}
            disabled={false}
          />

          {/* Export Progress (when active) */}
          {exportStatus !== 'idle' && (
            <ExportProgress
              status={exportStatus}
              progress={exportProgress}
              format={currentExport?.format}
              fileName={currentExport?.fileName}
              fileSize={currentExport?.fileSize}
              downloadUrl={currentExport?.downloadUrl}
              error={exportError || undefined}
              onRetry={() => handleReset()}
              onReset={handleReset}
            />
          )}
        </div>

        {/* Info and History */}
        <div className="space-y-6">
          {/* Data Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Info className="h-5 w-5" />
                What's Included
              </CardTitle>
              <CardDescription>
                Overview of exportable data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DataTypePreview
                icon={<FileSpreadsheet className="h-4 w-4 text-blue-500" />}
                title="Skill Mastery Data"
                description="P(mastery) values, scaffold levels, BKT parameters for each skill"
                fields={['skillId', 'pMastery', 'scaffoldLevel', 'pLearn', 'pGuess', 'pSlip', 'pKnown']}
              />
              <DataTypePreview
                icon={<FileJson className="h-4 w-4 text-green-500" />}
                title="Interaction History"
                description="All practice attempts with timing and correctness"
                fields={['timestamp', 'skillId', 'isCorrect', 'responseTimeMs', 'hintsUsed']}
              />
              <DataTypePreview
                icon={<Shield className="h-4 w-4 text-purple-500" />}
                title="Assessment Results"
                description="Formal assessment scores and question-level data"
                fields={['assessmentId', 'type', 'score', 'completedAt', 'skillBreakdown']}
              />
            </CardContent>
          </Card>

          {/* Export History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5" />
                Recent Exports
              </CardTitle>
              <CardDescription>
                Your recent data exports
              </CardDescription>
            </CardHeader>
            <CardContent>
              {exportHistory.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No exports yet</p>
                  <p className="text-sm">Your export history will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {exportHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {item.format === 'json' ? (
                          <FileJson className="h-5 w-5 text-blue-500" />
                        ) : (
                          <FileSpreadsheet className="h-5 w-5 text-green-500" />
                        )}
                        <div>
                          <div className="text-sm font-medium">
                            {item.format.toUpperCase()} Export
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(item.timestamp)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {formatFileSize(item.fileSize)}
                        </Badge>
                        {item.options.anonymize && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Anonymized
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Privacy Notice */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <Shield className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Privacy Note</h4>
                  <p className="text-sm text-blue-800">
                    Your learning data belongs to you. Exports include only your personal learning data
                    and can be anonymized if you plan to share them for research purposes.
                    We recommend enabling anonymization when sharing with third parties.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function DataTypePreview({
  icon,
  title,
  description,
  fields
}: {
  icon: React.ReactNode
  title: string
  description: string
  fields: string[]
}) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="font-medium text-sm">{title}</span>
      </div>
      <p className="text-xs text-gray-600 mb-2">{description}</p>
      <div className="flex flex-wrap gap-1">
        {fields.map((field) => (
          <Badge key={field} variant="outline" className="text-xs font-mono">
            {field}
          </Badge>
        ))}
      </div>
    </div>
  )
}
