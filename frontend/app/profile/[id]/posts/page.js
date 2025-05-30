"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import ProfileLayout from "../../../components/ProfileLayout";
import PostCard from "../../../components/PostCard";

export default function PostsPage() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then(res => res.json())
      .then(data => setUser(data.user))
      .catch(console.error);

    fetch(`/api/posts?userId=${id}`)
      .then(res => res.json())
      .then(data => setPosts(data.posts || []))
      .catch(console.error);
  }, [id]);

  if (!user) return <p>Cargando perfil...</p>;

  return (
    <ProfileLayout user={user}>
      <h2 className="text-xl font-semibold mb-4">Posts</h2>
      {posts.length === 0 ? (
        <p>No hay publicaciones.</p>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </ProfileLayout>
  );
}