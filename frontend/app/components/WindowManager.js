// app/components/WindowManager.js
'use client'
import { useState, useEffect } from 'react'

export default function WindowManager({ teacherId }) {
  const [windows, setWindows] = useState([])
  const [weekday, setWeekday] = useState(1)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [duration, setDuration] = useState(60)
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  // carga y valida respuesta
  const load = async () => {
    try {
      const res = await fetch(`/api/windows?teacherId=${teacherId}`)
      if (!res.ok) {
        console.error('Error fetching windows:', res.status)
        setWindows([])
        return
      }
      const data = await res.json()
      // si viene mal formado, prevenimos crash
      if (!Array.isArray(data.windows)) {
        console.error('API /windows devolvió sin array:', data)
        setWindows([])
        return
      }
      setWindows(data.windows)
    } catch (err) {
      console.error('Network error loading windows:', err)
      setWindows([])
    }
  }

  useEffect(() => {
    if (teacherId) load()
  }, [teacherId])

  const add = async e => {
    e.preventDefault()
    try {
      const res = await fetch('/api/windows', {
        method: 'POST',
        headers: {
          'Content-Type':'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          weekday,
          start_time: startTime,
          end_time: endTime,
          duration,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error creating window')
      }
      // limpiamos formulario y recargamos
      setStartTime('')
      setEndTime('')
      setDuration(60)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  const remove = async id => {
    if (!confirm('¿Eliminar esta ventana?')) return
    try {
      const res = await fetch(`/api/windows/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error deleting window')
      }
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="bg-white p-4 rounded shadow space-y-4">
      <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <select
          value={weekday}
          onChange={e => setWeekday(+e.target.value)}
          className="border p-1 rounded"
        >
          <option value={0}>Domingo</option>
          <option value={1}>Lunes</option>
          <option value={2}>Martes</option>
          <option value={3}>Miércoles</option>
          <option value={4}>Jueves</option>
          <option value={5}>Viernes</option>
          <option value={6}>Sábado</option>
        </select>
        <input
          type="time"
          value={startTime}
          onChange={e => setStartTime(e.target.value)}
          className="border p-1 rounded"
          required
        />
        <input
          type="time"
          value={endTime}
          onChange={e => setEndTime(e.target.value)}
          className="border p-1 rounded"
          required
        />
        <select
          value={duration}
          onChange={e => setDuration(+e.target.value)}
          className="border p-1 rounded"
        >
          {[30, 45, 60, 90].map(d => (
            <option key={d} value={d}>
              {d} min
            </option>
          ))}
        </select>
        <button className="col-span-full bg-green-600 text-white py-1 rounded">
          Añadir ventana
        </button>
      </form>

      <ul className="space-y-2">
        {windows.length === 0 && (
          <li className="text-gray-600">Sin ventanas</li>
        )}
        {windows.map(w => (
          <li
            key={w.id}
            className="flex justify-between items-center"
          >
            <span>
              {
                ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][w.weekday]
              }{' '}
              {w.start_time.slice(0,5)}–{w.end_time.slice(0,5)} ({w.duration}m)
            </span>
            <button
              onClick={() => remove(w.id)}
              className="text-red-600 hover:underline"
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}