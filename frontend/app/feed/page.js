// app/home/page.js
'use client'
import { useEffect, useState } from 'react'
import PostForm from '../components/PostForm'
import PostCard from '../components/PostCard'

export default function Home() {
  const [posts, setPosts] = useState([])

  async function load() {
    const res = await fetch('/api/posts')
    const { posts } = await res.json()
    setPosts(posts)
  }

  useEffect(()=>{ load() }, [])

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PostForm onPost={load} />
      <div className="mt-6 space-y-4">
        {posts.map(p=> <PostCard key={p.id} post={p}/> ) ||
          <p>No hay posts aún.</p>
        }
      </div>
    </div>
  )
}