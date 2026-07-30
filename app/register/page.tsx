"use client";

import Link from "next/link";
import {
  FormEvent,
  useState,
} from "react";

type RegisterResponse = {
  success: boolean;

  message?: string;

  user?: {
    id: string;
    email: string;
  };

  confirmationRequired?: boolean;
};

type MessageState =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

export default function RegisterPage() {
  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [registered, setRegistered] =
    useState(false);

  const [message, setMessage] =
    useState<MessageState>(null);

  async function handleRegister(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage(null);
    setRegistered(false);

    const cleanName =
      fullName.trim();

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanName) {
      setMessage({
        type: "error",
        text: "Введите ваше имя.",
      });

      return;
    }

    if (!cleanEmail) {
      setMessage({
        type: "error",
        text: "Введите email.",
      });

      return;
    }

    if (password.length < 6) {
      setMessage({
        type: "error",
        text: "Пароль должен содержать минимум 6 символов.",
      });

      return;
    }

    if (
      password !== confirmPassword
    ) {
      setMessage({
        type: "error",
        text: "Пароли не совпадают.",
      });

      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "/api/auth/register",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            fullName: cleanName,
            email: cleanEmail,
            password,
          }),

          cache: "no-store",
        },
      );

      const responseText =
        await response.text();

      let result: RegisterResponse;

      try {
        result = JSON.parse(
          responseText,
        ) as RegisterResponse;
      } catch {
        throw new Error(
          "Сервер регистрации вернул неправильный ответ.",
        );
      }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Не удалось создать аккаунт.",
        );
      }

      setRegistered(true);

      setMessage({
        type: "success",

        text:
          result.message ||
          (
            result.confirmationRequired
              ? "Аккаунт создан. Проверьте почту и подтвердите email."
              : "Аккаунт создан. Теперь войдите в систему."
          ),
      });

      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setMessage({
        type: "error",

        text:
          error instanceof Error
            ? error.message
            : "Не удалось создать аккаунт.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050816] px-5 py-12 text-white">
      <div className="pointer-events-none absolute left-[-220px] top-[-220px] h-[520px] w-[520px] rounded-full bg-purple-600/15 blur-[150px]" />

      <div className="pointer-events-none absolute bottom-[-220px] right-[-180px] h-[520px] w-[520px] rounded-full bg-blue-600/15 blur-[150px]" />

      <section className="relative w-full max-w-md rounded-[30px] border border-white/10 bg-white/[0.035] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <Link
          href="/"
          className="flex items-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 text-lg font-black shadow-lg shadow-purple-600/20">
            R
          </div>

          <div>
            <p className="font-bold">
              ReviewTap
            </p>

            <p className="text-xs text-gray-500">
              Система управления отзывами
            </p>
          </div>
        </Link>

        <div className="mt-8">
          <h1 className="text-3xl font-black tracking-tight">
            Создать аккаунт
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-400">
            Зарегистрируйтесь и получите
            14 дней пробного периода.
          </p>
        </div>

        {message && (
          <div
            className={`mt-6 rounded-2xl border px-4 py-3 text-sm leading-6 ${
              message.type === "success"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                : "border-red-500/20 bg-red-500/10 text-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {registered ? (
          <div className="mt-7 space-y-3">
            <Link
              href="/login"
              className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-600/20 transition hover:brightness-110"
            >
              Перейти ко входу
            </Link>

            <button
              type="button"
              onClick={() => {
                setRegistered(false);
                setMessage(null);
                setFullName("");
                setEmail("");
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3.5 text-sm font-semibold text-gray-300 transition hover:bg-white/[0.07]"
            >
              Зарегистрировать другой аккаунт
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleRegister}
            className="mt-7 space-y-4"
          >
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-300">
                Имя
              </span>

              <input
                type="text"
                value={fullName}
                onChange={(event) =>
                  setFullName(
                    event.target.value,
                  )
                }
                placeholder="Ваше имя"
                autoComplete="name"
                disabled={loading}
                maxLength={100}
                required
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-500 disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-300">
                Email
              </span>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value,
                  )
                }
                placeholder="example@gmail.com"
                autoComplete="email"
                disabled={loading}
                required
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-500 disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-300">
                Пароль
              </span>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                placeholder="Минимум 6 символов"
                autoComplete="new-password"
                disabled={loading}
                minLength={6}
                maxLength={72}
                required
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-500 disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-300">
                Повторите пароль
              </span>

              <input
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value,
                  )
                }
                placeholder="Повторите пароль"
                autoComplete="new-password"
                disabled={loading}
                minLength={6}
                maxLength={72}
                required
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-500 disabled:opacity-60"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-600/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Создание..."
                : "Создать аккаунт"}
            </button>
          </form>
        )}

        {!registered && (
          <p className="mt-6 text-center text-sm text-gray-500">
            Уже есть аккаунт?{" "}
            <Link
              href="/login"
              className="font-semibold text-purple-400 transition hover:text-purple-300"
            >
              Войти
            </Link>
          </p>
        )}
      </section>
    </main>
  );
}