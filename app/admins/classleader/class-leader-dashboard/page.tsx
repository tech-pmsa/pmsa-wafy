
import AttendanceForm from '@/components/AttendanceForm'
import FeeTable from '@/components/FeeTable'

const Leader = () => {
  return (
    <div className="max-w-7xl mx-auto mt-6">
      <h1 className="text-2xl font-bold mb-4">Class Attendance Panel</h1>
      <AttendanceForm />
      <FeeTable role='class-leader'/>
    </div>
  )
}

export default Leader
