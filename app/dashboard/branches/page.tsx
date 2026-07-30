"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type Branch = {
  id: string;
  restaurantId: string | null;
  restaurantName: string;
  name: string;
  address: string;
  createdAt: string | null;
  nfcTagCount: number;
  tapCount: number;
  publicPath: string | null;
};

type BranchesResponse = {
  success: boolean;
  branches?: Branch[];
  message?: string;
};

export default function DashboardBranchesPage() {
  const router = useRouter();

  const [branches, setBranches] =
    useState<Branch[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    void loadBranches();
  }, []);

  const filteredBranches =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return branches;
      }

      return branches.filter(
        (branch) =>
          branch.name
            .toLowerCase()
            .includes(query) ||
          branch.restaurantName
            .toLowerCase()
            .includes(query) ||
          branch.address
            .toLowerCase()
            .includes(query),
      );
    }, [branches, search]);

  const totalTags =
    branches.reduce(
      (total, branch) =>
        total + branch.nfcTagCount,
      0,
    );

  const totalTaps =
    branches.reduce(
      (total, branch) =>
        total + branch.tapCount,
      0,
    );

  async function loadBranches() {
    setLoading(true);
    setError("");

    try {
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
            "/dashboard/branches",
          )}`,
        );

        return;
      }

      const response = await fetch(
        "/api/dashboard/branches",
        {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        },
      );

      const result =
        (await response.json()) as BranchesResponse;

      if (response.status === 401) {
        router.replace(
          `/login?next=${encodeURIComponent(
            "/dashboard/branches",
          )}`,
        );

        return;
      }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Не удалось загрузить филиалы.",
        );
      }

      setBranches(
        result.branches ?? [],
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить филиалы.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050816] px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-blue-400 transition hover:text-blue-300"
            >
              ← Вернуться в кабинет
            </Link>

            <h1 className="mt-4 text-3xl font-black sm:text-4xl">
              Филиалы
            </h1>

            <p className="mt-3 text-sm leading-7 text-gray-400">
              Все филиалы ваших
              ресторанов и статистика
              NFC-переходов.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadBranches()
            }
            disabled={loading}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold transition hover:bg-white/[0.08] disabled:opacity-50"
          >
            {loading
              ? "Обновляем..."
              : "Обновить"}
          </button>
        </header>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Филиалы"
            value={branches.length}
          />

          <StatCard
            label="NFC-метки"
            value={totalTags}
          />

          <StatCard
            label="Все переходы"
            value={totalTaps}
          />
        </section>

        <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                Мои филиалы
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Найдено:{" "}
                {filteredBranches.length}
              </p>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Поиск филиала..."
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-blue-500 sm:max-w-sm"
            />
          </div>

          {loading ? (
            <LoadingState />
          ) : filteredBranches.length ===
            0 ? (
            <EmptyState
              hasSearch={Boolean(
                search.trim(),
              )}
            />
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredBranches.map(
                (branch) => (
                  <BranchCard
                    key={branch.id}
                    branch={branch}
                  />
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function BranchCard({
  branch,
}: {
  branch: Branch;
}) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-black/10 p-5 transition hover:-translate-y-1 hover:border-blue-500/30">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-2xl">
          📍
        </div>

        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
          Активен
        </span>
      </div>

      <h3 className="mt-5 text-xl font-bold">
        {branch.name}
      </h3>

      <p className="mt-2 text-sm font-medium text-blue-300">
        {branch.restaurantName}
      </p>

      <p className="mt-3 min-h-12 text-sm leading-6 text-gray-500">
        {branch.address ||
          "Адрес не указан"}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <p className="text-xs text-gray-600">
            NFC-метки
          </p>

          <p className="mt-1 text-xl font-black">
            {branch.nfcTagCount}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <p className="text-xs text-gray-600">
            Переходы
          </p>

          <p className="mt-1 text-xl font-black">
            {branch.tapCount}
          </p>
        </div>
      </div>

      <Link
        href={`/dashboard/branches/${branch.id}`}
        className="mt-5 flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold transition hover:bg-blue-500"
      >
        {branch.nfcTagCount > 0
          ? "Управлять NFC-метками"
          : "Добавить NFC-метку"}
      </Link>

      {branch.publicPath && (
        <a
          href={branch.publicPath}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex w-full items-center justify-center rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-gray-300 transition hover:bg-white/[0.05]"
        >
          Проверить NFC-ссылку
        </a>
      )}

      <p className="mt-4 text-xs text-gray-600">
        Создан:{" "}
        {formatDate(
          branch.createdAt,
        )}
      </p>
    </article>
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
        {value.toLocaleString(
          "ru-RU",
        )}
      </p>
    </article>
  );
}

function LoadingState() {
  return (
    <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-80 animate-pulse rounded-[24px] bg-white/[0.04]"
        />
      ))}
    </div>
  );
}

function EmptyState({
  hasSearch,
}: {
  hasSearch: boolean;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
      <div className="text-4xl">
        📍
      </div>

      <h3 className="mt-5 text-xl font-bold">
        {hasSearch
          ? "Ничего не найдено"
          : "Филиалов пока нет"}
      </h3>

      <p className="mt-2 text-sm text-gray-500">
        {hasSearch
          ? "Измените поисковый запрос."
          : "Сначала создайте ресторан, а затем добавьте в него филиал."}
      </p>

      {!hasSearch && (
        <Link
          href="/dashboard/restaurants"
          className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
        >
          Перейти к ресторанам
        </Link>
      )}
    </div>
  );
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
      timeZone: "Asia/Tashkent",
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}