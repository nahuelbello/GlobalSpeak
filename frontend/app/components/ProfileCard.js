"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function ProfileCard({ user }) {
  const [isFollowing, setIsFollowing] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) return;
    fetch(`/api/users/${user.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.isFollowing !== undefined) {
          setIsFollowing(data.isFollowing);
        }
      })
      .catch(console.error);
  }, [user.id, token]);

  const handleFollowToggle = async () => {
    if (!token) {
      alert("Debes iniciar sesión para seguir a un usuario.");
      return;
    }
    try {
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ followingId: user.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsFollowing(data.following);
      } else {
        alert(data.error || "Error cambiando el estado de seguimiento.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de red.");
    }
  };

  return (
    <div className="bg-white rounded shadow p-4 flex flex-col items-center space-y-4">
      <Link href={`/profile/${user.id}`}>
        <img
          src={user.avatar_url || "/default-avatar.png"}
          alt={user.name}
          className="w-24 h-24 rounded-full cursor-pointer"
        />
      </Link>
      <Link href={`/profile/${user.id}`} className="text-lg font-semibold hover:underline">
        {user.name}
      </Link>
      <button
        onClick={handleFollowToggle}
        className={`px-4 py-2 rounded ${
          isFollowing ? "bg-red-500 text-white" : "bg-primary text-white"
        } hover:opacity-90`}
      >
        {isFollowing ? "Unfollow" : "Follow"}
      </button>
    </div>
  );
}