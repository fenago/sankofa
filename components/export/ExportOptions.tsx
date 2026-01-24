'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Download, FileJson, FileSpreadsheet, Shield, Clock } from 'lucide-react'
import type { ExportOptions as ExportOptionsType } from '@/lib/analytics/types'

interface ExportOptionsProps {
  onExport: (options: ExportOptionsType) => void
  isExporting?: boolean
  disabled?: boolean
}

export function ExportOptions({ onExport, isExporting, disabled }: ExportOptionsProps) {
  const [format, setFormat] = useState<'json' | 'csv'>('csv')
  const [includeSkillMastery, setIncludeSkillMastery] = useState(true)
  const [includeInteractions, setIncludeInteractions] = useState(true)
  const [includeAssessments, setIncludeAssessments] = useState(true)
  const [includeMetadata, setIncludeMetadata] = useState(false)
  const [anonymize, setAnonymize] = useState(false)
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('all')

  const handleExport = () => {
    const options: ExportOptionsType = {
      format,
      includeSkillMastery,
      includeInteractions,
      includeAssessments,
      includeMetadata,
      anonymize,
      dateRange: dateRange === 'all' ? undefined : dateRange,
    }
    onExport(options)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Data
        </CardTitle>
        <CardDescription>
          Download your learning data for analysis or backup
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Format selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Export Format</Label>
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as 'json' | 'csv')}>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  CSV (Spreadsheet)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="flex items-center gap-2 cursor-pointer">
                  <FileJson className="h-4 w-4 text-blue-600" />
                  JSON (Developer)
                </Label>
              </div>
            </div>
          </RadioGroup>
          <p className="text-xs text-gray-500">
            {format === 'csv'
              ? 'Best for Excel, Google Sheets, or statistical analysis tools'
              : 'Best for programmatic processing or data migration'}
          </p>
        </div>

        {/* Date range */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Date Range
          </Label>
          <RadioGroup value={dateRange} onValueChange={(v) => setDateRange(v as 'week' | 'month' | 'all')}>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="week" id="week" />
                <Label htmlFor="week" className="cursor-pointer">Last Week</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="month" id="month" />
                <Label htmlFor="month" className="cursor-pointer">Last Month</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="cursor-pointer">All Time</Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Data to include */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Include Data</Label>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mastery"
                checked={includeSkillMastery}
                onCheckedChange={(c) => setIncludeSkillMastery(!!c)}
              />
              <Label htmlFor="mastery" className="cursor-pointer">
                <span className="font-normal">Skill Mastery Data</span>
                <span className="text-xs text-gray-500 ml-2">
                  P(mastery), scaffold levels, BKT parameters
                </span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="interactions"
                checked={includeInteractions}
                onCheckedChange={(c) => setIncludeInteractions(!!c)}
              />
              <Label htmlFor="interactions" className="cursor-pointer">
                <span className="font-normal">Interaction History</span>
                <span className="text-xs text-gray-500 ml-2">
                  Practice attempts, hint usage, timing
                </span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="assessments"
                checked={includeAssessments}
                onCheckedChange={(c) => setIncludeAssessments(!!c)}
              />
              <Label htmlFor="assessments" className="cursor-pointer">
                <span className="font-normal">Assessment Results</span>
                <span className="text-xs text-gray-500 ml-2">
                  Test scores, question-level data
                </span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="metadata"
                checked={includeMetadata}
                onCheckedChange={(c) => setIncludeMetadata(!!c)}
              />
              <Label htmlFor="metadata" className="cursor-pointer">
                <span className="font-normal">Skill Metadata</span>
                <span className="text-xs text-gray-500 ml-2">
                  Names, Bloom levels, prerequisites
                </span>
              </Label>
            </div>
          </div>
        </div>

        {/* Privacy option */}
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="anonymize"
              checked={anonymize}
              onCheckedChange={(c) => setAnonymize(!!c)}
            />
            <Label htmlFor="anonymize" className="cursor-pointer flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span>Anonymize Data</span>
            </Label>
          </div>
          <p className="text-xs text-gray-500 ml-6">
            Replace student identifiers with anonymous IDs. Recommended for sharing or research.
          </p>
        </div>

        {/* Export button */}
        <Button
          onClick={handleExport}
          disabled={disabled || isExporting || (!includeSkillMastery && !includeInteractions && !includeAssessments)}
          className="w-full"
        >
          {isExporting ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export {format.toUpperCase()}
            </>
          )}
        </Button>

        {!includeSkillMastery && !includeInteractions && !includeAssessments && (
          <p className="text-xs text-red-500 text-center">
            Select at least one data type to export
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default ExportOptions
