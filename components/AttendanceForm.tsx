// components/AttendanceForm.tsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { format } from 'date-fns'

// Shadcn/UI & Icon Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { CalendarIcon, Check, X, UserCheck, UserX, Lock, Loader2 } from 'lucide-react'

// Type Definitions
interface Student {
  uid: string
  name: string
  class_id: string
}

interface PeriodStatus {
  [key: string]: boolean
}

const periods = Array.from({ length: 8 }, (_, i) => `period_${i + 1}`);

// Main Component
export default function AttendanceForm() {
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<{ [uid: string]: PeriodStatus }>({})
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isLocked, setIsLocked] = useState(false)
  const [dayType, setDayType] = useState<'none' | 'leave' | 'event'>('none')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [classId, setClassId] = useState('')

  // Initial data fetch for the class teacher
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase.from('profiles').select('designation').eq('uid', user.id).single()
      if (!profile) { setLoading(false); return; }

      const currentClassId = profile.designation
      setClassId(currentClassId)

      const { data: studentsData } = await supabase.from('students').select('uid, name, class_id').eq('class_id', currentClassId)

      if (studentsData) {
        setStudents(studentsData)
        // Initialize attendance state for all students as present
        const initialAttendance: { [uid: string]: PeriodStatus } = {}
        studentsData.forEach((s) => {
          initialAttendance[s.uid] = periods.reduce((acc, period) => ({ ...acc, [period]: true }), {})
        })
        setAttendance(initialAttendance)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  // Check lock status when date or students change
  useEffect(() => {
    const checkLockedStatus = async () => {
      if (!selectedDate || students.length === 0) return

      const date = format(selectedDate, 'yyyy-MM-dd')
      const studentUids = students.map((s) => s.uid)

      const { data, error } = await supabase
        .from('attendance')
        .select('student_uid, status_locked')
        .in('student_uid', studentUids)
        .eq('date', date)

      if (error) {
        console.error('Error checking lock status:', error)
        return
      }
      // If any entry for that date exists and is locked, lock the form
      const isAnyLocked = data?.some((entry) => entry.status_locked) || false
      setIsLocked(isAnyLocked)
    }
    checkLockedStatus()
  }, [selectedDate, students])

  // Memoized summary of attendance
  const attendanceSummary = useMemo(() => {
    const presentCount = students.filter(student => {
      const studentAttendance = attendance[student.uid]
      return studentAttendance && Object.values(studentAttendance).some(Boolean)
    }).length
    return {
      present: presentCount,
      absent: students.length - presentCount,
    }
  }, [attendance, students])

  const togglePeriod = (uid: string, period: string) => {
    if (isLocked || dayType !== 'none') return
    setAttendance(prev => ({
      ...prev,
      [uid]: { ...prev[uid], [period]: !prev[uid][period] },
    }))
  }

  const markAll = (uid: string, isPresent: boolean) => {
    if (isLocked || dayType !== 'none') return
    const newStatus: PeriodStatus = periods.reduce((acc, period) => ({ ...acc, [period]: isPresent }), {})
    setAttendance(prev => ({ ...prev, [uid]: newStatus }))
  }

  const submitAttendance = async () => {
    setSubmitting(true)
    const date = format(selectedDate, 'yyyy-MM-dd')
    const updates = students.map(student => ({
      student_uid: student.uid,
      date,
      ...attendance[student.uid],
      is_holiday: dayType,
      status_locked: true,
    }))

    const { error } = await supabase.from("attendance").upsert(updates, {
      onConflict: "student_uid,date",
    })

    if (!error) {
      setIsLocked(true)
    } else {
      alert('Failed to submit attendance. Please try again.')
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
        <div className="p-4 md:p-6 space-y-4">
            <Skeleton className="h-24 w-full" />
            <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
        </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mark Attendance</CardTitle>
          <CardDescription>Select a date and mark the attendance for your class: {classId}</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Select Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} disabled={(date) => date > new Date()} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Day Type</Label>
            <Select value={dayType} onValueChange={(value) => setDayType(value as any)} disabled={isLocked}>
              <SelectTrigger>
                <SelectValue placeholder="Select day type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Working Day</SelectItem>
                <SelectItem value="leave">Holiday</SelectItem>
                <SelectItem value="event">Event / Function</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:col-span-2 md:col-span-1">
             <div className="flex items-center justify-center p-4 bg-green-50 rounded-lg">
                <div className="text-center">
                    <UserCheck className="h-6 w-6 mx-auto text-green-600"/>
                    <p className="text-2xl font-bold text-green-700">{attendanceSummary.present}</p>
                    <p className="text-xs font-medium text-green-600">Present</p>
                </div>
             </div>
             <div className="flex items-center justify-center p-4 bg-red-50 rounded-lg">
                <div className="text-center">
                    <UserX className="h-6 w-6 mx-auto text-red-600"/>
                    <p className="text-2xl font-bold text-red-700">{attendanceSummary.absent}</p>
                    <p className="text-xs font-medium text-red-600">Absent</p>
                </div>
             </div>
          </div>
        </CardContent>
      </Card>

      {isLocked && (
        <Alert variant="default" className="border-blue-500 text-blue-800">
            <Lock className="h-4 w-4 text-blue-500"/>
            <AlertTitle>Attendance Submitted</AlertTitle>
            <AlertDescription>Attendance for this date has already been submitted and is now locked.</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {students.map(student => (
          <Card key={student.uid} className={`transition-opacity ${isLocked || dayType !== 'none' ? 'opacity-60' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between p-4">
              <h3 className="font-semibold">{student.name}</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => markAll(student.uid, true)} disabled={isLocked || dayType !== 'none'}>
                  <Check className="h-4 w-4 mr-1"/> All Present
                </Button>
                <Button variant="outline" size="sm" onClick={() => markAll(student.uid, false)} disabled={isLocked || dayType !== 'none'}>
                  <X className="h-4 w-4 mr-1"/> All Absent
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {periods.map((period, i) => (
                  <Button
                    key={period}
                    variant={attendance[student.uid]?.[period] ? 'default' : 'secondary'}
                    className={`h-10 w-full text-xs ${attendance[student.uid]?.[period] ? 'bg-green-600 hover:bg-green-700' : ''}`}
                    onClick={() => togglePeriod(student.uid, period)}
                    disabled={isLocked || dayType !== 'none'}
                  >
                    P{i + 1}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end mt-6">
        <Button size="lg" onClick={submitAttendance} disabled={isLocked || submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLocked ? 'Already Submitted' : submitting ? 'Submitting...' : 'Submit Final Attendance'}
        </Button>
      </div>
    </div>
  )
}