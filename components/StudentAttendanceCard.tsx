'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'

const StudentAttendanceCard = () => {
  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState<{
    name: string
    class_id: string
    total_present: number
    total_days: number
  } | null>(null)

  useEffect(() => {
    const fetchStudent = async () => {
      setLoading(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (!user || userError) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('students_with_attendance')
        .select('name, class_id, total_present, total_days')
        .eq('uid', user.id)
        .single()

      if (!error && data) {
        setStudent({
          name: data.name,
          class_id: data.class_id,
          total_present: parseFloat(data.total_present),
          total_days: parseInt(data.total_days),
        })
      }

      setLoading(false)
    }

    fetchStudent()
  }, [])

  if (loading) {
    return <Skeleton className="h-36 w-full rounded-xl" />
  }

  if (!student) {
    return <p>No attendance record found.</p>
  }

  const percent =
    student.total_days === 0
      ? 0
      : (student.total_present / student.total_days) * 100

  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-6 space-y-2">
        <h2 className="text-xl font-semibold">{student.name}</h2>
        <p className="text-muted-foreground">Class: {student.class_id}</p>
        <div className="text-sm">
          Attendance: {student.total_present} / {student.total_days}
        </div>
        <Progress value={percent} />
        <p className="text-xs text-muted-foreground">
          {percent.toFixed(1)}% attendance
        </p>
      </CardContent>
    </Card>
  )
}

export default StudentAttendanceCard
