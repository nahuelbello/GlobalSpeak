"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import ProfileLayout from "../../../components/ProfileLayout";

export default function AvailabilityPage() {
  const { id } = useParams();
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    fetch(`/api/availability?userId=${id}`)
      .then((res) => res.json())
      .then((data) => setSlots(data.availability))
      .catch(console.error);
  }, [id]);

  return (
    <ProfileLayout userId={id}>
      <main className="p-4">
        <h2 className="text-2xl font-semibold mb-4">Disponibilidad</h2>
        {slots.length === 0 ? (
          <p>No hay franjas disponibles.</p>
        ) : (
          <ul className="space-y-2">
            {slots.map((slot) => (
              <li key={slot.id}>
                {new Date(slot.start).toLocaleString()} –{" "}
                {new Date(slot.end).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </main>
    </ProfileLayout>
  );
}