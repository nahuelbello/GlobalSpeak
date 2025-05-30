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

  // edición de bio
  const [editingBio, setEditingBio] = useState(false);
  const [draftBio, setDraftBio]     = useState("");

  // datos extra
  const [interests, setInterests]         = useState([]);
  const [specialties, setSpecialties]     = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [languages, setLanguages]         = useState([]);
  const [price, setPrice]                 = useState(null);
  const [level, setLevel]                 = useState("");

  // usuario actual
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

  // cargar perfil
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
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  // guardar bio
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

  // seguir/dejar de seguir
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
            {currentUserRole === "alumno" && !isOwn && (
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