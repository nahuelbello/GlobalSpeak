// frontend/app/components/StudentSlotPicker.js
"use client";

import { useState, useEffect } from "react";

// Devuelve el lunes de la semana actual + offset semanas
function getWeekStart(offsetWeeks = 0) {
  const now = new Date();
  const day = now.getDay();
  // convertimos domingo=0→6, lunes=1→0, martes=2→1, ..., sábado=6→5
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday + offsetWeeks * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Genera array de 7 días a partir de un lunes dado
function getWeekDays(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

// Formatea "mié, 28 may"
function formatDay(d) {
  return d.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Formatea hora "14:00"
function formatTime(dt) {
  return new Date(dt).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StudentSlotPicker({ teacherId, onBooked }) {
  const [rules, setRules]             = useState([]);    // patrones semanales
  const [weekOffset, setWeekOffset]   = useState(0);     // 0=this week, +1 next week...
  const [selectedDay, setSelectedDay] = useState(null);  // Date de día clicado
  const [hourSlots, setHourSlots]     = useState([]);    // slots de 1h para selectedDay
  const [loading, setLoading]         = useState(true);
  const [booking, setBooking]         = useState(false);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const alumnoId =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "null")?.id
      : null;

  // 1) Carga los patrones semanales del profesor
  useEffect(() => {
    setLoading(true);
    fetch(`/api/availability/weekly?teacherId=${teacherId}`)
      .then(res => {
        if (!res.ok) throw new Error("Error cargando disponibilidad");
        return res.json();
      })
      .then(({ slots }) => setRules(slots || []))
      .catch(err => {
        console.error(err);
        alert(err.message);
      })
      .finally(() => setLoading(false));
  }, [teacherId]);

  // 2) Cada vez que cambie selectedDay, genero sus slots de 1h
  useEffect(() => {
    if (!selectedDay) {
      setHourSlots([]);
      return;
    }
    const day = new Date(selectedDay);
    const weekday = day.getDay();
    const now = Date.now();
    const slots = [];

    rules
      .filter(r => r.weekday === weekday)
      .forEach(r => {
        const [h1, m1] = r.start_time.split(":").map(Number);
        const [h2, m2] = r.end_time.split(":").map(Number);
        const start = new Date(day);
        start.setHours(h1, m1, 0, 0);
        const finish = new Date(day);
        finish.setHours(h2, m2, 0, 0);

        let cur = new Date(start);
        while (cur.getTime() + 3600_000 <= finish.getTime()) {
          if (cur.getTime() > now) {
            slots.push({
              start_time: cur.toISOString(),
              end_time:   new Date(cur.getTime() + 3600_000).toISOString(),
            });
          }
          cur = new Date(cur.getTime() + 3600_000);
        }
      });

    setHourSlots(slots);
  }, [selectedDay, rules]);

  // 3) Reseteo la selección de día al navegar de semana
  useEffect(() => {
    setSelectedDay(null);
  }, [weekOffset]);

  // 4) Manejador de reserva
  const handleBook = async (slot) => {
    if (!token || !alumnoId) {
      return alert("Debes iniciar sesión para reservar.");
    }
    if (
      !confirm(
        `¿Reservar clase el ${new Date(slot.start_time).toLocaleDateString("es-ES", {
          dateStyle: "full",
        })} de ${formatTime(slot.start_time)} a ${formatTime(slot.end_time)}?`
      )
    ) return;

    setBooking(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          alumno_id: alumnoId,
          profesor_id: teacherId,
          start_time: slot.start_time,
          end_time:   slot.end_time,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Error al reservar clase");
      alert("¡Clase reservada con éxito!");
      onBooked?.();
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <p>Cargando disponibilidad…</p>;

  // 5) Construyo array de 7 días para la semana current + offset
  const monday = getWeekStart(weekOffset);
  const days = getWeekDays(monday);

  return (
    <div className="bg-white p-4 rounded shadow space-y-4">
      {/* Navegación de semanas */}
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={() => setWeekOffset(w => Math.max(0, w - 1))}
          disabled={weekOffset === 0}
          className="px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-30"
        >
          ←
        </button>
        <span className="font-medium">
          Semana de{" "}
          {monday.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
        </span>
        <button
          onClick={() => setWeekOffset(w => w + 1)}
          className="px-2 py-1 rounded hover:bg-gray-200"
        >
          →
        </button>
      </div>

      {/* Selector de día */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {days.map(d => {
          const isActive = rules.some(r => r.weekday === d.getDay());
          const isSelected =
            selectedDay &&
            new Date(selectedDay).toDateString() === d.toDateString();
          return (
            <button
              key={d.toISOString()}
              onClick={() => isActive && setSelectedDay(d)}
              disabled={!isActive}
              className={`
                p-2 text-xs text-center rounded
                ${isActive ? "cursor-pointer" : "opacity-30"}
                ${isSelected
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200"}
              `}
            >
              {formatDay(d)}
            </button>
          );
        })}
      </div>

      {/* Franjas del día */}
      {selectedDay ? (
        hourSlots.length === 0 ? (
          <p className="text-gray-600">No hay franjas disponibles este día.</p>
        ) : (
          <ul className="space-y-2">
            {hourSlots.map((slot, i) => (
              <li
                key={`${slot.start_time}-${i}`}
                className="flex justify-between items-center"
              >
                <span>
                  {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                </span>
                <button
                  onClick={() => handleBook(slot)}
                  disabled={booking}
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Reservar
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <p className="text-gray-600">Selecciona un día para ver franjas.</p>
      )}
    </div>
  );
}