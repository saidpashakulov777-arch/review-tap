"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type Restaurant = {
  id: string;
  name: string;
  createdAt: string | null;
  branchCount: number;
};

type RestaurantsResponse = {
  success: boolean;
  restaurants?: Restaurant[];
  restaurant?: Restaurant;
  message?: string;
};

type MessageState =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

export default function RestaurantsPage() {
  const router = useRouter();

  const [
    restaurants,
    setRestaurants,
  ] = useState<Restaurant[]>([]);

  const [name, setName] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [message, setMessage] =
    useState<MessageState>(null);

  useEffect(() => {
    void loadRestaurants();
  }, []);

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
          "/dashboard/restaurants",
        )}`,
      );

      return null;
    }

    return session.access_token;
  }

  async function loadRestaurants() {
    setLoading(true);
    setMessage(null);

    try {
      const token =
        await getAccessToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        "/api/restaurants",
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },

          cache: "no-store",
        },
      );

      const result =
        (await response.json()) as RestaurantsResponse;

      if (response.status === 401) {
        router.replace(
          `/login?next=${encodeURIComponent(
            "/dashboard/restaurants",
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
    }
  }

  async function handleCreateRestaurant(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage(null);

    const cleanName =
      name.trim();

    if (!cleanName) {
      setMessage({
        type: "error",
        text: "Введите название ресторана.",
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
        "/api/restaurants",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name: cleanName,
          }),

          cache: "no-store",
        },
      );

      const result =
        (await response.json()) as RestaurantsResponse;

      if (response.status === 401) {
        router.replace(
          `/login?next=${encodeURIComponent(
            "/dashboard/restaurants",
          )}`,
        );

        return;
      }

      if (
        !response.ok ||
        !result.success ||
        !result.restaurant
      ) {
        throw new Error(
          result.message ||
            "Не удалось создать ресторан.",
        );
      }

      setRestaurants(
        (currentRestaurants) => [
          result.restaurant as Restaurant,
          ...currentRestaurants,
        ],
      );

      setName("");

      setMessage({
        type: "success",
        text: "Ресторан успешно создан.",
      });
    } catch (error) {
      setMessage({
        type: "error",

        text:
          error instanceof Error
            ? error.message
            : "Не удалось создать ресторан.",
      });
    } finally {
      setCreating(false);
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
              Мои рестораны
            </h1>

            <p className="mt-3 text-sm leading-7 text-gray-400">
              Создавайте рестораны и
              управляйте их филиалами.
            </p>
          </div>

          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-3">
            <p className="text-xs uppercase tracking-wider text-blue-300">
              Всего ресторанов
            </p>

            <p className="mt-1 text-2xl font-black">
              {restaurants.length}
            </p>
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
              className="text-lg leading-none opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        )}

        <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-bold">
            Добавить ресторан
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Введите название заведения.
            После этого добавим филиалы и
            NFC-метки.
          </p>

          <form
            onSubmit={
              handleCreateRestaurant
            }
            className="mt-5 flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value,
                )
              }
              placeholder="Например: Urban Coffee"
              maxLength={120}
              disabled={creating}
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-blue-500 disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={creating}
              className="rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating
                ? "Создаём..."
                : "Добавить ресторан"}
            </button>
          </form>
        </section>

        {loading ? (
          <LoadingState />
        ) : restaurants.length === 0 ? (
          <EmptyState />
        ) : (
          <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {restaurants.map(
              (restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={
                    restaurant
                  }
                />
              ),
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function RestaurantCard({
  restaurant,
}: {
  restaurant: Restaurant;
}) {
  return (
    <article className="rounded-[26px] border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-blue-500/30">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/15 text-xl font-black text-blue-300">
          {restaurant.name
            .charAt(0)
            .toUpperCase()}
        </div>

        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
          Активен
        </span>
      </div>

      <h2 className="mt-5 truncate text-xl font-bold">
        {restaurant.name}
      </h2>

      <p className="mt-2 text-sm text-gray-500">
        Создан:{" "}
        {formatDate(
          restaurant.createdAt,
        )}
      </p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
        <p className="text-xs uppercase tracking-wider text-gray-600">
          Филиалы
        </p>

        <p className="mt-1 text-2xl font-black">
          {restaurant.branchCount}
        </p>
      </div>

      <button
        type="button"
        disabled
        className="mt-5 w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-gray-500"
      >
        Управление филиалами — следующий шаг
      </button>
    </article>
  );
}

function LoadingState() {
  return (
    <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-72 animate-pulse rounded-[26px] border border-white/10 bg-white/[0.03]"
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <section className="mt-8 rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-3xl">
        🏢
      </div>

      <h2 className="mt-5 text-xl font-bold">
        Ресторанов пока нет
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
        Добавьте первый ресторан с
        помощью формы выше.
      </p>
    </section>
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
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}