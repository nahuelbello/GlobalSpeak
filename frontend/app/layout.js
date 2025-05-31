// frontend/app/layout.js
import './globals.css';
import Navbar from './components/Navbar'; // Ajusta la ruta si tu Navbar está en otra carpeta

export const metadata = {
  title: 'GlobalSpeak',
  description: 'Conecta profesores nativos de español con estudiantes de todo el mundo',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="scroll-smooth">
      <head />
      <body className="min-h-screen">
        <Navbar />
        {children}
      </body>
    </html>
  );
}