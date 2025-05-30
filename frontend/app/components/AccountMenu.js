// app/components/AccountMenu.js
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AccountMenu({ user }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  function logout() {
    localStorage.removeItem('token')
    router.push('/')
  }

  return (
    <div className="relative">
      <button onClick={()=>setOpen(o=>!o)} className="flex items-center space-x-2">
        <img src={user.avatar_url||'/default-avatar.png'} className="w-8 h-8 rounded-full"/>
        <span>{user.name}</span>
      </button>
      {open && (
        <ul className="absolute right-0 mt-2 bg-white shadow rounded w-48">
          <li>
            <a href={`/profile/${user.id}`} className="block px-4 py-2 hover:bg-gray-100">Mi Perfil</a>
          </li>
          <li>
            <button onClick={logout} className="w-full text-left px-4 py-2 hover:bg-gray-100">
              Cerrar Sesión
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}