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
  name: string;
  address: string;
  restaurantId: string;
  restaurantName: string;
  ownerId: string | null;
};

type NfcTag = {
  id: string;
  code: string;
  googleReviewUrl: string;
  publicPath: string;
  createdAt: string | null;
  tapCount: number;
};

type ApiResponse = {
  success: boolean;
  branch?: Branch;
  tags?: NfcTag[];
  tag?: NfcTag;
  message?: string;
};

export default function AdminBranchNfcPage() {
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

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
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
      error: sessionError,
    } =
      await supabase.auth.getSession();

    if (
      sessionError ||
      !session?.access_token
    ) {
      router.replace(
        `/login?next=${encodeURIComponent(
          `/admin/branches/${branchId}`,
        )}`,
      );

      return null;
    }

    return session.access_token;
  }

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const token =
        await getAccessToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        `/api/admin/branches/${branchId}/nfc-tags`,
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
        response.status === 401 ||
        response.status === 403
      ) {
        router.replace("/dashboard");
        return;
      }

      if (
        !response.ok ||
        !result.success ||
        !result.branch
      ) {
        throw new Error(
          result.message ||
            "Не удалось загрузить филиал.",
        );
      }

      setBranch(result.branch);
      setTags(result.tags ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить данные.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    const cleanUrl =
      googleReviewUrl.trim();

    if (!cleanUrl) {
      setError(
        "Вставьте ссылку Google.",
      );
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
        `/api/admin/branches/${branchId}/nfc-tags`,
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
        (await response.json()) as ApiResponse;

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

      setMessage(
        "NFC-ссылка создана.",
      );
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Не удалось создать NFC-метку.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function copyLink(
    publicPath: string,
  ) {
    const link =
      `${window.location.origin}${publicPath}`;

    await navigator.clipboard.writeText(
      link,
    );

    setMessage(
      "NFC-ссылка скопирована.",
    );
  }

  return (
    <main className="min-h-screen bg-[#050816] px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-white/10 pb-7">
          <Link
            href="/admin/branches"
            className="text-sm font-semibold text-blue-400 hover:text-blue-300"
          >
            ← Все филиалы
          </Link>

          <h1 className="mt-4 text-3xl font-black sm:text-4xl">
            {branch?.name ??
              "Управление NFC"}
          </h1>

          <p className="mt-3 text-sm text-gray-400">
            {branch?.restaurantName}

            {branch?.address
              ? ` · ${branch.address}`
              : ""}
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

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="NFC-метки"
            value={tags.length}
          />

          <StatCard
            label="Все переходы"
            value={totalTaps}
          />

          <StatCard
            label="Филиал"
            value={branch ? 1 : 0}
          />
        </section>

        <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-bold">
            Создать NFC-ссылку
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Вставьте ссылку Google
            ресторана. Полученную ссылку
            ReviewTap нужно записать на
            NFC-карту.
          </p>

          <form
            onSubmit={handleCreate}
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
              placeholder="https://maps.app.goo.gl/..."
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
          <div className="mt-8 h-64 animate-pulse rounded-[28px] bg-white/[0.04]" />
        ) : tags.length === 0 ? (
          <section className="mt-8 rounded-[28px] border border-dashed border-white/10 px-6 py-16 text-center">
            <p className="text-4xl">
              📲
            </p>

            <h2 className="mt-5 text-xl font-bold">
              NFC-меток пока нет
            </h2>
          </section>
        ) : (
          <section className="mt-8 grid gap-5 lg:grid-cols-2">
            {tags.map((tag) => (
              <article
                key={tag.id}
                className="rounded-[26px] border border-white/10 bg-white/[0.03] p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">
                    📲
                  </span>

                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    Активна
                  </span>
                </div>

                <p className="mt-5 text-xs uppercase tracking-wider text-gray-600">
                  NFC-ссылка
                </p>

                <p className="mt-2 break-all rounded-xl bg-black/20 px-4 py-3 text-sm text-blue-300">
                  {typeof window !==
                  "undefined"
                    ? `${window.location.origin}${tag.publicPath}`
                    : tag.publicPath}
                </p>

                <div className="mt-4 rounded-xl border border-white/10 p-4">
                  <p className="text-xs text-gray-600">
                    Переходы
                  </p>

                  <p className="mt-1 text-2xl font-black">
                    {tag.tapCount}
                  </p>
                </div>

                                <Link
                  href={`/admin/nfc-tags/${tag.id}`}
                  className="mt-4 flex w-full items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-300 transition hover:bg-blue-500/20"
                >
                  Редактировать NFC-метку
                </Link>

<button
                  type="button"
                  onClick={() =>
                    void copyLink(
                      tag.publicPath,
                    )
                  }
                  className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500"
                >
                  Скопировать для NFC
                </button>

                <a
                  href={tag.publicPath}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex w-full items-center justify-center rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-gray-300 hover:bg-white/[0.05]"
                >
                  Проверить переход
                </a>

                <a
                  href={tag.googleReviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex w-full items-center justify-center rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-gray-300 hover:bg-white/[0.05]"
                >
                  Открыть Google-ссылку
                </a>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-2xl border border-blue-500/15 bg-blue-500/[0.06] px-5 py-4">
      <p className="text-xs uppercase tracking-wider text-blue-300">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black">
        {value}
      </p>
    </article>
  );
}
