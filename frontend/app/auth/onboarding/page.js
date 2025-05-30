"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LANGUAGE_LIST,
  NATIONALITIES,
  STUDENT_INTERESTS,
  PROFICIENCY_LEVELS,
  LEVELS,
} from "../../data/predefinedFields";

export default function OnboardingPage() {
  const router = useRouter();

  // — Estados globales —
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  // — Shared: idiomas dinámicos con nivel —
  const [languages, setLanguages] = useState([]); // [{lang,level},…]
  const [newLang, setNewLang] = useState("");
  const [newLevel, setNewLevel] = useState("");

  // — Shared: nivel general (para alumno: nivel de español; para profe usamos otros idiomas) —
  const [level, setLevel] = useState("");

  // — Alumno solo —
  const [nationality, setNationality] = useState("");
  const [bio, setBio] = useState("");
  const [newInterest, setNewInterest] = useState("");
  const [interests, setInterests] = useState([]);
  const [spanishLevel, setSpanishLevel] = useState("");

  // — Profesor solo —
  const [teacherNationality, setTeacherNationality] = useState("");
  const [teacherBio, setTeacherBio] = useState("");
  const [teacherVideo, setTeacherVideo] = useState(null);
  const [price, setPrice] = useState("");

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("user"));
    if (!stored) return router.push("/auth/signup");
    setUser(stored);
    setRole(stored.role);
  }, [router]);

  const addLanguage = () => {
    if (newLang && newLevel) {
      setLanguages([...languages, { lang: newLang, level: newLevel }]);
      setNewLang("");
      setNewLevel("");
    }
  };

  const removeLanguage = (i) =>
    setLanguages(languages.filter((_, idx) => idx !== i));

  const addInterest = () => {
    if (newInterest && !interests.includes(newInterest)) {
      setInterests([...interests, newInterest]);
      setNewInterest("");
    }
  };

  const removeInterest = (i) =>
    setInterests(interests.filter((_, idx) => idx !== i));

  const handleFinish = async () => {
    // Construimos el payload base
    const payload = {
      languages: languages.map((l) => l.lang),
      level,
    };

    if (role === "alumno") {
      payload.nationality = nationality;
      payload.level  = spanishLevel;
      payload.bio         = bio;
      payload.interests   = interests;
    } else {
      payload.nationality = teacherNationality;
      payload.bio         = teacherBio;
      payload.videoUrl    = teacherVideo?.name || null;
      payload.price       = price;
    }

    const res = await fetch(`/api/users/${user.id}/fields`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      router.push("/feed");
    } else {
      alert("Error saving profile");
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-semibold">Tell us more about you</h1>

      {/* Shared: idiomas con niveles */}
      <div>
        <label className="block mb-1">Languages you speak</label>
        <div className="flex gap-2 mb-2">
          <select
            className="flex-1 border px-2 py-1"
            value={newLang}
            onChange={(e) => setNewLang(e.target.value)}
          >
            <option value="">Pick a language</option>
            {LANGUAGE_LIST.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <select
            className="w-40 border px-2 py-1"
            value={newLevel}
            onChange={(e) => setNewLevel(e.target.value)}
          >
            <option value="">Level</option>
            {PROFICIENCY_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={addLanguage}
            className="px-3 bg-green-500 text-white rounded"
          >
            Add
          </button>
        </div>
        <ul className="space-y-1">
          {languages.map((l, i) => (
            <li key={i} className="flex justify-between items-center">
              <span>{l.lang} — {l.level}</span>
              <button
                onClick={() => removeLanguage(i)}
                className="text-red-500"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Alumno: nacionalidad, bio e intereses */}
      {role === "alumno" && (
        <>
          <div>
            <label className="block mb-1">Nationality</label>
            <select
              className="w-full border px-2 py-1 mb-2"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              required
            >
              <option value="">Pick your nationality…</option>
              {NATIONALITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1">Short bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full border px-2 py-1"
              rows={3}
            />
          </div>

          <div>
            <label className="block mb-1">Your interests</label>
            <div className="flex gap-2 mb-2">
              <select
                className="flex-1 border px-2 py-1"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
              >
                <option value="">Pick an interest</option>
                {STUDENT_INTERESTS.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={addInterest}
                className="px-3 bg-green-500 text-white rounded"
              >
                Add
              </button>
            </div>
            <ul className="space-y-1">
              {interests.map((i, idx) => (
                <li key={idx} className="flex justify-between">
                  <span>{i}</span>
                  <button
                    onClick={() => removeInterest(idx)}
                    className="text-red-500"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Alumno: nivel de español */}
        <div>
        <label className="block mb-1">Your Spanish level</label>
        <select
            className="w-full border px-2 py-1 mb-2"
            value={spanishLevel}
            onChange={(e) => setSpanishLevel(e.target.value)}
            required
        >
            <option value="">Select your Spanish level…</option>
            {LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>
                {lvl}
            </option>
            ))}
        </select>
        </div>
        </>
      )}

      {/* Profesor: igual que antes */}
      {role === "profesor" && (
        <>
          <div>
            <label className="block mb-1">Select your nationality</label>
            <select
              className="w-full border px-2 py-1 mb-2"
              value={teacherNationality}
              onChange={(e) => setTeacherNationality(e.target.value)}
              required
            >
              <option value="">Pick a country…</option>
              {NATIONALITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1">Short bio</label>
            <textarea
              value={teacherBio}
              onChange={(e) => setTeacherBio(e.target.value)}
              className="w-full border px-2 py-1"
              rows={3}
            />
          </div>

          <div>
            <label className="block mb-1">Presentation video/audio</label>
            <input
              type="file"
              accept="video/*,audio/*"
              onChange={(e) => setTeacherVideo(e.target.files[0])}
              className="w-full"
            />
          </div>

          <div>
            <label className="block mb-1">Rate per hour (USD)</label>
            <input
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full border px-2 py-1"
            />
          </div>
        </>
      )}

      <button
        onClick={handleFinish}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Finish &amp; Start Exploring
      </button>
    </div>
  );
}