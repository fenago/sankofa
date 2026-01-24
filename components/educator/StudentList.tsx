'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Users,
  Search,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import type { StudentProgress } from '@/lib/analytics/types'
import { formatPercentage } from '@/hooks/useLearningAnalytics'

interface StudentListProps {
  students: StudentProgress[]
  onSelectStudent?: (studentId: string) => void
  showDetails?: boolean
}

type SortField = 'name' | 'mastery' | 'progress' | 'lastActive'
type SortDirection = 'asc' | 'desc'

export function StudentList({
  students,
  onSelectStudent,
  showDetails = true
}: StudentListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('mastery')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const filteredAndSortedStudents = useMemo(() => {
    let filtered = students

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(s =>
        (s.name || s.id).toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query)
      )
    }

    // Sort
    return [...filtered].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = (a.name || a.id).localeCompare(b.name || b.id)
          break
        case 'mastery':
          comparison = a.overallMastery - b.overallMastery
          break
        case 'progress':
          const aTotal = a.masteredCount + a.inProgressCount + a.notStartedCount
          const bTotal = b.masteredCount + b.inProgressCount + b.notStartedCount
          const aProgress = aTotal > 0 ? a.masteredCount / aTotal : 0
          const bProgress = bTotal > 0 ? b.masteredCount / bTotal : 0
          comparison = aProgress - bProgress
          break
        case 'lastActive':
          const aTime = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0
          const bTime = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0
          comparison = aTime - bTime
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [students, searchQuery, sortField, sortDirection])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getStatusBadge = (student: StudentProgress) => {
    if (student.needsIntervention) {
      return (
        <Badge className="bg-red-100 text-red-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          At Risk
        </Badge>
      )
    }
    const totalSkills = student.masteredCount + student.inProgressCount + student.notStartedCount
    const progressPercent = totalSkills > 0 ? student.masteredCount / totalSkills : 0
    if (student.overallMastery >= 0.8 && progressPercent >= 0.8) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          On Track
        </Badge>
      )
    }
    return (
      <Badge className="bg-yellow-100 text-yellow-800">
        <Clock className="h-3 w-3 mr-1" />
        In Progress
      </Badge>
    )
  }

  const getDaysAgo = (date: Date | null) => {
    if (!date) return 'Never'
    const now = new Date()
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Yesterday'
    return `${diff} days ago`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Student Progress
            </CardTitle>
            <CardDescription>
              Individual student performance tracking
            </CardDescription>
          </div>
          <Badge variant="outline">
            {students.length} students
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and filters */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleSort('mastery')}
            className="flex items-center gap-1"
          >
            <ArrowUpDown className="h-3 w-3" />
            Sort
          </Button>
        </div>

        {/* Quick filters */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={sortField === 'mastery' && sortDirection === 'asc' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setSortField('mastery'); setSortDirection('asc') }}
          >
            Lowest Mastery
          </Button>
          <Button
            variant={sortField === 'lastActive' && sortDirection === 'desc' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setSortField('lastActive'); setSortDirection('desc') }}
          >
            Recently Active
          </Button>
        </div>

        {/* Student list */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredAndSortedStudents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No students found</p>
            </div>
          ) : (
            filteredAndSortedStudents.map((student) => {
              const totalSkills = student.masteredCount + student.inProgressCount + student.notStartedCount
              const progressPercent = totalSkills > 0 ? student.masteredCount / totalSkills : 0

              return (
                <div
                  key={student.id}
                  className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                    onSelectStudent ? 'cursor-pointer' : ''
                  } ${student.needsIntervention ? 'border-red-200 bg-red-50/50' : ''}`}
                  onClick={() => onSelectStudent?.(student.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{student.name || student.id}</h4>
                      <div className="text-xs text-gray-500">
                        Last active: {getDaysAgo(student.lastActiveAt)}
                      </div>
                    </div>
                    {getStatusBadge(student)}
                  </div>

                  {showDetails && (
                    <>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <div className="text-xs text-gray-500">Mastery</div>
                          <div className="font-medium">{formatPercentage(student.overallMastery)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Progress</div>
                          <div className="font-medium">{formatPercentage(progressPercent)}</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">Mastered Skills</span>
                            <span>{student.masteredCount}/{totalSkills}</span>
                          </div>
                          <Progress
                            value={(student.masteredCount / Math.max(1, totalSkills)) * 100}
                            className="h-2"
                          />
                        </div>
                      </div>

                      {student.struggleAreas.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs text-gray-500 mb-1">Struggling with:</div>
                          <div className="flex flex-wrap gap-1">
                            {student.struggleAreas.slice(0, 3).map((skillName, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {skillName}
                              </Badge>
                            ))}
                            {student.struggleAreas.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{student.struggleAreas.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default StudentList
