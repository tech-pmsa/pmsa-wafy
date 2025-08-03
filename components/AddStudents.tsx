'use client'

import { useState } from 'react'

export default function AddStudents() {
  const [formData, setFormData] = useState({
    name: '',
    cic: '',
    class_id: '',
    council: '',
    batch: '',
    phone: '',
    guardian: '',
    g_phone: '',
    address: '',
    image: null as File | null,
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData({ ...formData, image: file })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const cic = formData.cic.trim().toLowerCase()
      const email = `${cic}@pmsa.com`
      const password = `${cic}@11`

      let img_url = ''
      if (formData.image) {
        const fileExt = formData.image.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const uploadRes = await fetch(`/api/upload-student-photo?file=${filePath}`, {
          method: 'POST',
          body: formData.image,
        })

        if (!uploadRes.ok) throw new Error('Image upload failed')
        const { url } = await uploadRes.json()
        img_url = url || '/profile.png'
      }

      const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: formData.name,
          cic,
          class_id: formData.class_id,
          council: formData.council,
          batch: formData.batch,
          phone: formData.phone,
          guardian: formData.guardian,
          g_phone: formData.g_phone,
          address: formData.address,
          img_url,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add student')

      setMessage('Student added successfully!')
      setFormData({
        name: '',
        cic: '',
        class_id: '',
        council: '',
        batch: '',
        phone: '',
        guardian: '',
        g_phone: '',
        address: '',
        image: null,
      })
    } catch (err: any) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white shadow-md rounded p-4 w-full mx-auto">
      <h2 className="text-xl font-semibold mb-4">Add New Student</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input required name="name" placeholder="Name" onChange={handleChange} value={formData.name} className="input" />
          <input required name="cic" placeholder="CIC (unique)" onChange={handleChange} value={formData.cic} className="input" />
          <input required name="class_id" placeholder="Class ID" onChange={handleChange} value={formData.class_id} className="input" />
          <input required name="council" placeholder="Council" onChange={handleChange} value={formData.council} className="input" />
          <input required name="batch" placeholder="Batch" onChange={handleChange} value={formData.batch} className="input" />
          <input required name="phone" placeholder="Phone" onChange={handleChange} value={formData.phone} className="input" />
          <input required name="guardian" placeholder="Guardian" onChange={handleChange} value={formData.guardian} className="input" />
          <input required name="g_phone" placeholder="Guardian Phone" onChange={handleChange} value={formData.g_phone} className="input" />
        </div>

        <textarea required name="address" placeholder="Address" onChange={handleChange} value={formData.address} className="textarea w-full" />
        <input required type="file" accept="image/*" onChange={handleImageChange} className="input w-full" />

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? 'Adding...' : 'Add Student'}
        </button>

        {message && <p className="text-sm text-gray-700 text-center">{message}</p>}
      </form>
    </div>
  )
}
