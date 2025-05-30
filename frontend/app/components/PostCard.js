"use client";

import Link from "next/link";

export default function PostCard({ post }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      {/* Cabecera: avatar, nombre y botón Ver perfil */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-2">
          <img
            src={post.avatar_url || "/default-avatar.png"}
            alt={post.name}
            className="w-8 h-8 rounded-full"
          />
          <span className="font-semibold">{post.name}</span>
        </div>
        <Link
          href={`/profile/${post.user_id}`}
          className="text-primary hover:underline"
        >
          Ver perfil
        </Link>
      </div>

      {/* Contenido del post */}
      <p className="mb-2">{post.content}</p>

      {/* Pie de post: fecha */}
      <span className="text-sm text-gray-500">
        {new Date(post.created_at).toLocaleString()}
      </span>
    </div>
  );
}