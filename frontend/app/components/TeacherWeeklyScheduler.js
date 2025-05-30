// frontend/app/components/TeacherWeeklyScheduler.js
"use client";

import { useState, useEffect } from "react";

const WEEKDAYS = [
  { label: "Lunes",     value: 1 },
  { label: "Martes",    value: 2 },
  { label: "Miércoles", value: 3 },
  { label: "Jueves",    value: 4 },
  { label: "Viernes",   value: 5 },
  { label: "Sábado",    value: 6 },
  { label: "Domingo",   value: 0 },
];

export default function TeacherWeeklyScheduler({ userId }) {
  const [slots, setSlots]     = useState([]);
  const [editing, setEditing] = useState({});
  const hourOptions   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minuteOptions = ["00", "30"];

  // 1) Carga inicial
  useEffect(() => {
    fetch(`/api/availability/weekly?teacherId=${userId}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots || []))
      .catch(console.error);
  }, [userId]);

  // Actualiza el estado de edición
  const handleChange = (weekday, field, value) => {
    setEditing((prev) => ({
      ...prev,
      [weekday]: {
        ...prev[weekday],
        [field]: value,
      },
    }));
  };

  // 2) Añade una franja
  const addSlot = async (weekday) => {
    const e = editing[weekday] || {};
    const { startHour, startMin, endHour, endMin } = e;
    if (!startHour || !startMin || !endHour || !endMin) {
      return alert("Selecciona hora y minutos de inicio y fin");
    }
    const start = `${startHour}:${startMin}`;
    const end   = `${endHour}:${endMin}`;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/availability/weekly", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          weekday,
          start_time: `${start}:00`,
          end_time:   `${end}:00`,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Error creando franja semanal");
      setSlots((s) => [...s, payload.slot]);
      // resetea selects
      setEditing((prev) => ({
        ...prev,
        [weekday]: { startHour: "", startMin: "", endHour: "", endMin: "" },
      }));
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // 3) Borra una franja
  const deleteSlot = async (id) => {
    if (!confirm("¿Eliminar esta franja semanal?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/availability/weekly/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Error eliminando franja semanal");
      setSlots((s) => s.filter((slot) => slot.id !== id));
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow space-y-6">
      {WEEKDAYS.map(({ label, value }) => {
        const e = editing[value] || {};
        return (
          <section key={value}>
            <h3 className="font-semibold mb-2">{label}</h3>
            <div className="flex items-center gap-2 mb-2">
              {/* Select hora/min inicio */}
              <select
                value={e.startHour || ""}
                onChange={(ev) => handleChange(value, "startHour", ev.target.value)}
                className="border p-1 rounded"
              >
                <option value="">HH</option>
                {hourOptions.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <span>:</span>
              <select
                value={e.startMin || ""}
                onChange={(ev) => handleChange(value, "startMin", ev.target.value)}
                className="border p-1 rounded"
              >
                <option value="">MM</option>
                {minuteOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <span className="mx-1">—</span>

              {/* Select hora/min fin */}
              <select
                value={e.endHour || ""}
                onChange={(ev) => handleChange(value, "endHour", ev.target.value)}
                className="border p-1 rounded"
              >
                <option value="">HH</option>
                {hourOptions.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <span>:</span>
              <select
                value={e.endMin || ""}
                onChange={(ev) => handleChange(value, "endMin", ev.target.value)}
                className="border p-1 rounded"
              >
                <option value="">MM</option>
                {minuteOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <button
                onClick={() => addSlot(value)}
                className="ml-2 bg-green-600 text-white px-3 py-1 rounded"
              >
                Añadir
              </button>
            </div>

            <ul className="ml-4 space-y-1">
              {slots
                .filter((s) => s.weekday === value)
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                .map((s) => (
                  <li key={s.id} className="flex justify-between items-center">
                    <span>
                      {s.start_time.slice(0, 5)} — {s.end_time.slice(0, 5)}
                    </span>
                    <button
                      onClick={() => deleteSlot(s.id)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}