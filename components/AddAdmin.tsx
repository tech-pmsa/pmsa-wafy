'use client'

import { useState } from 'react'

export default function AddAdmin() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    designation: '',
    role: 'officer', // or class/class-leader if allowed
  })

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    const username = formData.email.split('@')[0]
    const password = `pmsa-${username}`

    const response = await fetch('/api/create-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, password }),
    })

    const result = await response.json()

    if (response.ok) {
      setMessage('Admin added successfully!')
      setFormData({ name: '', email: '', designation: '', role: 'officer' })
    } else {
      setMessage(result.error || 'Failed to add admin.')
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow space-y-4">
      <h2 className="text-xl font-bold">Add New Admin</h2>
      <input name="name" placeholder="Name" required value={formData.name} onChange={handleChange} className="input" />
      <input name="email" placeholder="Email" type="email" required value={formData.email} onChange={handleChange} className="input" />
      <input name="designation" placeholder="Designation" required value={formData.designation} onChange={handleChange} className="input" />
      <select name="role" required value={formData.role} onChange={handleChange} className="input">
        <option value="officer">Officer</option>
        <option value="class">Class</option>
        <option value="class-leader">Class Leader</option>
      </select>

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Creating...' : 'Add Admin'}
      </button>

      {message && <p className="text-sm text-gray-700">{message}</p>}
    </form>
  )
}
