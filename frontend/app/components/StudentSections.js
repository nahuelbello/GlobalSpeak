"use client";
import { useState } from "react";
import {
  NATIONALITIES,
  STUDENT_INTERESTS,
  LEVELS,
} from "../data/predefinedFields";

export default function StudentSections({
  user,
  userId,
  isOwn,
  interests = [],
  level = "",
  nationality = "",
  token,
  refreshProfile,
}) {
  const [editingNat, setEditingNat] = useState(false);
  const [draftNat, setDraftNat] = useState(nationality || "");

  const [editingInterests, setEditingInterests] = useState(false);
  const [draftInterests, setDraftInterests] = useState(interests || []);

  const [editingLevel, setEditingLevel] = useState(false);
  const [draftLevel, setDraftLevel] = useState(level || "");

  // HANDLERS
  const saveNat = async () => {
    await fetch(`/api/users/${userId}/fields`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nationality: draftNat }),
    });
    setEditingNat(false);
    refreshProfile?.();
  };

  const saveInterests = async () => {
    await fetch(`/api/users/${userId}/fields`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ interests: draftInterests }),
    });
    setEditingInterests(false);
    refreshProfile?.();
  };

  const saveLevel = async () => {
    await fetch(`/api/users/${userId}/fields`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ level: draftLevel }),
    });
    setEditingLevel(false);
    refreshProfile?.();
  };

  const Chip = ({ children, onRemove }) => (
    <span className="inline-block bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs mr-2 mb-1">
      {children}
      {onRemove && (
        <button className="ml-1 text-red-600 font-bold" onClick={onRemove}>x</button>
      )}
    </span>
  );

  return (
    <>

      {/* Intereses */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Intereses / Objetivos</h2>
        {isOwn && editingInterests ? (
          <div>
            <div className="flex flex-wrap gap-1 mb-2">
              {draftInterests.map((interest, idx) => (
                <Chip
                  key={idx}
                  onRemove={() => setDraftInterests(draftInterests.filter((_, i) => i !== idx))}
                >
                  {interest}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {STUDENT_INTERESTS.filter(i => !draftInterests.includes(i)).map((interest, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="px-2 py-1 rounded bg-gray-100 hover:bg-yellow-200"
                  onClick={() => setDraftInterests([...draftInterests, interest])}
                >
                  + {interest}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Agregar interés personalizado…"
              className="border p-2 rounded mb-2"
              onKeyDown={e => {
                if (e.key === "Enter" && e.target.value) {
                  setDraftInterests([...draftInterests, e.target.value]);
                  e.target.value = "";
                }
              }}
            />
            <div>
              <button onClick={saveInterests} className="mr-2 bg-blue-600 text-white px-4 py-2 rounded">Guardar</button>
              <button onClick={() => { setEditingInterests(false); setDraftInterests(interests); }} className="px-4 py-2 rounded border">Cancelar</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1 mb-2">
              {interests.map((int, i) => (
                <Chip key={i}>{int}</Chip>
              ))}
            </div>
            {isOwn && (
              <button onClick={() => setEditingInterests(true)} className="text-blue-600">
                Editar intereses
              </button>
            )}
          </>
        )}
      </section>

      {/* Nivel */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Nivel actual</h2>
        {isOwn && editingLevel ? (
          <div className="flex gap-2">
            <select value={draftLevel} onChange={e => setDraftLevel(e.target.value)} className="border p-2 rounded">
              <option value="">Seleccioná tu nivel…</option>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <button onClick={saveLevel} className="bg-blue-600 text-white px-4 py-2 rounded">Guardar</button>
            <button onClick={() => { setEditingLevel(false); setDraftLevel(level); }} className="px-4 py-2 rounded border">Cancelar</button>
          </div>
        ) : (
          <p>
            {level || "No ha indicado su nivel."}
            {isOwn && (
              <button onClick={() => setEditingLevel(true)} className="ml-2 text-blue-600">Editar</button>
            )}
          </p>
        )}
      </section>
    </>
  );
}