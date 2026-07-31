"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type AdminRole =
  | "owner"
  | "admin"
  | "support";

type RestaurantSubscription = {
  id: string;
  plan: string;
  status: string;
  currentPeriodEnd: string;
  trialEndsAt: string;
  paymentProvider: string;
};

type AdminRestaurant = {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  companyName: string;
  googleReviewUrl: string;
  createdAt: string;
  updatedAt: string;
  branchCount: number;
  nfcTagCount: number;
  subscription:
    | RestaurantSubscription
    | null;
};

type RestaurantsResponse = {
  success: boolean;

  admin?: {
    userId: string;
    role: AdminRole;
  };

  restaurants?: AdminRestaurant[];

  error?: string;
  message?: string;
};

type PlanFilter =
  | "all"
  | "trial"
  | "starter"
  | "pro"
  | "business";

type StatusFilter =
  | "all"
  | "active"
  | "trialing"
  | "inactive";

type MessageState =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

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

export default function AdminRestaurantsPage() {
  const router = useRouter();

  const [
    restaurants,
    setRestaurants,
  ] = useState<AdminRestaurant[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [planFilter, setPlanFilter] =
    useState<PlanFilter>("all");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<StatusFilter>("all");

  const [message, setMessage] =
    useState<MessageState>(null);

  useEffect(() => {
    void loadRestaurants(false);
  }, []);

  async function loadRestaurants(
    isRefresh: boolean,
  ) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setMessage(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (
        sessionError ||
        !session?.access_token
      ) {
        router.replace(
          `/login?next=${encodeURIComponent(
            "/admin/restaurants",
          )}`,
        );

        return;
      }

      const response = await fetch(
        "/api/admin/restaurants/catalog",
        {
          method: "GET",

          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },

          cache: "no-store",
        },
      );

      const result =
        (await response.json()) as RestaurantsResponse;

      if (response.status === 401) {
        router.replace(
          `/login?next=${encodeURIComponent(
            "/admin/restaurants",
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
            "Не удалось загрузить рестораны.",
        );
      }

      setRestaurants(
        result.restaurants ?? [],
      );
    } catch (error) {
      setMessage({
        type: "error",

        text:
          error instanceof Error
            ? error.message
            : "Не удалось загрузить рестораны.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const statistics = useMemo(() => {
    let branchCount = 0;
    let nfcTagCount = 0;
    let activeCount = 0;

    for (const restaurant of restaurants) {
      branchCount +=
        restaurant.branchCount;

      nfcTagCount +=
        restaurant.nfcTagCount;

      if (
        getRestaurantStatus(
          restaurant,
        ) === "active"
      ) {
        activeCount += 1;
      }
    }

    return {
      restaurants:
        restaurants.length,
      branches: branchCount,
      nfcTags: nfcTagCount,
      active: activeCount,
    };
  }, [restaurants]);

  const filteredRestaurants =
    useMemo(() => {
      const normalizedSearch =
        search.trim().toLowerCase();

      return restaurants.filter(
        (restaurant) => {
          const plan =
            restaurant.subscription
              ?.plan ?? "trial";

          const status =
            getRestaurantStatus(
              restaurant,
            );

          const matchesSearch =
            !normalizedSearch ||
            [
              restaurant.name,
              restaurant.ownerEmail,
              restaurant.ownerName,
              restaurant.companyName,
            ]
              .join(" ")
              .toLowerCase()
              .includes(
                normalizedSearch,
              );

          const matchesPlan =
            planFilter === "all" ||
            plan.toLowerCase() ===
              planFilter;

          const matchesStatus =
            statusFilter === "all" ||
            status === statusFilter;

          return (
            matchesSearch &&
            matchesPlan &&
            matchesStatus
          );
        },
      );
    }, [
      restaurants,
      search,
      planFilter,
      statusFilter,
    ]);

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-220px] top-[-200px] h-[520px] w-[520px] rounded-full bg-blue-600/10 blur-[150px]" />

        <div className="absolute bottom-[-220px] right-[-180px] h-[520px] w-[520px] rounded-full bg-purple-600/10 blur-[160px]" />
      </div>

      <header className="relative border-b border-white/10 bg-[#050816]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-blue-400">
              ReviewTap Admin
            </p>

            <h1 className="mt-2 text-2xl font-black">
              Рестораны
            </h1>
          </div>

          <nav className="flex gap-2 overflow-x-auto">
            {navigation.map((item) => {
              const active =
                item.href ===
                "/admin/restaurants";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-blue-600 text-white"
                      : "border border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      
          <Link
            href="/admin/restaurants/new"
            className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
          >
            + Создать ресторан
          </Link>

          <Link
            href="/admin/restaurants/nfc"
            className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-500"
          >
            + Создать NFC-ссылку
          </Link>
</header>

      <div className="relative mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
        {message && (
          <div
            className={`mb-6 flex items-start justify-between gap-4 rounded-2xl border px-5 py-4 text-sm ${
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
              className="text-lg leading-none opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        )}

        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-400">
              Все заведения
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Рестораны клиентов
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-400">
              Здесь отображаются все
              рестораны, их владельцы,
              филиалы, NFC-метки и
              состояние подписки.
            </p>
          </div>

          <button
            type="button"
            disabled={refreshing}
            onClick={() =>
              void loadRestaurants(true)
            }
            className="w-fit rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing
              ? "Обновляем..."
              : "Обновить данные"}
          </button>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Рестораны"
            value={statistics.restaurants}
            description="Всего заведений"
          />

          <StatCard
            title="Активные"
            value={statistics.active}
            description="С активной подпиской"
          />

          <StatCard
            title="Филиалы"
            value={statistics.branches}
            description="Все точки ресторанов"
          />

          <StatCard
            title="NFC-метки"
            value={statistics.nfcTags}
            description="Подключённые стенды"
          />
        </section>

        <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Поиск
              </span>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Название, владелец или email"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-blue-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Тариф
              </span>

              <select
                value={planFilter}
                onChange={(event) =>
                  setPlanFilter(
                    event.target
                      .value as PlanFilter,
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-[#0d1320] px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="all">
                  Все тарифы
                </option>

                <option value="trial">
                  Trial
                </option>

                <option value="starter">
                  Starter
                </option>

                <option value="pro">
                  Pro
                </option>

                <option value="business">
                  Business
                </option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Статус
              </span>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target
                      .value as StatusFilter,
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-[#0d1320] px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="all">
                  Все статусы
                </option>

                <option value="active">
                  Активные
                </option>

                <option value="trialing">
                  Пробный период
                </option>

                <option value="inactive">
                  Неактивные
                </option>
              </select>
            </label>
          </div>
        </section>

        {loading ? (
          <RestaurantsLoading />
        ) : filteredRestaurants.length ===
          0 ? (
          <EmptyRestaurants />
        ) : (
          <section className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-xl">
            <div className="hidden grid-cols-[minmax(240px,1.4fr)_minmax(220px,1fr)_110px_110px_150px_150px] gap-4 border-b border-white/10 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-600 xl:grid">
              <span>Ресторан</span>
              <span>Владелец</span>
              <span>Филиалы</span>
              <span>NFC</span>
              <span>Подписка</span>
              <span>Создан</span>
            </div>

            <div className="divide-y divide-white/10">
              {filteredRestaurants.map(
                (restaurant) => (
                  <RestaurantRow
                    key={restaurant.id}
                    restaurant={
                      restaurant
                    }
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
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-3 text-3xl font-black">
        {value}
      </p>

      <p className="mt-2 text-xs text-gray-600">
        {description}
      </p>
    </article>
  );
}

function RestaurantRow({
  restaurant,
}: {
  restaurant: AdminRestaurant;
}) {
  const plan =
    restaurant.subscription?.plan ??
    "trial";

  const status =
    getRestaurantStatus(restaurant);

  return (
    <article className="grid gap-5 px-6 py-5 transition hover:bg-white/[0.025] xl:grid-cols-[minmax(240px,1.4fr)_minmax(220px,1fr)_110px_110px_150px_150px] xl:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600/15 font-black text-blue-300">
            {restaurant.name
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="min-w-0">
            <p className="truncate font-semibold">
              {restaurant.name}
            </p>

            <p className="mt-1 truncate text-xs text-gray-600">
              ID:{" "}
              {shortenId(
                restaurant.id,
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <MobileLabel text="Владелец" />

        <p className="truncate text-sm font-medium text-gray-300">
          {restaurant.companyName ||
            restaurant.ownerName ||
            "Не указано"}
        </p>

        <p className="mt-1 truncate text-xs text-gray-600">
          {restaurant.ownerEmail ||
            "Email не указан"}
        </p>
      </div>

      <div>
        <MobileLabel text="Филиалы" />

        <p className="text-lg font-bold">
          {restaurant.branchCount}
        </p>
      </div>

      <div>
        <MobileLabel text="NFC" />

        <p className="text-lg font-bold">
          {restaurant.nfcTagCount}
        </p>
      </div>

      <div>
        <MobileLabel text="Подписка" />

        <PlanBadge plan={plan} />

        <div className="mt-2">
          <StatusBadge
            status={status}
          />
        </div>
      </div>

      <div>
        <MobileLabel text="Создан" />

        <p className="text-sm text-gray-300">
          {formatDate(
            restaurant.createdAt,
          )}
        </p>

        <Link
          href="/admin/customers"
          className="mt-3 inline-flex text-xs font-semibold text-blue-400 transition hover:text-blue-300"
        >
          Открыть клиента →
        </Link>
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

function PlanBadge({
  plan,
}: {
  plan: string;
}) {
  const normalized =
    plan.toLowerCase();

  let classes =
    "border-gray-500/20 bg-gray-500/10 text-gray-300";

  if (normalized === "starter") {
    classes =
      "border-blue-500/20 bg-blue-500/10 text-blue-300";
  } else if (normalized === "pro") {
    classes =
      "border-purple-500/20 bg-purple-500/10 text-purple-300";
  } else if (
    normalized === "business"
  ) {
    classes =
      "border-amber-500/20 bg-amber-500/10 text-amber-300";
  } else if (normalized === "trial") {
    classes =
      "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${classes}`}
    >
      {formatPlanName(plan)}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status:
    | "active"
    | "trialing"
    | "inactive";
}) {
  let classes =
    "border-red-500/20 bg-red-500/10 text-red-300";

  let text = "Неактивна";

  if (status === "active") {
    classes =
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";

    text = "Активна";
  } else if (
    status === "trialing"
  ) {
    classes =
      "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";

    text = "Trial";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${classes}`}
    >
      {text}
    </span>
  );
}

function RestaurantsLoading() {
  return (
    <div className="mt-6 space-y-3">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="h-32 animate-pulse rounded-[24px] border border-white/10 bg-white/[0.03]"
        />
      ))}
    </div>
  );
}

function EmptyRestaurants() {
  return (
    <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-2xl">
        🏢
      </div>

      <h2 className="mt-5 text-xl font-bold">
        Рестораны не найдены
      </h2>

      <p className="mt-2 text-sm text-gray-500">
        Рестораны клиентов появятся
        здесь после их создания.
      </p>
    </section>
  );
}

function getRestaurantStatus(
  restaurant: AdminRestaurant,
):
  | "active"
  | "trialing"
  | "inactive" {
  const subscription =
    restaurant.subscription;

  if (!subscription) {
    return "inactive";
  }

  const endDate =
    subscription.currentPeriodEnd ||
    subscription.trialEndsAt;

  if (endDate) {
    const endTimestamp =
      new Date(endDate).getTime();

    if (
      Number.isFinite(endTimestamp) &&
      endTimestamp < Date.now()
    ) {
      return "inactive";
    }
  }

  const normalizedStatus =
    subscription.status.toLowerCase();

  if (normalizedStatus === "active") {
    return "active";
  }

  if (
    normalizedStatus === "trialing" ||
    normalizedStatus === "trial"
  ) {
    return "trialing";
  }

  return "inactive";
}

function formatPlanName(
  plan: string,
) {
  switch (plan.toLowerCase()) {
    case "trial":
      return "Trial";

    case "starter":
      return "Starter";

    case "pro":
      return "Pro";

    case "business":
      return "Business";

    default:
      return plan;
  }
}

function formatDate(
  value: string,
) {
  if (!value) {
    return "Не указано";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Не указано";
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

function shortenId(id: string) {
  if (id.length <= 12) {
    return id;
  }

  return `${id.slice(
    0,
    6,
  )}...${id.slice(-4)}`;
}