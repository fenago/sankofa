'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layout,
  Filter,
  Eye,
  EyeOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type LayoutType = 'dagre' | 'tree' | 'radial'
export type FilterType = 'all' | 'ready' | 'in_progress' | 'mastered' | 'locked'

interface PathControlsProps {
  layout: LayoutType
  onLayoutChange: (layout: LayoutType) => void
  filter: FilterType
  onFilterChange: (filter: FilterType) => void
  showLabels: boolean
  onShowLabelsChange: (show: boolean) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
  stats?: {
    total: number
    mastered: number
    inProgress: number
    ready: number
    locked: number
  }
  className?: string
}

export function PathControls({
  layout,
  onLayoutChange,
  filter,
  onFilterChange,
  showLabels,
  onShowLabelsChange,
  onZoomIn,
  onZoomOut,
  onFitView,
  stats,
  className,
}: PathControlsProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 p-3 bg-white/90 backdrop-blur-sm rounded-lg border shadow-sm',
        className
      )}
    >
      {/* Zoom Controls */}
      <div className="flex items-center gap-1 border-r pr-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
          className="h-8 w-8"
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomIn}
          className="h-8 w-8"
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onFitView}
          className="h-8 w-8"
          title="Fit to view"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Layout Selector */}
      <div className="flex items-center gap-2 border-r pr-3">
        <Layout className="h-4 w-4 text-muted-foreground" />
        <Select value={layout} onValueChange={(v) => onLayoutChange(v as LayoutType)}>
          <SelectTrigger className="w-[100px] h-8">
            <SelectValue placeholder="Layout" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dagre">Hierarchy</SelectItem>
            <SelectItem value="tree">Tree</SelectItem>
            <SelectItem value="radial">Radial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filter Selector */}
      <div className="flex items-center gap-2 border-r pr-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filter} onValueChange={(v) => onFilterChange(v as FilterType)}>
          <SelectTrigger className="w-[120px] h-8">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Skills</SelectItem>
            <SelectItem value="ready">Ready to Learn</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="mastered">Mastered</SelectItem>
            <SelectItem value="locked">Locked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Label Toggle */}
      <Button
        variant={showLabels ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onShowLabelsChange(!showLabels)}
        className="h-8"
      >
        {showLabels ? (
          <Eye className="h-4 w-4 mr-1" />
        ) : (
          <EyeOff className="h-4 w-4 mr-1" />
        )}
        Labels
      </Button>

      {/* Stats Badges */}
      {stats && (
        <div className="flex items-center gap-2 ml-auto">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            {stats.mastered} mastered
          </Badge>
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            {stats.inProgress} in progress
          </Badge>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {stats.ready} ready
          </Badge>
          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
            {stats.locked} locked
          </Badge>
        </div>
      )}
    </div>
  )
}
