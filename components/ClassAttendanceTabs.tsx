'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// ✅ ShadCN components imported from individual files
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface StudentAttendance {
  uid: string
  name: string
  class_id: string
  total_present: number
  total_days: number
}

const COLORS = ['#10b981', '#3b82f6', '#6366f1', '#f59e0b', '#ef4444']

export default function ClassAttendanceDashboard() {
  const [attendanceData, setAttendanceData] = useState<StudentAttendance[]>([])
  const [classIds, setClassIds] = useState<string[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [showDetails, setShowDetails] = useState<boolean>(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('students_with_attendance')
        .select('uid, name, class_id, total_present, total_days')

      if (data) {
        setAttendanceData(data)
        const uniqueClasses = [...new Set(data.map(d => d.class_id))]
        setClassIds(uniqueClasses)
        setSelectedClass(uniqueClasses[0] || '')
      }
    }

    fetchData()
  }, [])

  const currentClassData = attendanceData
    .filter(s => s.class_id === selectedClass)
    .map(s => ({
      name: s.name,
      percent: s.total_days ? (s.total_present / s.total_days) * 100 : 0,
      total: `${s.total_present} / ${s.total_days}`
    }))

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <Button variant="outline" onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? 'Chart View' : 'Details'}
        </Button>

        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-[160px]">
            {selectedClass || 'Select Class'}
          </SelectTrigger>
          <SelectContent>
            {classIds.map(classId => (
              <SelectItem key={classId} value={classId}>
                {classId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="p-4">
        {showDetails ? (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Present / Days</th>
                  <th className="text-left p-2">%</th>
                </tr>
              </thead>
              <tbody>
                {currentClassData.map((student, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">{student.name}</td>
                    <td className="p-2">{student.total}</td>
                    <td className="p-2">{student.percent.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={currentClassData} margin={{ top: 16, right: 32, left: 8, bottom: 32 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="percent" radius={[6, 6, 0, 0]}>
                {currentClassData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  )
}
