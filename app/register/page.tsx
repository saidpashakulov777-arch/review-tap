"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Аккаунт успешно создан! Проверьте электронную почту для подтверждения.");
  };

  return (
    <main className="min-h-screen bg-[#070709] flex items-center justify-center px-6">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-8"
      >
        <h1 className="text-3xl font-bold text-white mb-8">
          Создать аккаунт
        </h1>

        <input
          name="name"
          type="text"
          placeholder="Имя"
          required
          className="mb-4 w-full rounded-xl bg-white/5 border border-white/10 p-4 text-white outline-none"
        />

        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="mb-4 w-full rounded-xl bg-white/5 border border-white/10 p-4 text-white outline-none"
        />

        <input
          name="password"
          type="password"
          placeholder="Пароль"
          required
          className="mb-6 w-full rounded-xl bg-white/5 border border-white/10 p-4 text-white outline-none"
        />

        <button
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 py-4 font-semibold text-white"
        >
          {loading ? "Создание..." : "Создать аккаунт"}
        </button>
      </form>
    </main>
  );
}