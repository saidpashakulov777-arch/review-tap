"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

import { supabase } from "@/lib/supabase";

type NfcTag = {
  id: string;
  branchId: string | null;
  name: string;
  code: string;
  googleReviewUrl: string;
  publicPath: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

type ApiResponse = {
  success?: boolean;
  tag?: NfcTag;
  message?: string;
};

export default function AdminNfcTagPage() {
  const router = useRouter();

  const params = useParams<{
    tagId: string;
  }>();

  const tagId = params.tagId;

  const [tag, setTag] =
    useState<NfcTag | null>(null);

  const [name, setName] =
    useState("");

  const [
    googleReviewUrl,
    setGoogleReviewUrl,
  ] = useState("");

  const [isActive, setIsActive] =
    useState(true);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    if (tagId) {
      void loadTag();
    }
  }, [tagId]);

  async function getToken() {
    const {
      data: { session },
      error: sessionError,
    } =
      await supabase.auth.getSession();

    if (
      sessionError ||
      !session?.access_token
    ) {
      router.replace(
        `/login?next=${encodeURIComponent(
          `/admin/nfc-tags/${tagId}`,
        )}`,
      );

      return null;
    }

    return session.access_token;
  }

  async function loadTag() {
    setLoading(true);
    setError("");

    try {
      const token =
        await getToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        `/api/admin/nfc-tags/${tagId}`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },

          cache: "no-store",
        },
      );

      const result =
        (await response.json()) as ApiResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.tag
      ) {
        throw new Error(
          result.message ||
            "Не удалось загрузить NFC-метку.",
        );
      }

      setTag(result.tag);
      setName(result.tag.name);

      setGoogleReviewUrl(
        result.tag.googleReviewUrl,
      );

      setIsActive(
        result.tag.isActive,
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить NFC-метку.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!name.trim()) {
      setError(
        "Введите название NFC-метки.",
      );

      return;
    }

    if (!googleReviewUrl.trim()) {
      setError(
        "Введите Google-ссылку.",
      );

      return;
    }

    try {
      setSaving(true);

      const token =
        await getToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        `/api/admin/nfc-tags/${tagId}`,
        {
          method: "PATCH",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name: name.trim(),

            googleReviewUrl:
              googleReviewUrl.trim(),

            isActive,
          }),

          cache: "no-store",
        },
      );

      const result =
        (await response.json()) as ApiResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.tag
      ) {
        throw new Error(
          result.message ||
            "Не удалось сохранить изменения.",
        );
      }

      setTag(result.tag);
      setName(result.tag.name);

      setGoogleReviewUrl(
        result.tag.googleReviewUrl,
      );

      setIsActive(
        result.tag.isActive,
      );

      setMessage(
        "Изменения сохранены.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Не удалось сохранить изменения.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function copyPublicLink() {
    if (!tag) {
      return;
    }

    const link =
      `${window.location.origin}${tag.publicPath}`;

    await navigator.clipboard.writeText(
      link,
    );

    setMessage(
      "NFC-ссылка скопирована.",
    );
  }

  const backHref =
    tag?.branchId
      ? `/admin/branches/${tag.branchId}`
      : "/admin/branches";

  return (
    <main className="min-h-screen bg-[#050816] px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="border-b border-white/10 pb-7">
          <Link
            href={backHref}
            className="text-sm font-semibold text-blue-400 hover:text-blue-300"
          >
            ← Назад к NFC-меткам
          </Link>

          <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-blue-400">
            ReviewTap Admin
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            Управление NFC-меткой
          </h1>

          <p className="mt-3 text-sm text-gray-400">
            Изменение названия,
            Google-ссылки и статуса
            NFC-метки.
          </p>
        </header>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
            {message}
          </div>
        )}

        {loading ? (
          <div className="mt-8 h-80 animate-pulse rounded-[28px] bg-white/[0.04]" />
        ) : tag ? (
          <>
            <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
              <form
                onSubmit={handleSave}
              >
                <label className="block text-sm font-semibold text-gray-300">
                  Название NFC-метки
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value,
                    )
                  }
                  placeholder="Например: Касса"
                  maxLength={120}
                  disabled={saving}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm outline-none placeholder:text-gray-600 focus:border-blue-500"
                />

                <label className="mt-6 block text-sm font-semibold text-gray-300">
                  Google Review URL
                </label>

                <input
                  type="url"
                  value={googleReviewUrl}
                  onChange={(event) =>
                    setGoogleReviewUrl(
                      event.target.value,
                    )
                  }
                  placeholder="https://maps.app.goo.gl/..."
                  disabled={saving}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm outline-none placeholder:text-gray-600 focus:border-blue-500"
                />

                <label className="mt-6 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div>
                    <p className="font-semibold">
                      NFC-метка активна
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Отключённая ссылка не
                      будет вести посетителя
                      в Google.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(event) =>
                      setIsActive(
                        event.target.checked,
                      )
                    }
                    disabled={saving}
                    className="h-5 w-5"
                  />
                </label>

                <button
                  type="submit"
                  disabled={saving}
                  className="mt-7 w-full rounded-2xl bg-blue-600 px-6 py-4 text-sm font-bold transition hover:bg-blue-500 disabled:opacity-50"
                >
                  {saving
                    ? "Сохраняем..."
                    : "Сохранить изменения"}
                </button>
              </form>
            </section>

            <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">
                    Статус
                  </p>

                  <p
                    className={`mt-2 font-bold ${
                      tag.isActive
                        ? "text-emerald-300"
                        : "text-red-300"
                    }`}
                  >
                    {tag.isActive
                      ? "Активна"
                      : "Отключена"}
                  </p>
                </div>

                <code className="rounded-xl bg-black/30 px-3 py-2 text-sm text-blue-300">
                  {tag.code}
                </code>
              </div>

              <p className="mt-5 break-all rounded-xl bg-black/20 px-4 py-3 text-sm text-blue-300">
                {typeof window !==
                "undefined"
                  ? `${window.location.origin}${tag.publicPath}`
                  : tag.publicPath}
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    void copyPublicLink()
                  }
                  className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500"
                >
                  Скопировать NFC-ссылку
                </button>

                <a
                  href={tag.publicPath}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/[0.05]"
                >
                  Проверить переход
                </a>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}