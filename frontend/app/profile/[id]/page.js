"use client";

import { useState, useEffect } from "react";
import { useParams }     from "next/navigation";
import ProfileLayout     from "../../components/ProfileLayout";
import TeacherSections   from "../../components/TeacherSections";
import StudentSections   from "../../components/StudentSections";
import StudentSlotPicker from "../../components/StudentSlotPicker";

export default function ProfilePage() {
  const { id } = useParams();
  const [user, setUser]           = useState(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading]     = useState(true);

  // — edición de bio —
  const [editingBio, setEditingBio] = useState(false);
  const [draftBio, setDraftBio]     = useState("");

  // — datos extra del perfil —
  const [interests, setInterests]           = useState([]);
  const [specialties, setSpecialties]       = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [languages, setLanguages]           = useState([]);
  const [price, setPrice]                   = useState(null);
  const [level, setLevel]                   = useState("");

  // — Stripe fields —
  const [stripeStatus, setStripeStatus]       = useState(null);
  const [stripePayoutReady, setStripePayoutReady] = useState(false);

  // — usuario actual —
  const currentUserId   =
    typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const token           =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const storedUser      =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "null")
      : null;
  const currentUserRole = storedUser?.role;
  const isOwn           = String(currentUserId) === String(id);

  // — cargar perfil y campos extra, incluyendo Stripe —
  useEffect(() => {
    setLoading(true);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    (async () => {
      try {
        const res = await fetch(`/api/users/${id}`, { headers });
        const {
          user: u,
          followersCount: fc,
          isFollowing: fol,
          interests: ints,
          specialties: specs,
          certifications: certs,
          languages: langs,
          price: p,
          level: lvl,
          stripe_account_status,
          stripe_payout_ready,
        } = await res.json();

        setUser(u);
        setFollowersCount(fc);
        setIsFollowing(fol);
        setDraftBio(u.bio || "");
        setInterests(ints || []);
        setSpecialties(specs || []);
        setCertifications(certs || []);
        setLanguages(langs || []);
        setPrice(p ?? null);
        setLevel(lvl || "");
        setStripeStatus(stripe_account_status || "new");
        setStripePayoutReady(stripe_payout_ready || false);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  // — guardar biografía —
  const saveBio = async () => {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ bio: draftBio }),
    });
    if (res.ok) {
      setUser((u) => ({ ...u, bio: draftBio }));
      setEditingBio(false);
    } else {
      alert("Error guardando biografía.");
    }
  };

  // — seguir / dejar de seguir —
  const handleFollowToggle = async () => {
    const res = await fetch("/api/follows", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ followingId: id }),
    });
    const { following } = await res.json();
    setIsFollowing(following);
    setFollowersCount((c) => c + (following ? 1 : -1));
  };

  if (loading || !user) {
    return (
      <ProfileLayout user={null}>
        <p className="p-4">Cargando perfil…</p>
      </ProfileLayout>
    );
  }

  return (
    <ProfileLayout
      user={user}
      isOwn={isOwn}
      followersCount={followersCount}
      isFollowing={isFollowing}
      handleFollowToggle={handleFollowToggle}
      editingBio={editingBio}
      draftBio={draftBio}
      setEditingBio={setEditingBio}
      setDraftBio={setDraftBio}
      saveBio={saveBio}
    >
      <main className="max-w-3xl mx-auto p-4 space-y-8">
        {user.role === "profesor" ? (
          <>
            {/* Si es tutor y no está verificado en Stripe → botón de onboarding */}
            {isOwn && stripeStatus !== "verified" && (
              <section className="mb-6">
                <div className="p-4 bg-yellow-50 border border-yellow-300 rounded">
                  <h3 className="font-semibold text-lg mb-2 text-yellow-800">
                    ⏳ Configura tus pagos con Stripe
                  </h3>
                  <p className="mb-2 text-yellow-700">
                    Para que tus alumnos puedan reservar y pagarte, completa el onboarding en Stripe.
                  </p>
                  <button
                    onClick={async () => {
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
                        console.error("Error onboarding Stripe:", err);
                        alert("No se pudo iniciar el onboarding de Stripe.");
                      }
                    }}
                    className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                  >
                    Configurar pagos con Stripe
                  </button>
                </div>
              </section>
            )}

            {/* Secciones ya existentes del tutor */}
            <TeacherSections
              user={user}
              userId={id}
              isOwn={isOwn}
              specialties={specialties}
              certifications={certifications}
              languages={languages}
              price={price}
              nationality={user.nationality}
              token={token}
              refreshProfile={() => window.location.reload()}
            />

            {/* Si el visitante es un alumno y el tutor está verificado, mostrar el slot picker */}
            {currentUserRole === "alumno" &&
             isOwn === false &&
             stripeStatus === "verified" && (
              <section className="mt-8">
                <h2 className="text-xl font-semibold mb-2">Reserva tu clase</h2>
                <StudentSlotPicker
                  teacherId={id}
                  onBooked={() => window.location.reload()}
                />
              </section>
            )}
          </>
        ) : (
          <StudentSections
            user={user}
            userId={id}
            isOwn={isOwn}
            interests={interests}
            level={level}
            nationality={user.nationality}
            token={token}
            refreshProfile={() => window.location.reload()}
          />
        )}
      </main>
    </ProfileLayout>
  );
}