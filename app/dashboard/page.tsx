"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

type Restaurant = {
  id: string;
  owner_id: string | null;
  name: string;
  created_at: string | null;
};

export default function RestaurantsPage() {
  const router = useRouter();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadRestaurants = async () => {
      try {
        setLoading(true);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (
          sessionError ||
          !session?.access_token
        ) {
          router.replace("/login");
          return;
        }

        const response = await fetch(
          "/api/dashboard/my-restaurants",
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },

            cache: "no-store",
          }
        );

        const result = (await response.json()) as {
          success?: boolean;

          restaurants?: Array<{
            id: string;
            name: string;
            createdAt: string | null;
            branchCount?: number;
          }>;

          message?: string;
        };

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Не удалось загрузить рестораны."
          );
        }

        const normalizedRestaurants: Restaurant[] =
          (result.restaurants ?? []).map(
            (restaurant) => ({
              id: restaurant.id,
              owner_id: user.id,
              name: restaurant.name,
              created_at:
                restaurant.createdAt,
            })
          );

        if (mounted) {
          setRestaurants(
            normalizedRestaurants
          );
        }
      } catch (error) {
        console.error("Ошибка загрузки ресторанов:", error);

        if (mounted) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Не удалось загрузить рестораны."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadRestaurants();

    return () => {
      mounted = false;
    };
  }, [router]);

  const filteredRestaurants = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return restaurants;
    }

    return restaurants.filter((restaurant) =>
      restaurant.name.toLowerCase().includes(query)
    );
  }, [restaurants, search]);

  const handleConnectionRequest = () => {
    router.push("/dashboard/settings");
  };

  return (
    <DashboardLayout
      title="Рестораны"
      subtitle="Ваши подключённые заведения"
      actionLabel="+ Запросить подключение"
      onAction={handleConnectionRequest}
    >
      {message && (
        <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          <p>{message}</p>

          <button
            type="button"
            aria-label="Закрыть сообщение"
            onClick={() => setMessage("")}
            className="text-lg leading-none text-red-300 transition hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Всего ресторанов"
          value={restaurants.length}
          description="Подключённые заведения"
        />

        <StatCard
          title="Активные рестораны"
          value={restaurants.length}
          description="Доступны для посетителей"
        />

        <StatCard
          title="Ожидают подключения"
          value={0}
          description="Новые заявки"
        />
      </section>

      <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.025] p-6 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Список ресторанов</h2>

            <p className="mt-1 text-sm text-gray-500">
              Рестораны добавляет администратор ReviewTap
            </p>
          </div>

          <div className="relative w-full lg:w-[340px]">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              ⌕
            </span>

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Найти ресторан..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-500/40 focus:bg-white/[0.06]"
            />
          </div>
        </div>

        {loading ? (
          <LoadingState />
        ) : filteredRestaurants.length === 0 ? (
          <EmptyState
            searching={Boolean(search.trim())}
            onRequest={handleConnectionRequest}
          />
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredRestaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                onOpen={() =>
                  router.push(`/dashboard/restaurants/${restaurant.id}`)
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="rounded-[28px] border border-white/10 bg-white/[0.025] p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-xl text-purple-300">
            ⌖
          </div>

          <h2 className="mt-5 text-lg font-semibold">Филиалы ресторана</h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Для каждого ресторана можно подключить несколько филиалов с
            отдельными адресами и Google Review URL.
          </p>

          <button
            type="button"
            onClick={() => router.push("/dashboard/branches")}
            className="mt-5 text-sm font-medium text-purple-300 transition hover:text-purple-200"
          >
            Перейти к филиалам →
          </button>
        </article>

        <article className="rounded-[28px] border border-white/10 bg-white/[0.025] p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-xl text-blue-300">
            ◉
          </div>

          <h2 className="mt-5 text-lg font-semibold">NFC-стенды</h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            После создания филиалов администратор привяжет к ним NFC-стенды.
            Каждый стенд будет вести посетителя к нужной странице Google.
          </p>

          <button
            type="button"
            onClick={() => router.push("/dashboard/nfc")}
            className="mt-5 text-sm font-medium text-purple-300 transition hover:text-purple-200"
          >
            Перейти к NFC-стендам →
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
};

function StatCard({ title, value, description }: StatCardProps) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/[0.025] p-5">
      <p className="text-sm text-gray-500">{title}</p>

      <p className="mt-4 text-3xl font-bold tracking-tight">{value}</p>

      <p className="mt-3 text-xs text-gray-600">{description}</p>
    </article>
  );
}

function LoadingState() {
  return (
    <div className="mt-8 flex min-h-[340px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10">
      <div className="flex flex-col items-center gap-4">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-purple-500" />

        <p className="text-sm text-gray-500">Загружаем рестораны...</p>
      </div>
    </div>
  );
}

type EmptyStateProps = {
  searching: boolean;
  onRequest: () => void;
};

function EmptyState({ searching, onRequest }: EmptyStateProps) {
  return (
    <div className="mt-8 flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10">
      <div className="max-w-md px-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-2xl text-purple-300">
          ▦
        </div>

        <h3 className="mt-5 text-lg font-semibold">
          {searching ? "Ресторан не найден" : "Ресторанов пока нет"}
        </h3>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          {searching
            ? "Попробуйте изменить поисковый запрос."
            : "После подключения ресторан появится здесь. Администратор создаст ресторан, добавит филиалы и привяжет NFC-стенды."}
        </p>

        {!searching && (
          <button
            type="button"
            onClick={onRequest}
            className="mt-6 rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 px-5 py-3 text-sm font-semibold transition hover:brightness-110"
          >
            Запросить подключение
          </button>
        )}
      </div>
    </div>
  );
}

type RestaurantCardProps = {
  restaurant: Restaurant;
  onOpen: () => void;
};

function RestaurantCard({ restaurant, onOpen }: RestaurantCardProps) {
  const createdDate = restaurant.created_at
    ? new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(restaurant.created_at))
    : "Дата не указана";

  return (
    <article className="rounded-[24px] border border-white/10 bg-white/[0.025] p-5 transition hover:-translate-y-1 hover:border-purple-500/20 hover:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-xl text-purple-300">
          ▦
        </span>

        <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-xs text-green-300">
          Активен
        </span>
      </div>

      <h3 className="mt-5 text-lg font-semibold">{restaurant.name}</h3>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        Ресторан подключён к вашему аккаунту ReviewTap.
      </p>

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
        <span className="text-xs text-gray-600">
          Добавлен {createdDate}
        </span>

        <button
          type="button"
          onClick={onOpen}
          className="shrink-0 text-sm font-medium text-purple-300 transition hover:text-purple-200"
        >
          Подробнее →
        </button>
      </div>
    </article>
  );
}