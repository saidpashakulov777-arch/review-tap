"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

import { supabase } from "@/lib/supabase";

type Branch = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  name: string;
  address: string;
  createdAt: string | null;
};

type NfcTag = {
  id: string;
  code: string;
  googleReviewUrl: string;
  publicPath: string;
  createdAt: string | null;
  tapCount: number;
};

type NfcResponse = {
  success: boolean;
  branch?: Branch;
  tags?: NfcTag[];
  tag?: NfcTag;
  message?: string;
};

type MessageState =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

export default function BranchNfcPage() {
  const router = useRouter();

  const params = useParams<{
    branchId: string;
  }>();

  const branchId = params.branchId;

  const [branch, setBranch] =
    useState<Branch | null>(null);

  const [tags, setTags] =
    useState<NfcTag[]>([]);

  const [
    googleReviewUrl,
    setGoogleReviewUrl,
  ] = useState("");

  const [siteOrigin, setSiteOrigin] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [message, setMessage] =
    useState<MessageState>(null);

  useEffect(() => {
    setSiteOrigin(
      window.location.origin,
    );

    if (branchId) {
      void loadData();
    }
  }, [branchId]);

  const totalTaps = useMemo(
    () =>
      tags.reduce(
        (total, tag) =>
          total + tag.tapCount,
        0,
      ),
    [tags],
  );

  async function getAccessToken() {
    const {
      data: { session },
      error,
    } =
      await supabase.auth.getSession();

    if (
      error ||
      !session?.access_token
    ) {
      router.replace(
        `/login?next=${encodeURIComponent(
          `/dashboard/branches/${branchId}`,
        )}`,
      );

      return null;
    }

    return session.access_token;
  }

  async function loadData() {
    setLoading(true);
    setMessage(null);

    try {
      const token =
        await getAccessToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        `/api/branches/${branchId}/nfc-tags`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );

      const result =
        (await response.json()) as NfcResponse;

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (
        !response.ok ||
        !result.success ||
        !result.branch
      ) {
        throw new Error(
          result.message ||
            "Не удалось загрузить NFC-метки.",
        );
      }

      setBranch(result.branch);
      setTags(result.tags ?? []);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Не удалось загрузить данные.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTag(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setMessage(null);

    const cleanUrl =
      googleReviewUrl.trim();

    if (!cleanUrl) {
      setMessage({
        type: "error",
        text:
          "Вставьте Google Review URL.",
      });
      return;
    }

    try {
      setCreating(true);

      const token =
        await getAccessToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        `/api/branches/${branchId}/nfc-tags`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            googleReviewUrl:
              cleanUrl,
          }),

          cache: "no-store",
        },
      );

      const result =
        (await response.json()) as NfcResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.tag
      ) {
        throw new Error(
          result.message ||
            "Не удалось создать NFC-метку.",
        );
      }

      setTags((current) => [
        result.tag as NfcTag,
        ...current,
      ]);

      setGoogleReviewUrl("");

      setMessage({
        type: "success",
        text:
          "NFC-ссылка успешно создана.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Не удалось создать NFC-метку.",
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy(
    publicPath: string,
  ) {
    const fullUrl =
      `${window.location.origin}${publicPath}`;

    try {
      await copyText(fullUrl);

      setMessage({
        type: "success",
        text:
          "NFC-ссылка скопирована.",
      });
    } catch {
      setMessage({
        type: "error",
        text:
          "Не удалось скопировать ссылку.",
      });
    }
  }

  return (
    <main className="min-h-screen bg-[#050816] px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href={
                branch?.restaurantId
                  ? `/dashboard/restaurants/${branch.restaurantId}`
                  : "/dashboard/restaurants"
              }
              className="text-sm font-semibold text-blue-400 hover:text-blue-300"
            >
              ← Вернуться к филиалам
            </Link>

            <h1 className="mt-4 text-3xl font-black sm:text-4xl">
              {branch?.name ??
                "NFC-метки филиала"}
            </h1>

            <p className="mt-3 text-sm leading-7 text-gray-400">
              {branch?.restaurantName}

              {branch?.address
                ? ` · ${branch.address}`
                : ""}
            </p>
          </div>

          <div className="flex gap-3">
            <StatBox
              label="NFC-метки"
              value={tags.length}
            />

            <StatBox
              label="Переходы"
              value={totalTaps}
            />
          </div>
        </header>

        {message && (
          <div
            className={`mt-6 flex items-start justify-between gap-4 rounded-2xl border px-5 py-4 text-sm ${
              message.type === "success"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                : "border-red-500/20 bg-red-500/10 text-red-200"
            }`}
          >
            <p>{message.text}</p>

            <button
              type="button"
              onClick={() =>
                setMessage(null)
              }
            >
              ×
            </button>
          </div>
        )}

        <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-bold">
            Создать NFC-ссылку
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Вставьте ссылку Google для
            публикации отзыва. В
            физическую NFC-карту будет
            записываться ссылка
            ReviewTap, а не сама
            Google-ссылка.
          </p>

          <form
            onSubmit={handleCreateTag}
            className="mt-5 flex flex-col gap-3 lg:flex-row"
          >
            <input
              type="url"
              value={googleReviewUrl}
              onChange={(event) =>
                setGoogleReviewUrl(
                  event.target.value,
                )
              }
              placeholder="https://g.page/r/.../review"
              disabled={creating}
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm outline-none placeholder:text-gray-600 focus:border-blue-500"
            />

            <button
              type="submit"
              disabled={creating}
              className="rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-bold hover:bg-blue-500 disabled:opacity-50"
            >
              {creating
                ? "Создаём..."
                : "Создать NFC-ссылку"}
            </button>
          </form>
        </section>

        {loading ? (
          <div className="mt-8 h-64 animate-pulse rounded-[28px] border border-white/10 bg-white/[0.03]" />
        ) : tags.length === 0 ? (
          <section className="mt-8 rounded-[28px] border border-dashed border-white/10 px-6 py-16 text-center">
            <div className="text-4xl">
              📲
            </div>

            <h2 className="mt-5 text-xl font-bold">
              NFC-меток пока нет
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Создайте первую NFC-ссылку
              с помощью формы выше.
            </p>
          </section>
        ) : (
          <section className="mt-8 grid gap-5 lg:grid-cols-2">
            {tags.map((tag) => {
              const fullUrl =
                siteOrigin
                  ? `${siteOrigin}${tag.publicPath}`
                  : tag.publicPath;

              return (
                <article
                  key={tag.id}
                  className="rounded-[26px] border border-white/10 bg-white/[0.03] p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-2xl">
                      📲
                    </div>

                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                      Активна
                    </span>
                  </div>

                  <p className="mt-5 text-xs uppercase tracking-wider text-gray-600">
                    NFC-ссылка
                  </p>

                  <p className="mt-2 break-all rounded-xl bg-black/20 px-4 py-3 text-sm text-blue-300">
                    {fullUrl}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 p-4">
                      <p className="text-xs text-gray-600">
                        Переходы
                      </p>

                      <p className="mt-1 text-2xl font-black">
                        {tag.tapCount}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 p-4">
                      <p className="text-xs text-gray-600">
                        Создана
                      </p>

                      <p className="mt-2 text-sm font-semibold">
                        {formatDate(
                          tag.createdAt,
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void handleCopy(
                        tag.publicPath,
                      )
                    }
                    className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500"
                  >
                    Скопировать NFC-ссылку
                  </button>

                  <a
                    href={
                      tag.googleReviewUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 flex w-full items-center justify-center rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-gray-300 hover:bg-white/[0.05]"
                  >
                    Проверить Google-ссылку
                  </a>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

function StatBox({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-3">
      <p className="text-xs uppercase tracking-wider text-blue-300">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black">
        {value}
      </p>
    </div>
  );
}

async function copyText(
  value: string,
) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(
      value,
    );
    return;
  }

  const textarea =
    document.createElement("textarea");

  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);
  textarea.select();

  document.execCommand("copy");
  textarea.remove();
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "не указано";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "не указано";
  }

  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}