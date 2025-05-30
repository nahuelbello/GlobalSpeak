"use client";
import { useState } from "react";

export default function PostForm({ onPost }) {
  const [text, setText] = useState("");

  async function submit(e) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: text }),
    });
    const data = await res.json();
    if (res.ok) {
      setText("");
      onPost();   // recarga el listado de posts
    } else {
      alert(data.error || "Error al crear el post");
    }
  }

  return (
    <form onSubmit={submit} className="bg-white p-4 rounded shadow">
      <textarea
        className="w-full p-2 border rounded mb-2"
        placeholder="¿Qué quieres compartir?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        required
      />
      <button
        type="submit"
        className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/80"
      >
        Publicar
      </button>
    </form>
  );
}