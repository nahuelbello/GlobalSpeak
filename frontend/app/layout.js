// app/layout.js
import './globals.css'
import Navbar from './components/Navbar'

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="scroll-smooth">
      <head />
      <body className="min-h-screen bg-gray-100 text-gray-900">
        <Navbar />
        {children}
      </body>
    </html>
  )
}