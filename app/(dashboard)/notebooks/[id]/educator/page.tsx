'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  AlertTriangle,
  BookOpen,
  Bell,
  BarChart3,
  RefreshCw,
  Download
} from 'lucide-react'
import { ClassProgress } from '@/components/educator/ClassProgress'
import { StruggleSpots } from '@/components/educator/StruggleSpots'
import { StudentList } from '@/components/educator/StudentList'
import { MisconceptionReport } from '@/components/educator/MisconceptionReport'
import { InterventionAlerts } from '@/components/educator/InterventionAlerts'
import { useCohortAnalytics } from '@/hooks/useLearningAnalytics'

export default function EducatorDashboardPage() {
  const params = useParams()
  const notebookId = params.id as string
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  const { cohort: cohortData, isLoading, refetch: refreshCohort } = useCohortAnalytics(notebookId)

  // Transform misconceptions data to match component expectations
  const misconceptions = cohortData?.commonMisconceptions?.map((m, i) => ({
    id: `misconception-${i}`,
    skillId: m.skillId,
    skillName: m.skillId, // Use skillId as the name - component can look up display name
    misconception: m.misconception,
    frequency: m.frequency,
    studentCount: m.studentCount,
  })) || []

  // Transform students needing help into intervention alerts
  const interventions = (cohortData?.studentsNeedingHelp || []).map((s, i) => ({
    id: `intervention-${i}`,
    type: 'at_risk' as const,
    priority: s.overallMastery < 0.3 ? 'urgent' as const : s.overallMastery < 0.5 ? 'high' as const : 'medium' as const,
    studentId: s.id,
    studentName: s.name || s.id,
    reason: `Student has ${(s.overallMastery * 100).toFixed(0)}% average mastery with ${s.struggleAreas.length} struggle areas.`,
    recommendation: s.needsIntervention ? 'Schedule intervention session' : 'Monitor progress',
    metrics: [
      { label: 'Mastery', value: `${(s.overallMastery * 100).toFixed(0)}%` },
      { label: 'Mastered', value: `${s.masteredCount} skills` },
      { label: 'Struggle Areas', value: `${s.struggleAreas.length}` },
    ],
    createdAt: s.lastActiveAt ? new Date(s.lastActiveAt) : new Date(),
  }))

  const urgentCount = interventions.filter(i => i.priority === 'urgent').length

  // Transform struggle spots to match component expectations
  const struggleSpots = cohortData?.commonStruggleSpots?.map(s => ({
    skillId: s.skillId,
    skillName: s.skillName,
    averageMastery: s.averageMastery,
    attemptCount: 0, // Not available in the type
    studentCount: s.studentCount,
    commonErrors: [] as string[],
  })) || []

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Educator Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            Monitor class progress and identify students needing support
          </p>
        </div>
        <div className="flex items-center gap-2">
          {urgentCount > 0 && (
            <Badge className="bg-red-500 text-white animate-pulse">
              {urgentCount} urgent alerts
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshCohort()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {cohortData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <QuickStat
            icon={<Users className="h-5 w-5 text-blue-500" />}
            label="Total Students"
            value={cohortData.studentCount.toString()}
            sublabel="Active learners"
          />
          <QuickStat
            icon={<BarChart3 className="h-5 w-5 text-green-500" />}
            label="Class Mastery"
            value={`${(cohortData.averageMastery * 100).toFixed(0)}%`}
            sublabel="Average mastery"
          />
          <QuickStat
            icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
            label="Need Help"
            value={cohortData.studentsNeedingHelp.length.toString()}
            sublabel="Students need support"
            alert={cohortData.studentsNeedingHelp.length > 0}
          />
          <QuickStat
            icon={<BookOpen className="h-5 w-5 text-purple-500" />}
            label="Struggle Spots"
            value={cohortData.commonStruggleSpots.length.toString()}
            sublabel="Skills need attention"
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Students
          </TabsTrigger>
          <TabsTrigger value="struggles" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Struggle Spots
          </TabsTrigger>
          <TabsTrigger value="misconceptions" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Misconceptions
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2 relative">
            <Bell className="h-4 w-4" />
            Alerts
            {urgentCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {urgentCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          {cohortData ? (
            <div className="grid md:grid-cols-2 gap-6">
              <ClassProgress data={cohortData} showDetails={true} />
              <div className="space-y-6">
                <StruggleSpots
                  skills={struggleSpots}
                  totalStudents={cohortData.studentCount}
                  showRecommendations={false}
                />
              </div>
            </div>
          ) : isLoading ? (
            <LoadingState />
          ) : (
            <EmptyState message="No class data available yet. Students need to start learning to see analytics." />
          )}
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students">
          {cohortData ? (
            <StudentList
              students={cohortData.classProgress}
              onSelectStudent={setSelectedStudentId}
              showDetails={true}
            />
          ) : isLoading ? (
            <LoadingState />
          ) : (
            <EmptyState message="No student data available." />
          )}
        </TabsContent>

        {/* Struggle Spots Tab */}
        <TabsContent value="struggles">
          {cohortData ? (
            <StruggleSpots
              skills={struggleSpots}
              totalStudents={cohortData.studentCount}
              showRecommendations={true}
            />
          ) : isLoading ? (
            <LoadingState />
          ) : (
            <EmptyState message="No struggle spot data available." />
          )}
        </TabsContent>

        {/* Misconceptions Tab */}
        <TabsContent value="misconceptions">
          {cohortData ? (
            <MisconceptionReport
              misconceptions={misconceptions}
              totalStudents={cohortData.studentCount}
              showInterventions={true}
            />
          ) : isLoading ? (
            <LoadingState />
          ) : (
            <EmptyState message="No misconception data available." />
          )}
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <InterventionAlerts
            interventions={interventions}
            onAcknowledge={(id) => console.log('Acknowledged:', id)}
            onViewStudent={(studentId) => {
              setSelectedStudentId(studentId)
              setActiveTab('students')
            }}
            showAcknowledged={false}
          />
        </TabsContent>
      </Tabs>

      {/* Educator Tips */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Educator Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Students needing help</strong> are identified based on low mastery, slow progress, or prolonged inactivity</li>
          <li>• <strong>Struggle spots</strong> show skills where multiple students are having difficulty</li>
          <li>• <strong>Misconceptions</strong> are detected from patterns in incorrect answers</li>
          <li>• Use the <strong>Export</strong> feature to generate reports for parent conferences or administration</li>
        </ul>
      </div>
    </div>
  )
}

function QuickStat({ icon, label, value, sublabel, alert }: {
  icon: React.ReactNode
  label: string
  value: string
  sublabel: string
  alert?: boolean
}) {
  return (
    <div className={`p-4 bg-white border rounded-lg ${alert ? 'border-orange-300 bg-orange-50' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{sublabel}</div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500">Loading class data...</p>
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center max-w-md">
        <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">{message}</p>
      </div>
    </div>
  )
}
