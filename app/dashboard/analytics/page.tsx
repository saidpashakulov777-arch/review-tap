"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

type Period = "7d" | "30d" | "90d" | "all";

type RestaurantRow = {
  id: string;
  name: string;
};

type BranchRow = {
  id: string;
  restaurant_id: string | null;
  name: string;
};

type NfcTagRow = {
  id: string;
  branch_id: string | null;
  code: string;
};

type TapEventRow = {
  id: string;
  nfc_tag_id: string;
  created_at: string;
};

type AnalyticsEvent = {
  id: string;
  nfcTagId: string;
  nfcCode: string;
  branchName: string;
  restaurantName: string;
  createdAt: string;
};

type DailyPoint = {
  key: string;
  label: string;
  fullLabel: string;
  value: number;
};

type StandSummary = {
  nfcTagId: string;
  code: string;
  branchName: string;
  restaurantName: string;
  taps: number;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export default function AnalyticsPage() {
  const router = useRouter();

  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [period, setPeriod] = useState<Period>("30d");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadAnalytics() {
      try {
        setLoading(true);
        setErrorMessage("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        const { data: restaurantsData, error: restaurantsError } =
          await supabase
            .from("restaurants")
            .select("id, name")
            .eq("owner_id", user.id);

        if (restaurantsError) {
          throw new Error(
            `Не удалось загрузить рестораны: ${restaurantsError.message}`
          );
        }

        const restaurants =
          (restaurantsData as RestaurantRow[] | null) ?? [];

        if (restaurants.length === 0) {
          if (mounted) {
            setEvents([]);
          }

          return;
        }

        const restaurantIds = restaurants.map(
          (restaurant) => restaurant.id
        );

        const { data: branchesData, error: branchesError } =
          await supabase
            .from("branches")
            .select("id, restaurant_id, name")
            .in("restaurant_id", restaurantIds);

        if (branchesError) {
          throw new Error(
            `Не удалось загрузить филиалы: ${branchesError.message}`
          );
        }

        const branches = (branchesData as BranchRow[] | null) ?? [];

        if (branches.length === 0) {
          if (mounted) {
            setEvents([]);
          }

          return;
        }

        const branchIds = branches.map((branch) => branch.id);

        const { data: nfcTagsData, error: nfcTagsError } =
          await supabase
            .from("nfc_tags")
            .select("id, branch_id, code")
            .in("branch_id", branchIds);

        if (nfcTagsError) {
          throw new Error(
            `Не удалось загрузить NFC-стенды: ${nfcTagsError.message}`
          );
        }

        const nfcTags = (nfcTagsData as NfcTagRow[] | null) ?? [];

        if (nfcTags.length === 0) {
          if (mounted) {
            setEvents([]);
          }

          return;
        }

        const nfcTagIds = nfcTags.map((tag) => tag.id);

        const { data: tapEventsData, error: tapEventsError } =
          await supabase
            .from("tap_events")
            .select("id, nfc_tag_id, created_at")
            .in("nfc_tag_id", nfcTagIds)
            .order("created_at", { ascending: false });

        if (tapEventsError) {
          throw new Error(
            `Не удалось загрузить переходы: ${tapEventsError.message}`
          );
        }

        const tapEvents =
          (tapEventsData as TapEventRow[] | null) ?? [];

        const restaurantMap = new Map(
          restaurants.map((restaurant) => [
            restaurant.id,
            restaurant.name,
          ])
        );

        const branchMap = new Map(
          branches.map((branch) => [branch.id, branch])
        );

        const nfcTagMap = new Map(
          nfcTags.map((tag) => [tag.id, tag])
        );

        const preparedEvents: AnalyticsEvent[] = tapEvents.map(
          (event) => {
            const tag = nfcTagMap.get(event.nfc_tag_id);

            const branch = tag?.branch_id
              ? branchMap.get(tag.branch_id)
              : undefined;

            const restaurantName = branch?.restaurant_id
              ? restaurantMap.get(branch.restaurant_id) ??
                "Ресторан не найден"
              : "Не привязан";

            return {
              id: event.id,
              nfcTagId: event.nfc_tag_id,
              nfcCode: tag?.code ?? "Без кода",
              branchName: branch?.name ?? "Не привязан",
              restaurantName,
              createdAt: event.created_at,
            };
          }
        );

        if (mounted) {
          setEvents(preparedEvents);
        }
      } catch (error) {
        console.error("Ошибка загрузки аналитики:", error);

        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Не удалось загрузить аналитику."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadAnalytics();

    return () => {
      mounted = false;
    };
  }, [router]);

  const periodStart = useMemo(() => {
    if (period === "all") {
      return null;
    }

    const days =
      period === "7d"
        ? 7
        : period === "30d"
          ? 30
          : 90;

    return new Date(
      Date.now() - (days - 1) * DAY_IN_MS
    );
  }, [period]);

  const periodEvents = useMemo(() => {
    if (!periodStart) {
      return events;
    }

    return events.filter(
      (event) =>
        new Date(event.createdAt) >= periodStart
    );
  }, [events, periodStart]);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return periodEvents;
    }

    return periodEvents.filter(
      (event) =>
        event.nfcCode.toLowerCase().includes(query) ||
        event.branchName.toLowerCase().includes(query) ||
        event.restaurantName.toLowerCase().includes(query)
    );
  }, [periodEvents, search]);

  const now = new Date();

  const todayTaps = useMemo(() => {
    return events.filter((event) =>
      isSameDay(new Date(event.createdAt), now)
    ).length;
  }, [events]);

  const last7DaysTaps = useMemo(() => {
    const startDate = new Date(
      Date.now() - 6 * DAY_IN_MS
    );

    return events.filter(
      (event) =>
        new Date(event.createdAt) >= startDate
    ).length;
  }, [events]);

  const last30DaysTaps = useMemo(() => {
    const startDate = new Date(
      Date.now() - 29 * DAY_IN_MS
    );

    return events.filter(
      (event) =>
        new Date(event.createdAt) >= startDate
    ).length;
  }, [events]);

  const dailyData = useMemo(() => {
    return buildDailyData(periodEvents, period);
  }, [periodEvents, period]);

  const standSummaries = useMemo(() => {
    const summaries = new Map<string, StandSummary>();

    for (const event of periodEvents) {
      const current = summaries.get(event.nfcTagId);

      if (current) {
        current.taps += 1;
      } else {
        summaries.set(event.nfcTagId, {
          nfcTagId: event.nfcTagId,
          code: event.nfcCode,
          branchName: event.branchName,
          restaurantName: event.restaurantName,
          taps: 1,
        });
      }
    }

    return Array.from(summaries.values()).sort(
      (first, second) =>
        second.taps - first.taps
    );
  }, [periodEvents]);

  const topStand = standSummaries[0] ?? null;

  const averagePerDay = useMemo(() => {
    if (periodEvents.length === 0) {
      return 0;
    }

    return (
      periodEvents.length /
      Math.max(dailyData.length, 1)
    );
  }, [periodEvents, dailyData.length]);
    return (
    <DashboardLayout
      title="Аналитика"
      subtitle="Статистика переходов через NFC-стенды"
    >
      {errorMessage && (
        <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          <p>{errorMessage}</p>

          <button
            type="button"
            aria-label="Закрыть сообщение"
            onClick={() => setErrorMessage("")}
            className="text-lg leading-none text-red-300 transition hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 rounded-[24px] border border-white/10 bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-white">
            Период статистики
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Выбери период, за который хочешь посмотреть результаты
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex">
          <PeriodButton
            active={period === "7d"}
            onClick={() => setPeriod("7d")}
          >
            7 дней
          </PeriodButton>

          <PeriodButton
            active={period === "30d"}
            onClick={() => setPeriod("30d")}
          >
            30 дней
          </PeriodButton>

          <PeriodButton
            active={period === "90d"}
            onClick={() => setPeriod("90d")}
          >
            90 дней
          </PeriodButton>

          <PeriodButton
            active={period === "all"}
            onClick={() => setPeriod("all")}
          >
            Всё время
          </PeriodButton>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Сегодня"
          value={todayTaps}
          description="Переходов за текущий день"
          icon="◷"
        />

        <StatCard
          title="Последние 7 дней"
          value={last7DaysTaps}
          description="Все переходы за неделю"
          icon="↗"
        />

        <StatCard
          title="Последние 30 дней"
          value={last30DaysTaps}
          description="Все переходы за месяц"
          icon="▥"
        />

        <StatCard
          title="За всё время"
          value={events.length}
          description="Всего зарегистрировано"
          icon="◉"
        />
      </section>

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
            <article className="rounded-[28px] border border-white/10 bg-white/[0.025] p-5 sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    Динамика переходов
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Количество касаний NFC по дням
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/10 px-4 py-2 text-right">
                  <p className="text-xs text-gray-600">
                    В выбранном периоде
                  </p>

                  <p className="mt-1 text-lg font-semibold">
                    {periodEvents.length}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <AnalyticsChart data={dailyData} />
              </div>
            </article>

            <article className="rounded-[28px] border border-white/10 bg-white/[0.025] p-5 sm:p-7">
              <h2 className="text-lg font-semibold">
                Краткая сводка
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Результаты выбранного периода
              </p>

              <div className="mt-6 space-y-4">
                <SummaryRow
                  label="Переходов"
                  value={String(periodEvents.length)}
                />

                <SummaryRow
                  label="Среднее в день"
                  value={formatNumber(averagePerDay)}
                />

                <SummaryRow
                  label="Активных стендов"
                  value={String(standSummaries.length)}
                />

                <SummaryRow
                  label="Лучший стенд"
                  value={topStand?.code ?? "Нет данных"}
                />
              </div>

              {topStand && (
                <div className="mt-6 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-purple-300">
                    Самый популярный
                  </p>

                  <p className="mt-2 break-all font-semibold">
                    {topStand.code}
                  </p>

                  <p className="mt-1 text-sm text-gray-400">
                    {topStand.restaurantName} · {topStand.branchName}
                  </p>

                  <p className="mt-4 text-2xl font-bold">
                    {topStand.taps}
                  </p>

                  <p className="text-xs text-gray-500">
                    переходов за выбранный период
                  </p>
                </div>
              )}
            </article>
          </section>

          <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.025] p-5 sm:p-7">
            <div>
              <h2 className="text-lg font-semibold">
                Популярность NFC-стендов
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Стенды отсортированы по количеству переходов
              </p>
            </div>

            {standSummaries.length === 0 ? (
              <SmallEmptyState text="За выбранный период переходов пока нет." />
            ) : (
              <div className="mt-6 space-y-3">
                {standSummaries.slice(0, 8).map((stand, index) => {
                  const maximum =
                    standSummaries[0]?.taps ?? 1;

                  const width = Math.max(
                    (stand.taps / maximum) * 100,
                    4
                  );

                  return (
                    <div
                      key={stand.nfcTagId}
                      className="rounded-2xl border border-white/10 bg-black/10 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm text-gray-400">
                            {index + 1}
                          </span>

                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {stand.code}
                            </p>

                            <p className="mt-1 truncate text-xs text-gray-500">
                              {stand.restaurantName} · {stand.branchName}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-left sm:text-right">
                          <p className="font-semibold">
                            {stand.taps}
                          </p>

                          <p className="text-xs text-gray-600">
                            переходов
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-600 to-blue-500"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.025] p-5 sm:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Последние переходы
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Детальная история касаний NFC-стендов
                </p>
              </div>

              <div className="relative w-full lg:w-[340px]">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  ⌕
                </span>

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Стенд, филиал или ресторан..."
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-500/40 focus:bg-white/[0.06]"
                />
              </div>
            </div>

            {filteredEvents.length === 0 ? (
              <SmallEmptyState
                text={
                  search.trim()
                    ? "По вашему запросу переходы не найдены."
                    : "За выбранный период переходов пока нет."
                }
              />
            ) : (
              <EventsTable
                events={filteredEvents.slice(0, 50)}
              />
            )}
          </section>
        </>
      )}
    </DashboardLayout>
  );
}
type PeriodButtonProps = {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
};

function PeriodButton({
  active,
  children,
  onClick,
}: PeriodButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
        active
          ? "border-purple-500/30 bg-purple-500/15 text-purple-200"
          : "border-white/10 bg-white/[0.025] text-gray-400 hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

type StatCardProps = {
  title: string;
  value: number;
  description: string;
  icon: string;
};

function StatCard({
  title,
  value,
  description,
  icon,
}: StatCardProps) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/[0.025] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>

          <p className="mt-4 text-3xl font-bold">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-300">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-600">
        {description}
      </p>
    </article>
  );
}

type SummaryRowProps = {
  label: string;
  value: string;
};

function SummaryRow({
  label,
  value,
}: SummaryRowProps) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 pb-4 last:border-0">
      <span className="text-sm text-gray-500">
        {label}
      </span>

      <span className="font-semibold">
        {value}
      </span>
    </div>
  );
}
type AnalyticsChartProps = {
  data: DailyPoint[];
};

function AnalyticsChart({
  data,
}: AnalyticsChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10">
        <p className="text-sm text-gray-500">
          Недостаточно данных для графика
        </p>
      </div>
    );
  }

  const maximum = Math.max(
    ...data.map((point) => point.value),
    1
  );

  const visibleLabels =
    data.length <= 14
      ? data
      : data.filter((_, index) => {
          const step = Math.ceil(data.length / 8);

          return (
            index === 0 ||
            index === data.length - 1 ||
            index % step === 0
          );
        });

  return (
    <div>
      <div className="flex h-[280px] items-end gap-1.5 rounded-2xl border border-white/10 bg-black/10 px-3 pb-3 pt-6 sm:gap-2 sm:px-5">
        {data.map((point) => {
          const height =
            point.value === 0
              ? 2
              : Math.max(
                  (point.value / maximum) * 100,
                  5
                );

          return (
            <div
              key={point.key}
              className="group relative flex h-full min-w-0 flex-1 items-end"
            >
              <div
                title={`${point.fullLabel}: ${point.value}`}
                className="w-full rounded-t-md bg-gradient-to-t from-purple-600 to-blue-500 opacity-80 transition group-hover:opacity-100"
                style={{
                  height: `${height}%`,
                }}
              />

              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#151519] px-3 py-2 text-xs shadow-xl group-hover:block">
                <p className="font-medium text-white">
                  {point.value} переходов
                </p>

                <p className="mt-1 text-gray-500">
                  {point.fullLabel}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative mt-3 h-5 text-xs text-gray-600">
        {visibleLabels.map((point) => {
          const index = data.findIndex(
            (item) => item.key === point.key
          );

          const left =
            data.length === 1
              ? 50
              : (index / (data.length - 1)) * 100;

          return (
            <span
              key={point.key}
              className="absolute -translate-x-1/2 whitespace-nowrap"
              style={{
                left: `${left}%`,
              }}
            >
              {point.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
type EventsTableProps = {
  events: AnalyticsEvent[];
};

function EventsTable({
  events,
}: EventsTableProps) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
      <div className="hidden grid-cols-[1fr_1.2fr_1.2fr_170px] gap-4 border-b border-white/10 bg-white/[0.025] px-5 py-3 text-xs uppercase tracking-[0.12em] text-gray-600 md:grid">
        <span>NFC-стенд</span>
        <span>Ресторан</span>
        <span>Филиал</span>
        <span>Дата и время</span>
      </div>

      <div className="divide-y divide-white/10">
        {events.map((event) => (
          <div
            key={event.id}
            className="grid gap-3 px-5 py-4 transition hover:bg-white/[0.025] md:grid-cols-[1fr_1.2fr_1.2fr_170px] md:items-center md:gap-4"
          >
            <div>
              <p className="text-xs text-gray-600 md:hidden">
                NFC-стенд
              </p>

              <p className="mt-1 break-all text-sm font-medium md:mt-0">
                {event.nfcCode}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-600 md:hidden">
                Ресторан
              </p>

              <p className="mt-1 text-sm text-gray-300 md:mt-0">
                {event.restaurantName}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-600 md:hidden">
                Филиал
              </p>

              <p className="mt-1 text-sm text-gray-300 md:mt-0">
                {event.branchName}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-600 md:hidden">
                Дата и время
              </p>

              <p className="mt-1 text-sm text-gray-400 md:mt-0">
                {formatDateTime(event.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function LoadingState() {
  return (
    <div className="mt-6 flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-white/[0.025]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-purple-500" />

        <p className="text-sm text-gray-500">
          Загружаем аналитику...
        </p>
      </div>
    </div>
  );
}

type SmallEmptyStateProps = {
  text: string;
};

function SmallEmptyState({
  text,
}: SmallEmptyStateProps) {
  return (
    <div className="mt-6 flex min-h-[190px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10 px-6 text-center">
      <div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-purple-300">
          ◉
        </div>

        <p className="mt-4 text-sm text-gray-500">
          {text}
        </p>
      </div>
    </div>
  );
}

function buildDailyData(
  events: AnalyticsEvent[],
  period: Period
): DailyPoint[] {
  if (period === "all") {
    if (events.length === 0) {
      return [];
    }

    const timestamps = events.map((event) =>
      new Date(event.createdAt).getTime()
    );

    const earliestDate = new Date(
      Math.min(...timestamps)
    );

    const latestDate = new Date();

    const daysDifference =
      Math.floor(
        (startOfDay(latestDate).getTime() -
          startOfDay(earliestDate).getTime()) /
          DAY_IN_MS
      ) + 1;

    const safeDays = Math.min(
      Math.max(daysDifference, 1),
      180
    );

    return buildPoints(events, safeDays);
  }

  const days =
    period === "7d"
      ? 7
      : period === "30d"
        ? 30
        : 90;

  return buildPoints(events, days);
}

function buildPoints(
  events: AnalyticsEvent[],
  days: number
): DailyPoint[] {
  const countMap = new Map<string, number>();

  for (const event of events) {
    const key = toDateKey(
      new Date(event.createdAt)
    );

    countMap.set(
      key,
      (countMap.get(key) ?? 0) + 1
    );
  }

  const points: DailyPoint[] = [];

  for (
    let offset = days - 1;
    offset >= 0;
    offset -= 1
  ) {
    const date = new Date(
      Date.now() - offset * DAY_IN_MS
    );

    const key = toDateKey(date);

    points.push({
      key,
      label: new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
      }).format(date),
      fullLabel: new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(date),
      value: countMap.get(key) ?? 0,
    });
  }

  return points;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function isSameDay(
  firstDate: Date,
  secondDate: Date
) {
  return (
    firstDate.getFullYear() ===
      secondDate.getFullYear() &&
    firstDate.getMonth() ===
      secondDate.getMonth() &&
    firstDate.getDate() ===
      secondDate.getDate()
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}