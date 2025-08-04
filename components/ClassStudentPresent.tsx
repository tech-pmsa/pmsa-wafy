'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const COLORS = ['#10b981', '#3b82f6', '#6366f1', '#f59e0b', '#ef4444']

interface Student {
  uid: string
  name: string
  class_id: string
  batch: string
  council: string
  total_present: number
  total_days: number
}

export default function ClassAttendanceChart() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (!user || userError) return setLoading(false)

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('designation, role')
        .eq('uid', user.id)
        .single()

      if (!profile || profile.role !== 'class') {
        console.error('Access denied or invalid role')
        return setLoading(false)
      }

      const classId = profile.designation.replace(' Class', '')

      const { data, error } = await supabase
        .from('students_with_attendance')
        .select('*')
        .eq('class_id', classId)

      if (error) {
        console.error('Error fetching students', error)
      } else {
        setStudents(data as Student[])
      }

      setLoading(false)
    }

    fetchStudents()
  }, [])

  const currentClassData = students.map((s) => ({
    name: s.name,
    percent: s.total_days ? (s.total_present / s.total_days) * 100 : 0,
    total: `${s.total_present} / ${s.total_days}`,
  }))

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Class Attendance Summary</h2>
        <Button variant="outline" onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? 'Chart View' : 'Details'}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <p>No students found.</p>
      ) : (
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
              <BarChart
                data={currentClassData}
                margin={{ top: 16, right: 32, left: 8, bottom: 32 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="percent" radius={[6, 6, 0, 0]}>
                  {currentClassData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      )}
    </div>
  )
}
