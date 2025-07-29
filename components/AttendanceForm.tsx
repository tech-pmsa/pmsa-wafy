// components/AttendanceForm.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CalendarIcon } from 'lucide-react'

interface Student {
  uid: string
  name: string
  class_id: string
}

interface PeriodStatus {
  [key: string]: boolean
}

function formatDate(date: Date | undefined) {
  if (!date) return ''
  return date.toLocaleDateString('en-GB') // dd/mm/yyyy
}

function isValidDate(date: Date | undefined) {
  return !!date && !isNaN(date.getTime())
}

const AttendanceForm = () => {
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<{ [uid: string]: PeriodStatus }>({})
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [month, setMonth] = useState<Date | undefined>(new Date())
  const [value, setValue] = useState(formatDate(new Date()))
  const [isLocked, setIsLocked] = useState(false)
  const [holidayType, setHolidayType] = useState<'none' | 'leave' | 'event'>('none')
  const [loading, setLoading] = useState(true)
  const [classId, setClassId] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('uid', user?.id)
        .single()

      const { data: students } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', profile.designation)

      const initialAttendance: any = {}
      students?.forEach((s: any) => {
        initialAttendance[s.uid] = {
          period_1: true,
          period_2: true,
          period_3: true,
          period_4: true,
          period_5: true,
          period_6: true,
          period_7: true,
          period_8: true,
        }
      })

      setClassId(profile.designation)
      setStudents(students || [])
      setAttendance(initialAttendance)
      setLoading(false)
    }
    fetchData()
  }, [])

  useEffect(() => {
    const checkLockedStatus = async () => {
      if (!selectedDate) return
      const date = format(selectedDate, 'yyyy-MM-dd')

      const { data, error } = await supabase
        .from('attendance')
        .select('status_locked')
        .eq('date', date)
        .limit(1)

      if (error) {
        console.error('Error checking lock status:', error)
        return
      }

      setIsLocked(data?.[0]?.status_locked || false)
    }

    checkLockedStatus()
  }, [selectedDate])

  const togglePeriod = (uid: string, period: string) => {
    if (isLocked || holidayType !== 'none') return
    setAttendance(prev => ({
      ...prev,
      [uid]: {
        ...prev[uid],
        [period]: !prev[uid][period],
      },
    }))
  }

  const toggleAll = (uid: string) => {
    if (isLocked || holidayType !== 'none') return
    const allPresent = Object.values(attendance[uid]).every(v => v)
    const newStatus: PeriodStatus = {}
    for (let i = 1; i <= 8; i++) {
      newStatus[`period_${i}`] = !allPresent
    }
    setAttendance(prev => ({ ...prev, [uid]: newStatus }))
  }

  const submitAttendance = async () => {
    const date = format(selectedDate!, 'yyyy-MM-dd')
    const updates = []

    for (const uid of Object.keys(attendance)) {
      const periods = attendance[uid]

      updates.push({
        student_uid: uid,
        date,
        ...periods,
        is_holiday: holidayType,
        status_locked: true,
      })
    }

    const { error } = await supabase.from("attendance").upsert(updates, {
      onConflict: "student_uid,date",
    })

    if (!error) setIsLocked(true)
    else alert('Failed to submit attendance')
  }

  if (loading) return <div className="p-4">Loading...</div>

  return (
    <div className="p-4 space-y-6">
      <Card className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-4 items-end">
            <div className="relative">
              <Label htmlFor="date" className="px-1">Select Date</Label>
              <div className="relative flex gap-2">
                <Input
                  id="date"
                  value={value}
                  placeholder="dd/mm/yyyy"
                  className="bg-background pr-10"
                  onChange={(e) => {
                    const date = new Date(e.target.value)
                    setValue(e.target.value)
                    if (isValidDate(date)) {
                      setSelectedDate(date)
                      setMonth(date)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                    }
                  }}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-[200px] justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date)
                        setValue(formatDate(date))
                      }}
                      disabled={(date) => date > new Date()} // ⛔ disables future dates
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

              </div>
            </div>

            <div className="flex flex-col">
              <Label className="px-1">Day Type</Label>
              <select
                value={holidayType}
                onChange={e => setHolidayType(e.target.value as any)}
                className="border rounded px-3 py-1"
              >
                <option value="none">Working Day</option>
                <option value="leave">Leave</option>
                <option value="event">Event</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4 overflow-x-auto">
        <h2 className="text-xl font-semibold mb-2">
          Mark Attendance of {classId} on {formatDate(selectedDate)}
        </h2>
        <table className="w-full text-sm border">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Student</th>
              {[...Array(8)].map((_, i) => (
                <th key={i} className="p-2">P{i + 1}</th>
              ))}
              <th className="p-2">Toggle</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s.uid} className="border-b">
                <td className="font-medium pr-4 p-2">{s.name}</td>
                {[...Array(8)].map((_, i) => {
                  const key = `period_${i + 1}`
                  return (
                    <td key={key} className="p-2">
                      <input
                        type="checkbox"
                        checked={attendance[s.uid]?.[key] || false}
                        onChange={() => togglePeriod(s.uid, key)}
                        disabled={isLocked || holidayType !== 'none'}
                      />
                    </td>
                  )
                })}
                <td className="p-2">
                  <Button variant="outline" size="sm" onClick={() => toggleAll(s.uid)} disabled={isLocked || holidayType !== 'none'}>
                    Toggle
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4">
          <Button onClick={submitAttendance} disabled={isLocked}>
            {isLocked ? 'Submitted' : 'Submit'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default AttendanceForm;
