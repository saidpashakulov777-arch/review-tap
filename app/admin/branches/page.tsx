"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type AdminBranch = {
  id: string;
  name: string;
  address: string;
  city: string;
  restaurantId: string;
  restaurantName: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  companyName: string;
  googleReviewUrl: string;
  isActive: boolean;
  nfcTagCount: number;
  activeNfcTagCount: number;
  tapCount: number;
  createdAt: string;
  updatedAt: string;
};

type RestaurantOption = {
  id: string;
  name: string;
};

type BranchesResponse = {
  success: boolean;
  branches?: AdminBranch[];
  restaurants?: RestaurantOption[];
  message?: string;
};

const navigation = [
  {
    name: "Обзор",
    href: "/admin",
  },
  {
    name: "Клиенты",
    href: "/admin/customers",
  },
  {
    name: "Рестораны",
    href: "/admin/restaurants",
  },
  {
    name: "Филиалы",
    href: "/admin/branches",
  },
  {
    name: "Аналитика",
    href: "/admin/analytics",
  },
];

export default function AdminBranchesPage() {
  const router = useRouter();

  const [branches, setBranches] =
    useState<AdminBranch[]>([]);

  const [
    restaurantOptions,
    setRestaurantOptions,
  ] = useState<
    RestaurantOption[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [
    restaurantFilter,
    setRestaurantFilter,
  ] = useState("all");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    void loadBranches(false);
  }, []);

  async function loadBranches(
    refresh: boolean,
  ) {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage("");

    try {
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
            "/admin/branches",
          )}`,
        );
        return;
      }

      const response = await fetch(
        "/api/admin/branches",
        {
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
            "/admin/branches",
          )}`,
        );
        return;
      }

      if (response.status === 403) {
        router.replace("/dashboard");
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

      setRestaurantOptions(
        result.restaurants ?? [],
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить филиалы.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const statistics = useMemo(() => {
    let activeBranches = 0;
    let nfcTags = 0;
    let taps = 0;

    for (const branch of branches) {
      if (branch.isActive) {
        activeBranches += 1;
      }

      nfcTags +=
        branch.nfcTagCount;

      taps += branch.tapCount;
    }

    return {
      total: branches.length,
      active: activeBranches,
      nfcTags,
      taps,
    };
  }, [branches]);

  const filteredBranches =
    useMemo(() => {
      const normalizedSearch =
        search.trim().toLowerCase();

      return branches.filter(
        (branch) => {
          const matchesSearch =
            !normalizedSearch ||
            [
              branch.name,
              branch.address,
              branch.city,
              branch.restaurantName,
              branch.ownerEmail,
              branch.companyName,
            ]
              .join(" ")
              .toLowerCase()
              .includes(
                normalizedSearch,
              );

          const matchesRestaurant =
            restaurantFilter === "all" ||
            branch.restaurantId ===
              restaurantFilter;

          const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "active" &&
              branch.isActive) ||
            (statusFilter ===
              "inactive" &&
              !branch.isActive);

          return (
            matchesSearch &&
            matchesRestaurant &&
            matchesStatus
          );
        },
      );
    }, [
      branches,
      search,
      restaurantFilter,
      statusFilter,
    ]);

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <header className="border-b border-white/10 bg-[#050816]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-blue-400">
              ReviewTap Admin
            </p>

            <h1 className="mt-2 text-2xl font-black">
              Филиалы
            </h1>
          </div>

          <nav className="flex gap-2 overflow-x-auto">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  item.href ===
                  "/admin/branches"
                    ? "bg-blue-600 text-white"
                    : "border border-white/10 bg-white/[0.03] text-gray-400 hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      
          <Link
            href="/admin/branches/new"
            className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
          >
            + Создать филиал
          </Link>
</header>

      <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-400">
              Все точки
            </p>

            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Филиалы ресторанов
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-400">
              Все филиалы, NFC-метки и
              количество переходов.
            </p>
          </div>

          <button
            type="button"
            disabled={refreshing}
            onClick={() =>
              void loadBranches(true)
            }
            className="w-fit rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
          >
            {refreshing
              ? "Обновляем..."
              : "Обновить данные"}
          </button>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Все филиалы"
            value={statistics.total}
          />

          <StatCard
            title="Активные"
            value={statistics.active}
          />

          <StatCard
            title="NFC-метки"
            value={statistics.nfcTags}
          />

          <StatCard
            title="Переходы"
            value={statistics.taps}
          />
        </section>

        <section className="mt-8 grid gap-4 rounded-[28px] border border-white/10 bg-white/[0.03] p-5 lg:grid-cols-[minmax(0,1fr)_250px_200px]">
          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Название, адрес или ресторан"
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />

          <select
            value={restaurantFilter}
            onChange={(event) =>
              setRestaurantFilter(
                event.target.value,
              )
            }
            className="rounded-xl border border-white/10 bg-[#0d1320] px-4 py-3 text-sm"
          >
            <option value="all">
              Все рестораны
            </option>

            {restaurantOptions.map(
              (restaurant) => (
                <option
                  key={restaurant.id}
                  value={restaurant.id}
                >
                  {restaurant.name}
                </option>
              ),
            )}
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value,
              )
            }
            className="rounded-xl border border-white/10 bg-[#0d1320] px-4 py-3 text-sm"
          >
            <option value="all">
              Все статусы
            </option>
            <option value="active">
              Активные
            </option>
            <option value="inactive">
              Неактивные
            </option>
          </select>
        </section>

        {loading ? (
          <LoadingRows />
        ) : filteredBranches.length ===
          0 ? (
          <EmptyState />
        ) : (
          <section className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03]">
            <div className="hidden grid-cols-[minmax(210px,1.2fr)_minmax(210px,1fr)_minmax(220px,1fr)_100px_100px_120px] gap-4 border-b border-white/10 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-600 xl:grid">
              <span>Филиал</span>
              <span>Ресторан</span>
              <span>Адрес</span>
              <span>NFC</span>
              <span>Переходы</span>
              <span>Статус</span>
            </div>

            <div className="divide-y divide-white/10">
              {filteredBranches.map(
                (branch) => (
                  <BranchRow
                    key={branch.id}
                    branch={branch}
                  />
                ),
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-3 text-3xl font-black">
        {value}
      </p>
    </article>
  );
}

function BranchRow({
  branch,
}: {
  branch: AdminBranch;
}) {
  return (
    <article className="grid gap-5 px-6 py-5 hover:bg-white/[0.025] xl:grid-cols-[minmax(210px,1.2fr)_minmax(210px,1fr)_minmax(220px,1fr)_100px_100px_120px] xl:items-center">
      <div>
        <MobileLabel text="Филиал" />

        <p className="font-semibold">
          {branch.name}
        </p>

        <p className="mt-1 text-xs text-gray-600">
          Создан:{" "}
          {formatDate(
            branch.createdAt,
          )}
        </p>
      </div>

      <div>
        <MobileLabel text="Ресторан" />

        <p className="text-sm font-medium text-gray-300">
          {branch.restaurantName}
        </p>

        <p className="mt-1 truncate text-xs text-gray-600">
          {branch.ownerEmail ||
            "Владелец не указан"}
        </p>
      </div>

      <div>
        <MobileLabel text="Адрес" />

        <p className="text-sm text-gray-300">
          {branch.address}
        </p>

        {branch.city && (
          <p className="mt-1 text-xs text-gray-600">
            {branch.city}
          </p>
        )}
      </div>

      <div>
        <MobileLabel text="NFC" />

        <p className="font-bold">
          {branch.activeNfcTagCount}/
          {branch.nfcTagCount}
        </p>
      </div>

      <div>
        <MobileLabel text="Переходы" />

        <p className="font-bold">
          {branch.tapCount}
        </p>
      </div>

      <div>
        <MobileLabel text="Статус" />

        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
            branch.isActive
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/20 bg-red-500/10 text-red-300"
          }`}
        >
          {branch.isActive
            ? "Активен"
            : "Отключён"}
        </span>

        <Link
          href={`/admin/branches/${branch.id}`}
          className="mt-3 block text-xs font-semibold text-blue-400 hover:text-blue-300"
        >
          Управлять NFC →
        </Link>

        {branch.googleReviewUrl && (
          <a
            href={
              branch.googleReviewUrl
            }
            target="_blank"
            rel="noreferrer"
            className="mt-3 block text-xs font-semibold text-blue-400 hover:text-blue-300"
          >
            Google-ссылка →
          </a>
        )}
      </div>
    </article>
  );
}

function MobileLabel({
  text,
}: {
  text: string;
}) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-600 xl:hidden">
      {text}
    </p>
  );
}

function LoadingRows() {
  return (
    <div className="mt-6 space-y-3">
      {[1, 2, 3, 4].map(
        (item) => (
          <div
            key={item}
            className="h-28 animate-pulse rounded-[24px] border border-white/10 bg-white/[0.03]"
          />
        ),
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
      <div className="text-4xl">
        📍
      </div>

      <h2 className="mt-5 text-xl font-bold">
        Филиалы не найдены
      </h2>

      <p className="mt-2 text-sm text-gray-500">
        Филиалы появятся после их
        создания клиентами.
      </p>
    </section>
  );
}

function formatDate(
  value: string,
) {
  if (!value) {
    return "не указано";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
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
