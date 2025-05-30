'use client';
import { useState, useEffect } from 'react';

export default function WindowPicker({ teacherId, onBooked }) {
  const [windows, setWindows] = useState([]);
  const [slots, setSlots] = useState([]);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const alumnoId = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user')).id : null;

  // 1) Carga ventanas
  useEffect(() => {
    fetch(`/api/windows?teacherId=${teacherId}`)
      .then(r=>r.json())
      .then(d=>setWindows(d.windows))
      .catch(console.error);
  }, [teacherId]);

  // 2) Genera próximos 7 días de slots
  useEffect(() => {
    if (!windows.length) return;
    const out = [];
    const now = new Date();
    for (let day=0; day<7; day++) {
      const date = new Date(now);
      date.setDate(now.getDate()+day);
      const wd = date.getDay();
      windows.filter(w=>w.weekday===wd).forEach(w=>{
        const [h1,m1] = w.start_time.split(':').map(Number);
        const [h2,m2] = w.end_time.split(':').map(Number);
        const start = new Date(date);
        start.setHours(h1,m1,0,0);
        const endLimit = new Date(date);
        endLimit.setHours(h2,m2,0,0);
        while (start < endLimit) {
          const end = new Date(start.getTime()+w.duration*60000);
          if (start > now) out.push({ start: new Date(start), end: new Date(end) });
          start.setTime(end.getTime());
        }
      });
    }
    // ordenar y truncar a 20
    out.sort((a,b)=>a.start-b.start);
    setSlots(out.slice(0,20));
  }, [windows]);

  // 3) reservar
  const book = async slot => {
    try {
      const res = await fetch('/api/bookings', {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          Authorization:`Bearer ${token}`
        },
        body: JSON.stringify({
          alumno_id: alumnoId,
          profesor_id: +teacherId,
          start_time: slot.start.toISOString(),
          end_time:   slot.end.toISOString()
        })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      alert('¡Clase reservada!');
      onBooked?.();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <ul className="space-y-2 bg-white p-4 rounded shadow">
      {slots.length===0 && <li className="text-gray-600">Sin clases próximos.</li>}
      {slots.map((s,i)=>(
        <li key={i} className="flex justify-between items-center">
          <span>
            {s.start.toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'})}
            {' '} {s.start.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}
            {' – '}
            {s.end.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}
          </span>
          <button
            onClick={()=>book(s)}
            className="bg-blue-600 text-white px-3 py-1 rounded"
          >
            Reservar
          </button>
        </li>
      ))}
    </ul>
  );
}