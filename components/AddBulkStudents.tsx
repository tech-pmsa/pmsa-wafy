'use client'

import { useState } from 'react'

export default function AddBulkStudents() {
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setZipFile(file)
  }

  const handleUpload = async () => {
    if (!zipFile) {
      setMessage('Please select a ZIP file.')
      return
    }

    setLoading(true)
    setMessage('Uploading...')

    const formData = new FormData()
    formData.append('zip', zipFile)

    try {
      const res = await fetch('/api/bulk-upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setMessage('Upload successful!')
    } catch (err: any) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white rounded shadow max-w-lg">
      <h2 className="text-xl font-bold mb-4">Bulk Upload Students</h2>
      <input type="file" accept=".zip" onChange={handleZipChange} className="input mb-4" />
      <button onClick={handleUpload} className="btn btn-primary" disabled={loading}>
        {loading ? 'Uploading...' : 'Upload ZIP'}
      </button>
      {message && <p className="mt-4 text-sm">{message}</p>}
    </div>
  )
}
