"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("alumno");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nationality, setNationality] = useState("");
  const [err, setErr] = useState(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(null);

    // Validación de contraseñas
    if (password !== confirmPassword) {
      setErr("Las contraseñas no coinciden.");
      return;
    }

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        role,
        email,
        password,
        nationality,
      }),
    });
    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("userId", data.user.id);
      router.push("/auth/onboarding");
    } else {
      setErr(data.error);
    }
  };

  const passwordsMatch = password && password === confirmPassword;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 max-w-sm mx-auto p-4"
      noValidate
    >
      {/* Error general */}
      {err && <div className="text-red-500">{err}</div>}

      {/* Nombre */}
      <div>
        <label htmlFor="name" className="block mb-1">
          Nombre
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border px-2 py-1"
          required
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border px-2 py-1"
          required
        />
      </div>

      {/* Rol */}
      <div>
        <label htmlFor="role" className="block mb-1">
          Rol
        </label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full border px-2 py-1"
        >
          <option value="alumno">Alumno</option>
          <option value="profesor">Profesor</option>
        </select>
      </div>

      {/* Contraseña */}
      <div>
        <label htmlFor="password" className="block mb-1">
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border px-2 py-1 pr-10"
            required
            aria-describedby="password-toggle"
          />
          <button
            type="button"
            id="password-toggle"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 px-2 text-xl leading-tight"
            tabIndex={-1}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>
      </div>

      {/* Confirmar contraseña */}
      <div>
        <label htmlFor="confirmPassword" className="block mb-1">
          Confirmar contraseña
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`w-full border px-2 py-1 pr-10 ${
              confirmPassword && !passwordsMatch
                ? "border-red-500"
                : ""
            }`}
            required
            aria-invalid={!passwordsMatch}
            aria-describedby="confirm-error confirm-toggle"
          />
          <button
            type="button"
            id="confirm-toggle"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute inset-y-0 right-0 px-2 text-xl leading-tight"
            tabIndex={-1}
          >
            {showConfirm ? "🙈" : "👁️"}
          </button>
        </div>
        {confirmPassword && !passwordsMatch && (
          <p id="confirm-error" className="mt-1 text-sm text-red-500">
            Las contraseñas no coinciden.
          </p>
        )}
      </div>

      {/* Botón de envío */}
      <button
        type="submit"
        disabled={!passwordsMatch}
        className={`w-full px-4 py-2 rounded text-white transition ${
          passwordsMatch
            ? "bg-green-600 hover:bg-green-700"
            : "bg-gray-300 cursor-not-allowed"
        }`}
      >
        Sign Up
      </button>
    </form>
  );
}