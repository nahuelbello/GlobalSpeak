// app/search/page.js
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q) {
      router.push('/');
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || []);
        setPosts(data.posts || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [q, router]);

  if (loading) {
    return <p className="p-6 text-center">Buscando “{q}”…</p>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Resultados para “{q}”</h1>

      <section>
        <h2 className="text-xl font-semibold mb-2">Perfiles</h2>
        {users.length === 0 ? (
          <p>No se encontraron usuarios.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-4">
            {users.map((u) => (
              <li key={u.id} className="border p-4 rounded">
                <Link href={`/profile/${u.id}`} className="flex items-center space-x-3">
                  <img
                    src={u.avatar_url || '/default-avatar.png'}
                    alt={u.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <span className="font-medium">{u.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Posts</h2>
        {posts.length === 0 ? (
          <p>No se encontraron posts.</p>
        ) : (
          <ul className="space-y-4">
            {posts.map((p) => (
              <li key={p.id} className="border p-4 rounded">
                <Link href={`/profile/${p.author_id}`} className="flex items-center space-x-2 mb-2">
                  <img
                    src={p.author_avatar || '/default-avatar.png'}
                    alt={p.author_name}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="font-medium">{p.author_name}</span>
                </Link>
                <p>{p.content}</p>
                <span className="text-sm text-gray-500">
                  {new Date(p.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="p-6 text-center">Cargando resultados…</p>}>
      <SearchContent />
    </Suspense>
  );
}