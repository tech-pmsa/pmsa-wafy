'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface StudentAttendance {
  uid: string
  name: string
  class_id: string
  total_present: number
  total_days: number
}

const ClassAttendanceTabs = () => {
  const [attendanceData, setAttendanceData] = useState<StudentAttendance[]>([])
  const [classIds, setClassIds] = useState<string[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')

  useEffect(() => {
    const fetchData = async () => {
      const { data: summaryData } = await supabase
        .from('students_with_attendance')
        .select('uid, name, class_id, total_present, total_days')

      if (summaryData) {
        setAttendanceData(summaryData)
        const uniqueClassIds = Array.from(new Set(summaryData.map(s => s.class_id)))
        setClassIds(uniqueClassIds)
        if (uniqueClassIds.length > 0) setSelectedClass(uniqueClassIds[0])
      }
    }

    fetchData()
  }, [])

  if (classIds.length === 0) return <div className="p-4">No data available</div>

  return (
    <Tabs value={selectedClass} onValueChange={setSelectedClass} className="p-4 space-y-4">
      <TabsList className="flex flex-wrap gap-2">
        {classIds.map(classId => (
          <TabsTrigger key={classId} value={classId}>
            {classId}
          </TabsTrigger>
        ))}
      </TabsList>

      {classIds.map(classId => (
        <TabsContent key={classId} value={classId}>
          <Card className="p-4">
            <h2 className="text-lg font-bold mb-2">Attendance Summary - {classId}</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="p-2">Present / Days</th>
                  <th className="p-2">%</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData
                  .filter(s => s.class_id === classId)
                  .map(student => {
                    const percent = student.total_days === 0
                      ? 0
                      : (student.total_present / student.total_days) * 100

                    return (
                      <tr key={student.uid} className="border-b">
                        <td className="p-2">{student.name}</td>
                        <td className="p-2">{student.total_present} / {student.total_days}</td>
                        <td className="p-2 w-1/2">
                          <Progress value={percent} />
                          <span className="text-xs">{percent.toFixed(1)}%</span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  )
}

export default ClassAttendanceTabs
