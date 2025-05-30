"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export default function ChatDrawer({ bookingId, onClose }) {
  const [chatRoomId, setChatRoomId] = useState(null);
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState("");
  const [sending,    setSending]    = useState(false);
  const [file,       setFile]       = useState(null);
  const socketRef = useRef(null);
  const endRef    = useRef(null);
  const API = process.env.NEXT_PUBLIC_API_URL;

  // 0) Obtener chatRoomId a partir del bookingId
  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API}/api/chat_rooms/${bookingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("No pude abrir el chat");
        return r.json();
      })
      .then(({ chatRoomId }) => setChatRoomId(chatRoomId))
      .catch((err) => {
        alert(err.message);
        onClose();
      });
  }, [bookingId, API, onClose]);

  // 1) Conectar socket y unir sala (cuando ya tengamos chatRoomId)
  useEffect(() => {
    if (!chatRoomId) return;
    const socket = io(API.replace(/\/$/, ""), {
      auth: { token: localStorage.getItem("token") },
    });
    socketRef.current = socket;
    socket.emit("join", {
      chatRoomId,
      userId: localStorage.getItem("userId"),
    });

    socket.on("message", (msg) => {
      setMessages((ms) => [...ms, msg]);
    });
    socket.on("messageRead", ({ id: messageId }) => {
      setMessages((ms) =>
        ms.map((m) =>
          m.id === messageId
            ? { ...m, read_at: new Date().toISOString() }
            : m
        )
      );
    });

    return () => void socket.disconnect();
  }, [chatRoomId, API]);

  // 2) Cargar historial de ese chatRoomId
  useEffect(() => {
    if (!chatRoomId) return;
    const token = localStorage.getItem("token");
    fetch(`${API}/api/messages?chatRoomId=${chatRoomId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setMessages(data.messages || []))
      .catch(console.error);
  }, [chatRoomId, API]);

  // 3) Auto-scroll al final
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f && f.size > 2 * 1024 * 1024) {
      return alert("El archivo debe pesar menos de 2 MB.");
    }
    setFile(f || null);
  };

  const handleSend = async () => {
    if (!input.trim() && !file) return;
    setSending(true);
    try {
      const form = new FormData();
      form.append("bookingId", bookingId);
      form.append("chatRoomId", chatRoomId);
      form.append("content", input);
      if (file) form.append("file", file);

      const res = await fetch(`${API}/api/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: form,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Error al enviar");

      setInput("");
      setFile(null);
      // El socket agregará el mensaje entrante automáticamente
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex">
      <div className="ml-auto w-full max-w-md bg-white flex flex-col">
        <header className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Chat de la clase</h2>
          <button onClick={onClose} className="text-xl">✕</button>
        </header>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${
                String(m.senderId) === localStorage.getItem("userId")
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div className="max-w-xs bg-gray-100 p-2 rounded">
                {m.type === "file" && m.fileUrl ? (
                  <a
                    href={m.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    📎 Ver archivo
                  </a>
                ) : (
                  <p>{m.content}</p>
                )}
                <div className="text-xs text-gray-500 text-right">
                  {new Date(m.created_at).toLocaleTimeString([], {
                    hour:   "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <footer className="p-4 border-t space-y-2">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full border rounded p-2 resize-none"
            placeholder="Escribe un mensaje…"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <label
                htmlFor="chat-file"
                className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 cursor-pointer select-none"
              >
                📎 Adjuntar
              </label>
              <input
                id="chat-file"
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
              {file && (
                <span className="text-sm italic text-gray-600">
                  {file.name}
                </span>
              )}
            </div>
            <button
              onClick={handleSend}
              disabled={sending}
              className="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50"
            >
              Enviar
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}