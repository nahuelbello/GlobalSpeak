// frontend/app/components/UpcomingLessons.js
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function UpcomingLessons({ userId, role }) {
  const [bookings, setBookings] = useState([])
  const [now, setNow] = useState(new Date())

  // actualiza “now” cada minuto para el contador
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(iv)
  }, [])

  // carga reservas filtradas por alumno o profesor
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    const url =
      role === 'alumno'
        ? `/api/bookings?alumnoId=${userId}`
        : `/api/bookings?profesorId=${userId}`
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        const upcoming = (data.bookings || [])
          .filter(b => new Date(b.start_time) > now)
          .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
        setBookings(upcoming)
      })
      .catch(console.error)
  }, [userId, role, now])

  // formatea el tiempo restante
  function formatCountdown(startTime) {
    const diff = new Date(startTime) - now
    if (diff <= 0) return 'En curso'
    const mins = Math.floor(diff / 60_000) % 60
    const hrs = Math.floor(diff / 3_600_000) % 24
    const days = Math.floor(diff / 86_400_000)
    return `${days > 0 ? days + 'd ' : ''}${hrs > 0 ? hrs + 'h ' : ''}${mins}m`
  }

  return (
    <div className="space-y-4">
      {bookings.length === 0 ? (
        <p className="text-gray-600">No hay clases próximas.</p>
      ) : (
        <ul className="space-y-2">
          {bookings.map(b => (
            <li
              key={b.id}
              className="bg-white p-4 rounded shadow flex justify-between items-center"
            >
              <div>
                <p>
                  {role === 'alumno' ? (
                    <Link href={`/profile/${b.profesor_id}`}>
                      <a className="font-medium">{b.profesor_name}</a>
                    </Link>
                  ) : (
                    <Link href={`/profile/${b.alumno_id}`}>
                      <a className="font-medium">{b.alumno_name}</a>
                    </Link>
                  )}{' '}
                  el{' '}
                  {new Date(b.start_time).toLocaleString('es-ES', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </p>
                <p className="text-sm text-gray-500">
                  Falta: {formatCountdown(b.start_time)}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded ${
                  b.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {b.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}