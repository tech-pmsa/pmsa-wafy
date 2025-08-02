'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabaseClient'

type Student = {
  uid: string
  name: string
  class_id: string
  batch: string
  council: string
  total_present: number
  total_days: number
}

const getBarColor = (percentage: number): string => {
  if (percentage >= 75) return 'bg-green-500'
  if (percentage >= 50) return 'bg-yellow-400'
  return 'bg-red-500'
}

const ClassStudentPresent = () => {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Class Attendance Summary</h2>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <p>No students found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {students.map((student) => {
            const { total_present, total_days } = student
            const percentage = total_days === 0 ? 0 : (total_present / total_days) * 100
            const colorClass = getBarColor(percentage)

            return (
              <Card key={student.uid} className="p-4">
                <CardContent>
                  <h3 className="text-lg font-semibold">{student.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Batch: {student.batch} | Council: {student.council}
                  </p>
                  <p className="mt-2 text-sm">
                    Attendance: {total_present.toFixed(1)} / {total_days} ({percentage.toFixed(0)}%)
                  </p>
                  <div className="mt-2 w-full h-3 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full ${colorClass}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ClassStudentPresent
