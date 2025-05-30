// frontend/app/components/ProfileLayout.js
"use client";

import { useState } from "react";

export default function ProfileLayout({
  user,
  children,
  isOwn,
  followersCount,
  isFollowing,
  handleFollowToggle,
  editingBio,
  draftBio,
  setEditingBio,
  setDraftBio,
  saveBio
}) {
  const [uploading, setUploading] = useState(false);
  const API = process.env.NEXT_PUBLIC_API_URL; // ej. "http://localhost:4000"

  // handler para subir avatar y luego recargar la página por completo
  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      return alert("El archivo debe pesar menos de 2 MB.");
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API}/api/users/${user.id}/avatar`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        }
      );
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Error subiendo avatar");
      }
      // recarga total de la página
      window.location.reload();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  }

  if (!user) {
    return <div className="max-w-3xl mx-auto">{children}</div>;
  }

  // construimos la URL pública del avatar (o default)
  const avatarSrc = user.avatar_url
    ? `${API}${user.avatar_url}`
    : "/default-avatar.png";

  return (
    <div className="max-w-3xl mx-auto">
      {/* Hero header */}
      <div className="bg-white rounded-lg shadow p-6 flex flex-col md:flex-row
                      items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
        {/* Avatar + uploader */}
        <div className="relative">
          <img
            src={avatarSrc}
            alt={user.name}
            className="w-32 h-32 rounded-full object-cover"
          />
          {isOwn && (
            <label className="absolute bottom-0 right-0 bg-white p-1 rounded-full
                              cursor-pointer shadow">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
              {uploading ? "⏳" : "🖼️"}
            </label>
          )}
        </div>

        {/* Info principal */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{user.name}</h1>
              {user.role && (
                <span className="inline-block mt-1 px-3 py-1 bg-primary text-white
                                 rounded-full text-sm capitalize">
                  {user.role}
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-gray-600">{followersCount} seguidores</p>
              {!isOwn && (
                <button
                  onClick={handleFollowToggle}
                  className={`mt-1 px-3 py-1 rounded text-sm ${
                    isFollowing
                      ? "bg-gray-300 text-gray-700"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {isFollowing ? "Dejar de seguir" : "Seguir"}
                </button>
              )}
            </div>
          </div>

          <p className="mt-2 text-gray-600">
            <strong>Nacionalidad:</strong>{" "}
            {user.nationality || "— aún no definida —"}
          </p>

          <div className="mt-3">
            <strong>Biografía:</strong>
            {!editingBio ? (
              <div className="flex items-center">
                <p className="text-gray-700 flex-1 ml-2">
                  {user.bio || "— aún no tienes biografía —"}
                </p>
                {isOwn && (
                  <button
                    onClick={() => setEditingBio(true)}
                    className="ml-4 text-sm text-blue-600 hover:underline"
                  >
                    ✏️
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <textarea
                  value={draftBio}
                  onChange={(e) => setDraftBio(e.target.value)}
                  className="w-full border px-2 py-1 rounded"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveBio}
                    className="px-4 py-1 bg-blue-600 text-white rounded"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setEditingBio(false);
                      setDraftBio(user.bio || "");
                    }}
                    className="px-4 py-1 border rounded"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resto de la página */}
      <div className="mt-6">{children}</div>
    </div>
  );
}