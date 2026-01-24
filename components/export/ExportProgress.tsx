'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Download,
  CheckCircle,
  XCircle,
  FileDown,
  FileJson,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react'

interface ExportProgressProps {
  status: 'idle' | 'preparing' | 'processing' | 'complete' | 'error'
  progress?: number
  format?: 'json' | 'csv'
  fileName?: string
  fileSize?: number
  downloadUrl?: string
  error?: string
  onDownload?: () => void
  onRetry?: () => void
  onReset?: () => void
}

export function ExportProgress({
  status,
  progress = 0,
  format,
  fileName,
  fileSize,
  downloadUrl,
  error,
  onDownload,
  onRetry,
  onReset
}: ExportProgressProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-8 w-8 text-green-500" />
      case 'error':
        return <XCircle className="h-8 w-8 text-red-500" />
      case 'preparing':
      case 'processing':
        return (
          <div className="animate-spin">
            <RefreshCw className="h-8 w-8 text-blue-500" />
          </div>
        )
      default:
        return <FileDown className="h-8 w-8 text-gray-400" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'preparing':
        return 'Preparing export...'
      case 'processing':
        return 'Processing data...'
      case 'complete':
        return 'Export complete!'
      case 'error':
        return 'Export failed'
      default:
        return 'Ready to export'
    }
  }

  const getFormatIcon = () => {
    if (format === 'json') {
      return <FileJson className="h-5 w-5 text-blue-600" />
    }
    return <FileSpreadsheet className="h-5 w-5 text-green-600" />
  }

  if (status === 'idle') {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Progress
        </CardTitle>
        <CardDescription>
          {getStatusText()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center py-6">
          {/* Status icon */}
          <div className="mb-4">
            {getStatusIcon()}
          </div>

          {/* Progress bar for processing states */}
          {(status === 'preparing' || status === 'processing') && (
            <div className="w-full mb-4">
              <Progress value={progress} className="h-2" />
              <div className="text-center text-sm text-gray-500 mt-2">
                {progress}% complete
              </div>
            </div>
          )}

          {/* Success state */}
          {status === 'complete' && (
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                {format && getFormatIcon()}
                <span className="font-medium">{fileName}</span>
              </div>
              {fileSize && (
                <div className="text-sm text-gray-500">
                  Size: {formatFileSize(fileSize)}
                </div>
              )}
            </div>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="text-center mb-4">
              <div className="text-red-600 mb-2">{error || 'An error occurred during export'}</div>
              <p className="text-sm text-gray-500">
                Please try again or contact support if the issue persists.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mt-4">
            {status === 'complete' && onDownload && (
              <Button onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
            )}
            {status === 'complete' && downloadUrl && (
              <Button asChild>
                <a href={downloadUrl} download={fileName}>
                  <Download className="h-4 w-4 mr-2" />
                  Download File
                </a>
              </Button>
            )}
            {status === 'error' && onRetry && (
              <Button onClick={onRetry} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Export
              </Button>
            )}
            {(status === 'complete' || status === 'error') && onReset && (
              <Button onClick={onReset} variant="ghost">
                Start New Export
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ExportProgress
