// app/components/Navbar.js
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  // Carga user y notificaciones al cambiar de ruta
  useEffect(() => {
    const stored = localStorage.getItem("user");
    const u = stored ? JSON.parse(stored) : null;
    setUser(u);

    if (u) {
      const token = localStorage.getItem("token");
      fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setNotifs(data.notifications || []))
        .catch(console.error);
    } else {
      setNotifs([]);
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}`);
    setQuery("");
    setSearchOpen(false);
  };

  const markRead = async (id) => {
    const token = localStorage.getItem("token");
    await fetch(`/api/notifications/${id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  return (
    <nav className="bg-primary text-white shadow-md relative">
      <div className="max-w-4xl mx-auto flex items-center justify-between p-4">
        {/* IZQUIERDA: Links */}
        <div className="flex items-center space-x-4">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          {user && (
            <>
              <Link 
              href="/feed" className="hover:underline"> Feed
              </Link>
              <Link 
              href="/chats" className="hover:underline"> Chats
              </Link>
              <Link 
              href={`/profile/${user.id}`} className="hover:underline"> Profile
              </Link>
            </>
          )}
        </div>

        {/* DERECHA: lupa, campana, login/logout */}
        <div className="flex items-center space-x-4 relative">
          {/* Lupa */}
          <button
            onClick={() => setSearchOpen((o) => !o)}
            className="hover:opacity-80"
          >
            🔍
          </button>
          {searchOpen && (
            <form
              onSubmit={handleSearch}
              className="absolute top-full right-0 mt-2 flex bg-white text-black rounded shadow overflow-hidden"
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar…"
                className="px-2 py-1 outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 bg-primary text-white hover:bg-primary/90"
              >
                Ir
              </button>
            </form>
          )}

          {/* Campanita */}
          {user && (
            <>
              <button
                onClick={() => setShowNotifs((o) => !o)}
                className="relative hover:opacity-80"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-xs px-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <ul className="absolute top-full right-10 mt-2 bg-white text-black rounded shadow w-64 max-h-80 overflow-auto z-50">
                  {notifs.length === 0 ? (
                    <li className="p-2 text-gray-600">Sin notificaciones</li>
                  ) : (
                    notifs.map((n) => (
                      <li
                        key={n.id}
                        className={`px-4 py-2 border-b last:border-none ${
                          n.is_read ? "" : "bg-gray-100 font-medium"
                        }`}
                      >
                        <a href={n.link} className="block">
                          {n.message}
                        </a>
                        {!n.is_read && (
                          <button
                            onClick={() => markRead(n.id)}
                            className="mt-1 text-sm text-blue-600"
                          >
                            Marcar leída
                          </button>
                        )}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </>
          )}

          {/* Login / Logout */}
          {user ? (
            <button onClick={handleLogout} className="hover:underline">
              Logout
            </button>
          ) : (
            <>
              <Link href="/auth/login" className="hover:underline">
                Login
              </Link>
              <Link href="/auth/signup" className="hover:underline">
                Signup
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}