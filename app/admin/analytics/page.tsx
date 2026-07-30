"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type Summary = {
  customers: number;
  restaurants: number;
  branches: number;
  nfcTags: number;
  totalTaps: number;
  tapsToday: number;
  taps7Days: number;
  taps30Days: number;
  uniqueVisitors30Days: number;
};

type ChartItem = {
  date: string;
  count: number;
};

type TopRestaurant = {
  id: string;
  name: string;
  taps: number;
  branchCount: number;
};

type TopBranch = {
  id: string;
  name: string;
  restaurantName: string;
  taps: number;
  nfcTagCount: number;
};

type RecentEvent = {
  id: string;
  restaurantName: string;
  branchName: string;
  tagCode: string;
  visitorId: string | null;
  createdAt: string;
};

type AnalyticsResponse = {
  success: boolean;
  summary?: Summary;
  chart?: ChartItem[];
  topRestaurants?: TopRestaurant[];
  topBranches?: TopBranch[];
  recentEvents?: RecentEvent[];
  message?: string;
};

const EMPTY_SUMMARY: Summary = {
  customers: 0,
  restaurants: 0,
  branches: 0,
  nfcTags: 0,
  totalTaps: 0,
  tapsToday: 0,
  taps7Days: 0,
  taps30Days: 0,
  uniqueVisitors30Days: 0,
};

const NAV_ITEMS = [
  {
    name: "Обзор",
    href: "/admin",
    icon: "▦",
  },
  {
    name: "Клиенты",
    href: "/admin/customers",
    icon: "◉",
  },
  {
    name: "Рестораны",
    href: "/admin/restaurants",
    icon: "▤",
  },
  {
    name: "Филиалы",
    href: "/admin/branches",
    icon: "⌖",
  },
  {
    name: "Аналитика",
    href: "/admin/analytics",
    icon: "↗",
  },
];

export default function AdminAnalyticsPage() {
  const router = useRouter();

  const [summary, setSummary] =
    useState<Summary>(
      EMPTY_SUMMARY,
    );

  const [chart, setChart] =
    useState<ChartItem[]>([]);

  const [
    topRestaurants,
    setTopRestaurants,
  ] = useState<
    TopRestaurant[]
  >([]);

  const [
    topBranches,
    setTopBranches,
  ] = useState<TopBranch[]>([]);

  const [
    recentEvents,
    setRecentEvents,
  ] = useState<RecentEvent[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    void loadAnalytics();
  }, []);

  const maxChartValue =
    useMemo(
      () =>
        Math.max(
          1,
          ...chart.map(
            (item) => item.count,
          ),
        ),
      [chart],
    );

  async function loadAnalytics() {
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
            "/admin/analytics",
          )}`,
        );

        return;
      }

      const response = await fetch(
        "/api/admin/analytics",
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
        (await response.json()) as AnalyticsResponse;

      if (response.status === 401) {
        router.replace(
          `/login?next=${encodeURIComponent(
            "/admin/analytics",
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
            "Не удалось загрузить аналитику.",
        );
      }

      setSummary(
        result.summary ??
          EMPTY_SUMMARY,
      );

      setChart(
        result.chart ?? [],
      );

      setTopRestaurants(
        result.topRestaurants ?? [],
      );

      setTopBranches(
        result.topBranches ?? [],
      );

      setRecentEvents(
        result.recentEvents ?? [],
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить аналитику.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/10 bg-[#080b19] px-5 py-7 xl:block">
        <Link
          href="/admin"
          className="block"
        >
          <p className="text-lg font-black tracking-[0.18em] text-blue-400">
            REVIEWTAP
          </p>

          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-gray-600">
            Admin
          </p>
        </Link>

        <nav className="mt-10 space-y-2">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href ===
              "/admin/analytics";

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/20">
                  {item.icon}
                </span>

                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-7 left-5 right-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-wider text-gray-600">
            Панель управления
          </p>

          <p className="mt-2 text-sm font-semibold text-gray-300">
            Общая статистика ReviewTap
          </p>
        </div>
      </aside>

      <main className="px-5 py-8 sm:px-8 xl:ml-64">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-400">
                ReviewTap Admin
              </p>

              <h1 className="mt-4 text-3xl font-black sm:text-4xl">
                Аналитика
              </h1>

              <p className="mt-3 text-sm leading-7 text-gray-400">
                Общая активность всех
                клиентов, ресторанов,
                филиалов и NFC-меток.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  void loadAnalytics()
                }
                disabled={loading}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold transition hover:bg-white/[0.08] disabled:opacity-50"
              >
                {loading
                  ? "Обновляем..."
                  : "Обновить данные"}
              </button>

              <Link
                href="/admin"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold transition hover:bg-white/[0.08]"
              >
                ← В админку
              </Link>
            </div>
          </header>

          <div className="mt-6 flex gap-2 overflow-x-auto pb-2 xl:hidden">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold ${
                  item.href ===
                  "/admin/analytics"
                    ? "bg-blue-600"
                    : "border border-white/10 bg-white/[0.03] text-gray-400"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
              {error}
            </div>
          )}

          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MainStatCard
              label="Переходы сегодня"
              value={summary.tapsToday}
              icon="⚡"
            />

            <MainStatCard
              label="За 7 дней"
              value={summary.taps7Days}
              icon="7D"
            />

            <MainStatCard
              label="За 30 дней"
              value={summary.taps30Days}
              icon="30D"
            />

            <MainStatCard
              label="За всё время"
              value={summary.totalTaps}
              icon="↗"
            />
          </section>

          <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <SmallStatCard
              label="Клиенты"
              value={summary.customers}
            />

            <SmallStatCard
              label="Рестораны"
              value={summary.restaurants}
            />

            <SmallStatCard
              label="Филиалы"
              value={summary.branches}
            />

            <SmallStatCard
              label="NFC-метки"
              value={summary.nfcTags}
            />

            <SmallStatCard
              label="Уникальные гости"
              value={
                summary.uniqueVisitors30Days
              }
            />
          </section>

          <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-bold">
              Переходы за 30 дней
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Общая активность всех
              NFC-ссылок платформы.
            </p>

            {loading ? (
              <div className="mt-8 h-72 animate-pulse rounded-2xl bg-white/[0.04]" />
            ) : (
              <div className="mt-8 overflow-x-auto pb-4">
                <div className="flex h-72 min-w-[900px] items-end gap-2 border-b border-white/10 px-2">
                  {chart.map(
                    (
                      item,
                      index,
                    ) => {
                      const height =
                        item.count === 0
                          ? 4
                          : Math.max(
                              12,
                              Math.round(
                                (item.count /
                                  maxChartValue) *
                                  215,
                              ),
                            );

                      return (
                        <div
                          key={item.date}
                          className="flex min-w-0 flex-1 flex-col items-center justify-end"
                        >
                          <span className="mb-2 text-xs font-semibold text-gray-400">
                            {item.count}
                          </span>

                          <div
                            className="w-full rounded-t-lg bg-blue-600 transition hover:bg-blue-500"
                            style={{
                              height,
                            }}
                            title={`${formatChartDate(
                              item.date,
                            )}: ${
                              item.count
                            }`}
                          />

                          {(index %
                            5 ===
                            0 ||
                            index ===
                              chart.length -
                                1) && (
                            <span className="mt-3 whitespace-nowrap text-[10px] text-gray-600">
                              {formatChartDate(
                                item.date,
                              )}
                            </span>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            )}
          </section>

          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <RankingCard
              title="Лучшие рестораны"
              description="По переходам за последние 30 дней"
            >
              {topRestaurants.length ===
              0 ? (
                <EmptyMessage text="Данных по ресторанам пока нет." />
              ) : (
                topRestaurants.map(
                  (
                    restaurant,
                    index,
                  ) => (
                    <RankingRow
                      key={
                        restaurant.id
                      }
                      index={index}
                      name={
                        restaurant.name
                      }
                      secondary={`${restaurant.branchCount} филиалов`}
                      value={
                        restaurant.taps
                      }
                    />
                  ),
                )
              )}
            </RankingCard>

            <RankingCard
              title="Лучшие филиалы"
              description="По переходам за последние 30 дней"
            >
              {topBranches.length ===
              0 ? (
                <EmptyMessage text="Данных по филиалам пока нет." />
              ) : (
                topBranches.map(
                  (
                    branch,
                    index,
                  ) => (
                    <RankingRow
                      key={branch.id}
                      index={index}
                      name={branch.name}
                      secondary={`${branch.restaurantName} · NFC: ${branch.nfcTagCount}`}
                      value={
                        branch.taps
                      }
                    />
                  ),
                )
              )}
            </RankingCard>
          </div>

          <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-bold">
              Последние NFC-переходы
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Последние открытия ссылок
              во всей платформе.
            </p>

            {recentEvents.length ===
            0 ? (
              <EmptyMessage text="Переходов пока нет." />
            ) : (
              <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
                <table className="min-w-full text-left">
                  <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-5 py-4">
                        Ресторан
                      </th>

                      <th className="px-5 py-4">
                        Филиал
                      </th>

                      <th className="px-5 py-4">
                        NFC-код
                      </th>

                      <th className="px-5 py-4">
                        Посетитель
                      </th>

                      <th className="px-5 py-4">
                        Время
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentEvents.map(
                      (event) => (
                        <tr
                          key={
                            event.id
                          }
                          className="border-t border-white/10 hover:bg-white/[0.025]"
                        >
                          <td className="px-5 py-4 font-semibold">
                            {
                              event.restaurantName
                            }
                          </td>

                          <td className="px-5 py-4 text-sm text-gray-300">
                            {
                              event.branchName
                            }
                          </td>

                          <td className="px-5 py-4">
                            <code className="rounded-lg bg-black/30 px-2 py-1 text-xs text-blue-300">
                              {
                                event.tagCode
                              }
                            </code>
                          </td>

                          <td className="px-5 py-4 text-sm text-gray-500">
                            {shortId(
                              event.visitorId,
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-400">
                            {formatDateTime(
                              event.createdAt,
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function MainStatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-gray-500">
          {label}
        </p>

        <span className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-blue-500/10 px-2 text-xs font-black text-blue-300">
          {icon}
        </span>
      </div>

      <p className="mt-4 text-3xl font-black">
        {value.toLocaleString(
          "ru-RU",
        )}
      </p>
    </article>
  );
}

function SmallStatCard({
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

      <p className="mt-2 text-2xl font-black">
        {value.toLocaleString(
          "ru-RU",
        )}
      </p>
    </article>
  );
}

function RankingCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-xl font-bold">
        {title}
      </h2>

      <p className="mt-2 text-sm text-gray-500">
        {description}
      </p>

      <div className="mt-6 space-y-3">
        {children}
      </div>
    </section>
  );
}

function RankingRow({
  index,
  name,
  secondary,
  value,
}: {
  index: number;
  name: string;
  secondary: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/10 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-sm font-black text-blue-300">
          {index + 1}
        </div>

        <div className="min-w-0">
          <p className="truncate font-semibold">
            {name}
          </p>

          <p className="mt-1 truncate text-xs text-gray-600">
            {secondary}
          </p>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-xl font-black">
          {value}
        </p>

        <p className="text-xs text-gray-600">
          переходов
        </p>
      </div>
    </div>
  );
}

function EmptyMessage({
  text,
}: {
  text: string;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-gray-600">
      {text}
    </div>
  );
}

function shortId(
  value: string | null,
) {
  if (!value) {
    return "Не определён";
  }

  if (value.length <= 15) {
    return value;
  }

  return `${value.slice(
    0,
    8,
  )}…${value.slice(-4)}`;
}

function formatChartDate(
  value: string,
) {
  const date = new Date(
    `${value}T12:00:00`,
  );

  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      day: "2-digit",
      month: "2-digit",
    },
  ).format(date);
}

function formatDateTime(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Неизвестно";
  }

  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      timeZone: "Asia/Tashkent",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}