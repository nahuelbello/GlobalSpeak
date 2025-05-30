"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ChatsListPage() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || !storedUser) {
      setLoading(false);
      return;
    }

    const roleParam = storedUser.role === "alumno" ? "alumnoId" : "profesorId";

    fetch(`/api/bookings?${roleParam}=${storedUser.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(({ bookings = [] }) => {
        const accepted = bookings.filter((b) => b.status === "accepted");
        setConversations(accepted);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando conversaciones…</p>
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>No tienes conversaciones activas.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-semibold mb-6">Tus conversaciones</h1>
      <ul className="space-y-4">
        {conversations.map((conv) => {
          const storedUser = JSON.parse(localStorage.getItem("user") || "null");
          const otherName =
            storedUser.role === "alumno"
              ? conv.profesor_name
              : conv.alumno_name;

          return (
            <li
              key={conv.id}
              className="bg-white p-4 rounded shadow flex justify-between items-center"
            >
              <span>
                Chat con <strong>{otherName}</strong>
              </span>
              <Link
                href={`/chats/${conv.id}`}
                className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Abrir
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}