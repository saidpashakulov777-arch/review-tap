"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

type NfcStand = {
  id: string;
  code: string;
  branchId: string | null;
  branchName: string;
  branchAddress: string | null;
  restaurantName: string;
  googleReviewUrl: string;
  createdAt: string | null;
  taps: number;
};

type RestaurantRow = {
  id: string;
  name: string;
};

type BranchRow = {
  id: string;
  restaurant_id: string | null;
  name: string;
  address: string | null;
};

type NfcTagRow = {
  id: string;
  branch_id: string | null;
  code: string;
  google_review_url: string;
  created_at: string | null;
};

type TapEventRow = {
  nfc_tag_id: string;
};

type FilterValue = "all" | "active" | "unlinked" | "setup";

export default function NfcPage() {
  const router = useRouter();

  const [stands, setStands] = useState<NfcStand[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");

  useEffect(() => {
    let mounted = true;

    async function loadNfcStands() {
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

        /*
         * 1. Загружаем рестораны текущего клиента.
         */

        const {
          data: restaurantsData,
          error: restaurantsError,
        } = await supabase
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
            setStands([]);
          }

          return;
        }

        const restaurantIds = restaurants.map(
          (restaurant) => restaurant.id
        );

        /*
         * 2. Загружаем филиалы найденных ресторанов.
         */

        const { data: branchesData, error: branchesError } =
          await supabase
            .from("branches")
            .select("id, restaurant_id, name, address")
            .in("restaurant_id", restaurantIds);

        if (branchesError) {
          throw new Error(
            `Не удалось загрузить филиалы: ${branchesError.message}`
          );
        }

        const branches = (branchesData as BranchRow[] | null) ?? [];

        if (branches.length === 0) {
          if (mounted) {
            setStands([]);
          }

          return;
        }

        const branchIds = branches.map((branch) => branch.id);

        /*
         * 3. Загружаем NFC-стенды этих филиалов.
         */

        const { data: nfcTagsData, error: nfcTagsError } =
          await supabase
            .from("nfc_tags")
            .select(
              "id, branch_id, code, google_review_url, created_at"
            )
            .in("branch_id", branchIds)
            .order("created_at", { ascending: false });

        if (nfcTagsError) {
          throw new Error(
            `Не удалось загрузить NFC-стенды: ${nfcTagsError.message}`
          );
        }

        const nfcTags = (nfcTagsData as NfcTagRow[] | null) ?? [];

        if (nfcTags.length === 0) {
          if (mounted) {
            setStands([]);
          }

          return;
        }

        /*
         * 4. Загружаем события касаний.
         */

        const nfcTagIds = nfcTags.map((tag) => tag.id);

        const { data: tapEventsData, error: tapEventsError } =
          await supabase
            .from("tap_events")
            .select("nfc_tag_id")
            .in("nfc_tag_id", nfcTagIds);

        if (tapEventsError) {
          throw new Error(
            `Не удалось загрузить статистику: ${tapEventsError.message}`
          );
        }

        const tapEvents =
          (tapEventsData as TapEventRow[] | null) ?? [];

        /*
         * 5. Считаем количество касаний каждого стенда.
         */

        const tapCounts = new Map<string, number>();

        for (const event of tapEvents) {
          tapCounts.set(
            event.nfc_tag_id,
            (tapCounts.get(event.nfc_tag_id) ?? 0) + 1
          );
        }

        const restaurantMap = new Map(
          restaurants.map((restaurant) => [
            restaurant.id,
            restaurant.name,
          ])
        );

        const branchMap = new Map(
          branches.map((branch) => [branch.id, branch])
        );

        /*
         * 6. Объединяем данные для интерфейса.
         */

        const preparedStands: NfcStand[] = nfcTags.map((tag) => {
          const branch = tag.branch_id
            ? branchMap.get(tag.branch_id)
            : undefined;

          const restaurantName = branch?.restaurant_id
            ? restaurantMap.get(branch.restaurant_id) ??
              "Ресторан не найден"
            : "Не привязан";

          return {
            id: tag.id,
            code: tag.code,
            branchId: tag.branch_id,
            branchName: branch?.name ?? "Не привязан",
            branchAddress: branch?.address ?? null,
            restaurantName,
            googleReviewUrl: tag.google_review_url,
            createdAt: tag.created_at,
            taps: tapCounts.get(tag.id) ?? 0,
          };
        });

        if (mounted) {
          setStands(preparedStands);
        }
      } catch (error) {
        console.error("Ошибка загрузки NFC-стендов:", error);

        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Не удалось загрузить NFC-стенды."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadNfcStands();

    return () => {
      mounted = false;
    };
  }, [router]);

  const filteredStands = useMemo(() => {
    const query = search.trim().toLowerCase();

    return stands.filter((stand) => {
      const matchesSearch =
        !query ||
        stand.code.toLowerCase().includes(query) ||
        stand.branchName.toLowerCase().includes(query) ||
        stand.restaurantName.toLowerCase().includes(query) ||
        stand.branchAddress?.toLowerCase().includes(query);

      const matchesFilter =
        filter === "all" ||
        (filter === "active" &&
          Boolean(stand.branchId) &&
          Boolean(stand.googleReviewUrl)) ||
        (filter === "unlinked" && !stand.branchId) ||
        (filter === "setup" &&
          Boolean(stand.branchId) &&
          !stand.googleReviewUrl);

      return matchesSearch && matchesFilter;
    });
  }, [stands, search, filter]);

  const totalTaps = stands.reduce(
    (total, stand) => total + stand.taps,
    0
  );

  const activeStands = stands.filter(
    (stand) => stand.branchId && stand.googleReviewUrl
  ).length;

  const unlinkedStands = stands.filter(
    (stand) => !stand.branchId
  ).length;

  const setupRequiredStands = stands.filter(
    (stand) => stand.branchId && !stand.googleReviewUrl
  ).length;

  const handleConnectionRequest = () => {
    router.push("/dashboard/settings");
  };

  return (
    <DashboardLayout
      title="NFC-стенды"
      subtitle="Ваши подключённые устройства"
      actionLabel="+ Запросить стенд"
      onAction={handleConnectionRequest}
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Всего стендов"
          value={stands.length}
          description="Подключённые NFC-устройства"
          icon="◉"
        />

        <StatCard
          title="Активные"
          value={activeStands}
          description="Готовы принимать касания"
          icon="✓"
        />

        <StatCard
          title="Все переходы"
          value={totalTaps}
          description="За всё время"
          icon="↗"
        />

        <StatCard
          title="Требуют настройки"
          value={unlinkedStands + setupRequiredStands}
          description="Нужно проверить подключение"
          icon="!"
        />
      </section>

      <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.025] p-6 sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              Список NFC-стендов
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Стенды подключает администратор ReviewTap
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
            <div className="relative w-full sm:min-w-[280px]">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                ⌕
              </span>

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Код, филиал или ресторан..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-500/40 focus:bg-white/[0.06]"
              />
            </div>

            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as FilterValue)
              }
              className="rounded-xl border border-white/10 bg-[#111114] px-4 py-3 text-sm text-gray-300 outline-none transition focus:border-purple-500/40"
            >
              <option value="all">Все стенды</option>
              <option value="active">Активные</option>
              <option value="unlinked">Не привязаны</option>
              <option value="setup">Требуют настройки</option>
            </select>
          </div>
        </div>

        {loading ? (
          <LoadingState />
        ) : filteredStands.length === 0 ? (
          <EmptyState
            hasSearch={Boolean(search.trim()) || filter !== "all"}
            onRequest={handleConnectionRequest}
          />
        ) : (
          <div className="mt-8 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {filteredStands.map((stand) => (
              <NfcStandCard key={stand.id} stand={stand} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="rounded-[28px] border border-white/10 bg-white/[0.025] p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-xl text-purple-300">
            ◉
          </div>

          <h2 className="mt-5 text-lg font-semibold">
            Как работает NFC-стенд
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Посетитель прикладывает телефон к стенду. ReviewTap
            регистрирует переход и направляет его на страницу отзыва
            выбранного филиала.
          </p>
        </article>

        <article className="rounded-[28px] border border-white/10 bg-white/[0.025] p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-xl text-blue-300">
            ⌁
          </div>

          <h2 className="mt-5 text-lg font-semibold">
            Аналитика переходов
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Все зарегистрированные касания сохраняются в `tap_events`.
            Подробная статистика будет доступна в разделе аналитики.
          </p>

          <button
            type="button"
            onClick={() => router.push("/dashboard/analytics")}
            className="mt-5 text-sm font-medium text-purple-300 transition hover:text-purple-200"
          >
            Перейти к аналитике →
          </button>
        </article>
      </section>
    </DashboardLayout>
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">{title}</p>

          <p className="mt-4 text-3xl font-bold tracking-tight">
            {value}
          </p>
        </div>

        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-lg text-purple-300">
          {icon}
        </span>
      </div>

      <p className="mt-3 text-xs text-gray-600">
        {description}
      </p>
    </article>
  );
}

function LoadingState() {
  return (
    <div className="mt-8 flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10">
      <div className="flex flex-col items-center gap-4">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-purple-500" />

        <p className="text-sm text-gray-500">
          Загружаем NFC-стенды...
        </p>
      </div>
    </div>
  );
}

type EmptyStateProps = {
  hasSearch: boolean;
  onRequest: () => void;
};

function EmptyState({
  hasSearch,
  onRequest,
}: EmptyStateProps) {
  return (
    <div className="mt-8 flex min-h-[380px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10">
      <div className="max-w-md px-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-2xl text-purple-300">
          ◉
        </div>

        <h3 className="mt-5 text-lg font-semibold">
          {hasSearch
            ? "Стенды не найдены"
            : "NFC-стендов пока нет"}
        </h3>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          {hasSearch
            ? "Попробуйте изменить запрос или выбрать другой фильтр."
            : "После подключения стенда администратором он появится здесь вместе с филиалом, Google-ссылкой и статистикой переходов."}
        </p>

        {!hasSearch && (
          <button
            type="button"
            onClick={onRequest}
            className="mt-6 rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 px-5 py-3 text-sm font-semibold transition hover:brightness-110"
          >
            Запросить NFC-стенд
          </button>
        )}
      </div>
    </div>
  );
}

type NfcStandCardProps = {
  stand: NfcStand;
};

function NfcStandCard({ stand }: NfcStandCardProps) {
  const isActive =
    Boolean(stand.branchId) &&
    Boolean(stand.googleReviewUrl);

  const status = !stand.branchId
    ? "Не привязан"
    : !stand.googleReviewUrl
      ? "Нужна ссылка"
      : "Активен";

  const statusClasses = isActive
    ? "border-green-500/20 bg-green-500/10 text-green-300"
    : "border-yellow-500/20 bg-yellow-500/10 text-yellow-300";

  const createdDate = stand.createdAt
    ? new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(stand.createdAt))
    : "Дата не указана";

  return (
    <article className="rounded-[24px] border border-white/10 bg-white/[0.025] p-5 transition hover:-translate-y-1 hover:border-purple-500/20 hover:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-xl text-purple-300">
          ◉
        </span>

        <span
          className={`rounded-full border px-2.5 py-1 text-xs ${statusClasses}`}
        >
          {status}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-xs uppercase tracking-[0.16em] text-gray-600">
          Код стенда
        </p>

        <h3 className="mt-2 break-all text-lg font-semibold">
          {stand.code}
        </h3>
      </div>

      <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-black/10 p-4">
        <InfoRow
          label="Ресторан"
          value={stand.restaurantName}
        />

        <InfoRow
          label="Филиал"
          value={stand.branchName}
        />

        <InfoRow
          label="Адрес"
          value={stand.branchAddress ?? "Не указан"}
        />

        <InfoRow
          label="Переходы"
          value={String(stand.taps)}
        />
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
        <span className="text-xs text-gray-600">
          Добавлен {createdDate}
        </span>

        {stand.googleReviewUrl ? (
          <a
            href={stand.googleReviewUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-sm font-medium text-purple-300 transition hover:text-purple-200"
          >
            Открыть Google →
          </a>
        ) : (
          <span className="text-xs text-yellow-300">
            Ссылка не настроена
          </span>
        )}
      </div>
    </article>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-600">
        {label}
      </span>

      <span className="max-w-[65%] text-right text-xs text-gray-300">
        {value}
      </span>
    </div>
  );
}