"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Componente auxiliar para las características en vista pública
function FeatureCard({ icon, title, desc }) {
  return (
    <div className="bg-white bg-opacity-70 backdrop-blur-sm rounded-lg shadow p-6 flex flex-col items-center text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-700">{desc}</p>
    </div>
  );
}

// Devuelve un string como "Falta 2h 15m" o "Falta 10m"
function getTimeRemaining(startDate) {
  const now = new Date();
  const diffMs = startDate - now;
  if (diffMs <= 0) return "En curso";
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;
  if (hours > 0) return `Falta ${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`;
  return `Falta ${minutes}m`;
}

export default function HomePage() {
  const [bookings, setBookings] = useState([]);
  const [user, setUser]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");

    if (token && storedUser) {
      setUser(storedUser);

      // Elegimos endpoint según rol
      const url =
        storedUser.role === "alumno"
          ? `/api/bookings?alumnoId=${storedUser.id}`
          : `/api/bookings?profesorId=${storedUser.id}`;

      fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then(({ bookings = [] }) => {
          const now = Date.now();
          const upcoming = bookings
            .map((b) => ({
              ...b,
              start_time: new Date(b.start_time),
            }))
            .filter(
              (b) =>
                b.start_time.getTime() > now && b.status !== "cancelled"
            )
            .sort((a, b) => a.start_time - b.start_time);

          setBookings(upcoming);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const cancelBooking = async (bookingId) => {
    if (!confirm("¿Cancelar esta clase?")) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) throw new Error("Error cancelando clase");
      setBookings((prev) =>
        prev.filter((b) => String(b.id) !== String(bookingId))
      );
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}`);
    setQuery("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando…</p>
      </div>
    );
  }

  // **Vista autenticada**: home con próximas clases
  if (user) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 space-y-8">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex max-w-md mx-auto">
          <input
            type="text"
            placeholder="Buscar perfiles o posts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-l"
          />
          <button
            type="submit"
            className="px-4 bg-primary text-white rounded-r hover:bg-primary/90"
          >
            Buscar
          </button>
        </form>

        <h1 className="text-3xl font-bold text-center">
          ¡Bienvenido, {user.name}!
        </h1>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Próximas clases</h2>
          {bookings.length === 0 ? (
            <p className="text-gray-600">No tienes clases agendadas.</p>
          ) : (
            <ul className="space-y-4">
              {bookings.map((b) => (
                <li
                  key={b.id}
                  className="bg-white rounded shadow p-4 flex justify-between items-center"
                >
                  <div>
                    {user.role === "alumno" ? (
                      <p>
                        Con{" "}
                        <Link
                          href={`/profile/${b.profesor_id}`}
                          className="font-medium underline"
                        >
                          {b.profesor_name}
                        </Link>{" "}
                        el{" "}
                        {b.start_time.toLocaleString("es-ES", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    ) : (
                      <p>
                        Estudiante{" "}
                        <Link
                          href={`/profile/${b.alumno_id}`}
                          className="font-medium underline"
                        >
                          {b.alumno_name}
                        </Link>{" "}
                        el{" "}
                        {b.start_time.toLocaleString("es-ES", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    )}
                    <p className="text-gray-500">
                      {getTimeRemaining(b.start_time)}
                    </p>
                  </div>
                  {user.role === "alumno" && (
                    <button
                      onClick={() => cancelBooking(b.id)}
                      className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Cancelar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex justify-center space-x-4">
          <Link
            href="/feed"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Ir al Feed
          </Link>
          <Link
            href={`/profile/${user.id}`}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Mi Perfil
          </Link>
        </div>
      </div>
    );
  }

  // **Vista no autenticada**: nueva landing
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-3xl text-center space-y-6">
          <h1 className="text-5xl font-extrabold text-gray-900">
            Aprende español con nativos de todo el mundo
          </h1>
          <p className="text-lg text-gray-700">
            Conecta con profesores certificados, reserva clases en minutos y
            lleva tu nivel al siguiente nivel.
          </p>
          <div className="space-x-4">
            <Link
              href="/auth/signup"
              className="px-6 py-3 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
            >
              Regístrate
            </Link>
            <Link
              href="/auth/login"
              className="px-6 py-3 bg-white text-green-600 rounded-lg shadow hover:bg-gray-100 transition border border-green-600"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </section>

      {/* ¿Por qué elegir GlobalSpeak? */}
      <section className="py-16 px-6 bg-gray-100">
        <h2 className="text-3xl font-bold text-center mb-8">
          ¿Por qué elegir GlobalSpeak?
        </h2>
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon="🌐"
            title="Intercambio cultural"
            desc="Practica con hablantes nativos y descubre la riqueza cultural de cada país."
          />
          <FeatureCard
            icon="⏰"
            title="Flexibilidad total"
            desc="Elige horarios que se adapten a tu rutina, sin restricciones de ubicaciones."
          />
          <FeatureCard
            icon="🎯"
            title="Aprendizaje personalizado"
            desc="Define tus objetivos y recibe clases enfocadas en lo que realmente te importa."
          />
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="py-16 px-6">
        <h2 className="text-3xl font-bold text-center mb-8">
          ¿Cómo funciona?
        </h2>
        <ol className="max-w-3xl mx-auto space-y-6 list-decimal list-inside text-gray-700">
          <li>
            Crea tu cuenta como <strong>Alumno</strong> o{" "}
            <strong>Profesor</strong>.
          </li>
          <li>
            Completa tu perfil con idiomas, nivel y biografía.
          </li>
          <li>
            Explora perfiles, elige tu profesor ideal y reserva tu primera clase.
          </li>
          <li>
            Disfruta de tu lección en línea y sigue tu progreso.
          </li>
        </ol>
      </section>

      {/* Call to action final */}
      <section className="py-12 bg-gradient-to-b from-white to-blue-50">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">
            Empieza hoy mismo
          </h2>
          <Link
            href="/auth/signup"
            className="px-8 py-3 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
          >
            Regístrate gratis
          </Link>
        </div>
      </section>
    </div>
  );
}