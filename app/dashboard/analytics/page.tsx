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

type TopBranch = {
  id: string;
  name: string;
  restaurantName: string;
  taps: number;
};

type RecentEvent = {
  branchName: string;
  restaurantName: string;
  createdAt: string;
  visitorId: string | null;
};

type AnalyticsResponse = {
  success: boolean;
  summary?: Summary;
  chart?: ChartItem[];
  topBranches?: TopBranch[];
  recentEvents?: RecentEvent[];
  message?: string;
};

const EMPTY_SUMMARY: Summary = {
  restaurants: 0,
  branches: 0,
  nfcTags: 0,
  totalTaps: 0,
  tapsToday: 0,
  taps7Days: 0,
  taps30Days: 0,
  uniqueVisitors30Days: 0,
};

export default function AnalyticsPage() {
  const router = useRouter();

  const [summary, setSummary] =
    useState<Summary>(
      EMPTY_SUMMARY,
    );

  const [chart, setChart] =
    useState<ChartItem[]>([]);

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

  const maxChartValue = useMemo(
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
            "/dashboard/analytics",
          )}`,
        );

        return;
      }

      const response = await fetch(
        "/api/dashboard/analytics",
        {
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
            "/dashboard/analytics",
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
              Аналитика
            </h1>

            <p className="mt-3 text-sm leading-7 text-gray-400">
              Переходы по NFC-ссылкам,
              активность филиалов и
              последние касания.
            </p>
          </div>

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
        </header>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Переходы сегодня"
            value={summary.tapsToday}
            icon="⚡"
          />

          <StatCard
            label="За 7 дней"
            value={summary.taps7Days}
            icon="📅"
          />

          <StatCard
            label="За 30 дней"
            value={summary.taps30Days}
            icon="📈"
          />

          <StatCard
            label="Все переходы"
            value={summary.totalTaps}
            icon="📲"
          />
        </section>

        <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            label="Уникальные посетители"
            value={
              summary.uniqueVisitors30Days
            }
          />
        </section>

        <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
          <div>
            <h2 className="text-xl font-bold">
              Переходы за 30 дней
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Каждый столбец показывает
              количество открытий
              NFC-ссылок за день.
            </p>
          </div>

          {loading ? (
            <div className="mt-8 h-72 animate-pulse rounded-2xl bg-white/[0.04]" />
          ) : (
            <div className="mt-8 overflow-x-auto pb-3">
              <div className="flex h-72 min-w-[900px] items-end gap-2 border-b border-white/10 px-2">
                {chart.map(
                  (item, index) => {
                    const height =
                      item.count === 0
                        ? 4
                        : Math.max(
                            10,
                            Math.round(
                              (item.count /
                                maxChartValue) *
                                220,
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

                        {(index % 5 === 0 ||
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

        <div className="mt-8 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-bold">
              Лучшие филиалы
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              По переходам за последние
              30 дней.
            </p>

            <div className="mt-6 space-y-3">
              {topBranches.length ===
              0 ? (
                <EmptyMessage text="Пока нет данных по филиалам." />
              ) : (
                topBranches.map(
                  (
                    branch,
                    index,
                  ) => (
                    <div
                      key={branch.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/10 p-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-sm font-black text-blue-300">
                          {index + 1}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {
                              branch.name
                            }
                          </p>

                          <p className="truncate text-xs text-gray-600">
                            {
                              branch.restaurantName
                            }
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-black">
                          {branch.taps}
                        </p>

                        <p className="text-xs text-gray-600">
                          переходов
                        </p>
                      </div>
                    </div>
                  ),
                )
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-bold">
              Последние переходы
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Последние открытия
              NFC-ссылок.
            </p>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
              {recentEvents.length ===
              0 ? (
                <EmptyMessage text="Переходов пока нет." />
              ) : (
                recentEvents.map(
                  (
                    event,
                    index,
                  ) => (
                    <div
                      key={`${event.createdAt}-${index}`}
                      className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {
                            event.branchName
                          }
                        </p>

                        <p className="mt-1 truncate text-xs text-gray-600">
                          {
                            event.restaurantName
                          }
                        </p>
                      </div>

                      <div className="shrink-0 text-left sm:text-right">
                        <p className="text-sm text-gray-300">
                          {formatDateTime(
                            event.createdAt,
                          )}
                        </p>

                        <p className="mt-1 text-xs text-gray-600">
                          NFC-переход
                        </p>
                      </div>
                    </div>
                  ),
                )
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function StatCard({
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {label}
        </p>

        <span className="text-xl">
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

function EmptyMessage({
  text,
}: {
  text: string;
}) {
  return (
    <div className="px-5 py-10 text-center text-sm text-gray-600">
      {text}
    </div>
  );
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

  if (Number.isNaN(date.getTime())) {
    return "Неизвестное время";
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