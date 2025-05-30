'use client';

import { useState, useEffect } from 'react';
import DateTimeRangePicker from './DateTimeRangePicker';

export default function AvailabilityManager({ teacherId }) {
  const [slots, setSlots] = useState([]);
  const [startDt, setStartDt] = useState(''); // ISO strings
  const [endDt, setEndDt] = useState('');
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const loadSlots = async () => {
    try {
      const res = await fetch(`/api/availability?teacherId=${teacherId}`);
      if (!res.ok) throw new Error('Error al cargar disponibilidad');
      const { availability } = await res.json();
      setSlots(availability);
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  useEffect(() => {
    loadSlots();
  }, [teacherId]);

  const addSlot = async (e) => {
    e.preventDefault();
    if (!startDt || !endDt) return alert('Selecciona inicio y fin.');

    try {
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ start_time: startDt, end_time: endDt }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Error al crear franja');
      }
      setStartDt('');
      setEndDt('');
      loadSlots();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const deleteSlot = async (id) => {
    if (!confirm('¿Eliminar esta franja?')) return;
    try {
      const res = await fetch(`/api/availability/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Error al eliminar franja');
      }
      loadSlots();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const formatDt = (dt) =>
    new Date(dt).toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

  return (
    <div className="bg-white p-4 rounded shadow space-y-4">
      <form onSubmit={addSlot} className="space-y-2">
        <DateTimeRangePicker
          onChange={([start, end]) => {
            setStartDt(start.toISOString());
            setEndDt(end.toISOString());
          }}
        />
        <button
          type="submit"
          disabled={!startDt || !endDt}
          className="w-full bg-green-600 text-white py-2 rounded disabled:opacity-50"
        >
          Añadir franja
        </button>
      </form>

      <ul className="space-y-2">
        {slots.length === 0 ? (
          <li className="text-gray-600">Sin franjas</li>
        ) : (
          slots.map((slot) => (
            <li
              key={slot.id}
              className="flex justify-between items-center"
            >
              <span>
                {formatDt(slot.start_time)} — {formatDt(slot.end_time)}
              </span>
              <button
                onClick={() => deleteSlot(slot.id)}
                className="text-red-600 hover:underline"
              >
                Eliminar
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}