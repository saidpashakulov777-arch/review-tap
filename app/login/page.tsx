"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type UserRole = "admin" | "client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
  setIsCheckingSession(false);
}, []);

  async function redirectByRole(userId: string) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      throw new Error(
        profileError?.message || "Профиль пользователя не найден."
      );
    }

    const role = profile.role as UserRole;

    if (role === "admin") {
      router.replace("/admin");
    } else {
      router.replace("/dashboard");
    }

    router.refresh();
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setErrorMessage("Заполни email и пароль.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("Не удалось получить пользователя.");
      }

      await redirectByRole(data.user.id);
    } catch (error) {
      console.error("Ошибка входа:", error);

      setErrorMessage(
        error instanceof Error
          ? translateLoginError(error.message)
          : "Не удалось войти в аккаунт."
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-blue-500" />

          <p className="mt-5 text-sm text-slate-400">
            Проверяем аккаунт...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-5 py-12 text-white">
      <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-600/20 blur-[120px]" />

      <div className="relative w-full max-w-md">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold">
            R
          </div>

          <span className="text-xl font-bold">
            ReviewTap
          </span>
        </Link>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">
              Вход в аккаунт
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Введи email и пароль для входа в ReviewTap.
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="mt-8 space-y-5"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                Пароль
              </label>

              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Введите пароль"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
              />
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3.5 font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Входим..." : "Войти"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-500">
            Аккаунт создаётся администратором ReviewTap.
          </p>
        </div>
      </div>
    </main>
  );
}

function translateLoginError(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "Неверный email или пароль.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "Сначала подтверди email.";
  }

  if (normalizedMessage.includes("too many requests")) {
    return "Слишком много попыток. Попробуй немного позже.";
  }

  return message;
}