"use client";

import { useState, useEffect } from "react";
import {
  TEACHER_SPECIALTIES,
  TEACHER_CERTIFICATIONS,
  LANGUAGE_LIST,
  NATIONALITIES,
} from "../data/predefinedFields";
import TeacherWeeklyScheduler from "./TeacherWeeklyScheduler";

export default function TeacherSections({
  user,
  userId,
  isOwn,
  specialties = [],
  certifications = [],
  languages = [],
  price,
  nationality = "",
  token,
  refreshProfile,
}) {
  // — Estados para edición de campos existentes —
  const [editingSpecs, setEditingSpecs] = useState(false);
  const [draftSpecs, setDraftSpecs] = useState(specialties);

  const [editingCerts, setEditingCerts] = useState(false);
  const [draftCerts, setDraftCerts] = useState(certifications);

  const [editingLangs, setEditingLangs] = useState(false);
  const [draftLangs, setDraftLangs] = useState(languages);

  const [editingPrice, setEditingPrice] = useState(false);
  const [draftPrice, setDraftPrice] = useState(price || "");

  const [editingNat, setEditingNat] = useState(false);
  const [draftNat, setDraftNat] = useState(nationality);

  // — Estado para manejar Stripe Onboarding —
  const [stripeStatus, setStripeStatus] = useState(user?.stripe_account_status || "new");

  // Si el `user` cambia (por refreshProfile), sincronizamos el stripeStatus
  useEffect(() => {
    if (user?.stripe_account_status) {
      setStripeStatus(user.stripe_account_status);
    }
  }, [user]);

  // — Handlers para actualizar cada campo en /api/users/:id/fields —
  const saveSpecs = async () => {
    await fetch(`/api/users/${userId}/fields`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ specialties: draftSpecs }),
    });
    setEditingSpecs(false);
    refreshProfile();
  };

  const saveCerts = async () => {
    await fetch(`/api/users/${userId}/fields`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ certifications: draftCerts }),
    });
    setEditingCerts(false);
    refreshProfile();
  };

  const saveLangs = async () => {
    await fetch(`/api/users/${userId}/fields`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ languages: draftLangs }),
    });
    setEditingLangs(false);
    refreshProfile();
  };

  const savePrice = async () => {
    await fetch(`/api/users/${userId}/fields`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ price: draftPrice }),
    });
    setEditingPrice(false);
    refreshProfile();
  };

  const saveNat = async () => {
    await fetch(`/api/users/${userId}/fields`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nationality: draftNat }),
    });
    setEditingNat(false);
    refreshProfile();
  };

  // — Handler para iniciar onboarding en Stripe —
  const handleOnboard = async () => {
    try {
      const res = await fetch("/api/stripe/create-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Error al solicitar Stripe account");
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error("Error en handleOnboard():", err);
      alert("No se pudo iniciar el onboarding de Stripe. Intenta de nuevo.");
    }
  };

  // — Un pequeño componente Chip reutilizable —
  const Chip = ({ children, onRemove }) => (
    <span className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs mr-2 mb-1">
      {children}
      {onRemove && (
        <button className="ml-1 text-red-600 font-bold" onClick={onRemove}>
          ×
        </button>
      )}
    </span>
  );

  return (
    <>
      {/* 1. Si el tutor no está verificado en Stripe, mostrar botón de onboarding */}
      {isOwn && stripeStatus !== "verified" && (
        <section className="mb-6">
          <div className="max-w-3xl mx-auto p-4 border border-yellow-300 bg-yellow-50 rounded">
            <h3 className="font-semibold text-lg mb-2 text-yellow-800">
              ⏳ Configura tus pagos
            </h3>
            <p className="mb-2 text-yellow-700">
              Para recibir pagos por tus clases, debes completar un breve formulario en Stripe.
            </p>
            <button
              onClick={handleOnboard}
              className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
            >
              Configurar pagos con Stripe
            </button>
          </div>
        </section>
      )}


      {/* 2. Especialidades */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Especialidades</h2>
        {isOwn && editingSpecs ? (
          <div>
            <div className="flex flex-wrap gap-1 mb-2">
              {draftSpecs.map((esp, idx) => (
                <Chip
                  key={idx}
                  onRemove={() =>
                    setDraftSpecs(draftSpecs.filter((_, i) => i !== idx))
                  }
                >
                  {esp}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {TEACHER_SPECIALTIES.filter(
                (i) => !draftSpecs.includes(i)
              ).map((esp, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="px-2 py-1 rounded bg-gray-100 hover:bg-blue-200"
                  onClick={() => setDraftSpecs([...draftSpecs, esp])}
                >
                  + {esp}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Agregar especialidad…"
              className="border p-2 rounded mb-2"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.target.value) {
                  setDraftSpecs([...draftSpecs, e.target.value]);
                  e.target.value = "";
                }
              }}
            />
            <div>
              <button
                onClick={saveSpecs}
                className="mr-2 bg-blue-600 text-white px-4 py-2 rounded"
              >
                Guardar
              </button>
              <button
                onClick={() => {
                  setEditingSpecs(false);
                  setDraftSpecs(specialties);
                }}
                className="px-4 py-2 rounded border"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1 mb-2">
              {specialties.map((esp, i) => (
                <Chip key={i}>{esp}</Chip>
              ))}
            </div>
            {isOwn && (
              <button
                onClick={() => setEditingSpecs(true)}
                className="text-blue-600"
              >
                Editar especialidades
              </button>
            )}
          </>
        )}
      </section>

      {/* 3. Certificaciones */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Certificaciones</h2>
        {isOwn && editingCerts ? (
          <div>
            <div className="flex flex-wrap gap-1 mb-2">
              {draftCerts.map((cert, idx) => (
                <Chip
                  key={idx}
                  onRemove={() =>
                    setDraftCerts(draftCerts.filter((_, i) => i !== idx))
                  }
                >
                  {cert}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {TEACHER_CERTIFICATIONS.filter(
                (i) => !draftCerts.includes(i)
              ).map((cert, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="px-2 py-1 rounded bg-gray-100 hover:bg-blue-200"
                  onClick={() => setDraftCerts([...draftCerts, cert])}
                >
                  + {cert}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Agregar certificación…"
              className="border p-2 rounded mb-2"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.target.value) {
                  setDraftCerts([...draftCerts, e.target.value]);
                  e.target.value = "";
                }
              }}
            />
            <div>
              <button
                onClick={saveCerts}
                className="mr-2 bg-blue-600 text-white px-4 py-2 rounded"
              >
                Guardar
              </button>
              <button
                onClick={() => {
                  setEditingCerts(false);
                  setDraftCerts(certifications);
                }}
                className="px-4 py-2 rounded border"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1 mb-2">
              {certifications.map((cert, i) => (
                <Chip key={i}>{cert}</Chip>
              ))}
            </div>
            {isOwn && (
              <button
                onClick={() => setEditingCerts(true)}
                className="text-blue-600"
              >
                Editar certificaciones
              </button>
            )}
          </>
        )}
      </section>

      {/* 4. Idiomas */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Idiomas</h2>
        {isOwn && editingLangs ? (
          <div>
            <div className="flex flex-wrap gap-1 mb-2">
              {draftLangs.map((lang, idx) => (
                <Chip
                  key={idx}
                  onRemove={() =>
                    setDraftLangs(draftLangs.filter((_, i) => i !== idx))
                  }
                >
                  {lang}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {LANGUAGE_LIST.filter((i) => !draftLangs.includes(i)).map(
                (lang, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="px-2 py-1 rounded bg-gray-100 hover:bg-blue-200"
                    onClick={() => setDraftLangs([...draftLangs, lang])}
                  >
                    + {lang}
                  </button>
                )
              )}
            </div>
            <input
              type="text"
              placeholder="Agregar idioma…"
              className="border p-2 rounded mb-2"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.target.value) {
                  setDraftLangs([...draftLangs, e.target.value]);
                  e.target.value = "";
                }
              }}
            />
            <div>
              <button
                onClick={saveLangs}
                className="mr-2 bg-blue-600 text-white px-4 py-2 rounded"
              >
                Guardar
              </button>
              <button
                onClick={() => {
                  setEditingLangs(false);
                  setDraftLangs(languages);
                }}
                className="px-4 py-2 rounded border"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1 mb-2">
              {languages.map((lang, i) => (
                <Chip key={i}>{lang}</Chip>
              ))}
            </div>
            {isOwn && (
              <button
                onClick={() => setEditingLangs(true)}
                className="text-blue-600"
              >
                Editar idiomas
              </button>
            )}
          </>
        )}
      </section>

      {/* 5. Tarifa por hora (USD) */}
      <section>
        <h2 className="text-xl font-semibold mb-2">
          Tarifa por hora (USD)
        </h2>
        {isOwn && editingPrice ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              className="border p-2 rounded"
              value={draftPrice}
              onChange={(e) => setDraftPrice(e.target.value)}
            />
            <button
              onClick={savePrice}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Guardar
            </button>
            <button
              onClick={() => {
                setEditingPrice(false);
                setDraftPrice(price || "");
              }}
              className="px-4 py-2 rounded border"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <p>
            {price ? `$${price} USD / hora` : "No ha definido tarifa."}
            {isOwn && (
              <button
                onClick={() => setEditingPrice(true)}
                className="ml-2 text-blue-600"
              >
                Editar
              </button>
            )}
          </p>
        )}
      </section>

      {/* 6. Disponibilidad semanal */}
      {isOwn && (
        <section className="mt-6">
          <h2 className="text-xl font-semibold mb-2">
            Disponibilidad semanal
          </h2>
          <TeacherWeeklyScheduler userId={userId} />
        </section>
      )}
    </>
  );
}