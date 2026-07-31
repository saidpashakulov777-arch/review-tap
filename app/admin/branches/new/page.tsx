"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type Restaurant = {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
};

type CatalogResponse = {
  success?: boolean;
  restaurants?: Restaurant[];
  message?: string;
};

type CreateResponse = {
  success?: boolean;

  branch?: {
    id: string;
    restaurantId: string;
    restaurantName: string;
    name: string;
    address: string;
  };

  message?: string;
};

export default function NewAdminBranchPage() {
  const router = useRouter();

  const [
    restaurants,
    setRestaurants,
  ] = useState<Restaurant[]>([]);

  const [
    restaurantId,
    setRestaurantId,
  ] = useState("");

  const [name, setName] =
    useState("");

  const [address, setAddress] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    void loadRestaurants();
  }, []);

  const filteredRestaurants =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return restaurants;
      }

      return restaurants.filter(
        (restaurant) =>
          restaurant.name
            .toLowerCase()
            .includes(query) ||
          restaurant.ownerEmail
            .toLowerCase()
            .includes(query) ||
          restaurant.ownerName
            .toLowerCase()
            .includes(query),
      );
    }, [restaurants, search]);

  const selectedRestaurant =
    restaurants.find(
      (restaurant) =>
        restaurant.id ===
        restaurantId,
    ) ?? null;

  async function getToken() {
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
          "/admin/branches/new",
        )}`,
      );

      return null;
    }

    return session.access_token;
  }

  async function loadRestaurants() {
    setLoading(true);
    setError("");

    try {
      const token =
        await getToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        "/api/admin/restaurants/catalog",
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );

      const result =
        (await response.json()) as CatalogResponse;

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
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить рестораны.",
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
    setSuccess("");

    if (!restaurantId) {
      setError(
        "Выберите ресторан.",
      );
      return;
    }

    if (!name.trim()) {
      setError(
        "Введите название филиала.",
      );
      return;
    }

    try {
      setCreating(true);

      const token =
        await getToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        "/api/admin/branches/create",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            restaurantId,
            name: name.trim(),
            address:
              address.trim(),
          }),

          cache: "no-store",
        },
      );

      const result =
        (await response.json()) as CreateResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.branch
      ) {
        throw new Error(
          result.message ||
            "Не удалось создать филиал.",
        );
      }

      setSuccess(
        `Филиал «${result.branch.name}» создан для ресторана «${result.branch.restaurantName}».`,
      );

      setName("");
      setAddress("");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Не удалось создать филиал.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050816] px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-white/10 pb-7">
          <Link
            href="/admin/branches"
            className="text-sm font-semibold text-blue-400 hover:text-blue-300"
          >
            ← Все филиалы
          </Link>

          <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-blue-400">
            ReviewTap Admin
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            Создать филиал
          </h1>

          <p className="mt-3 text-sm leading-7 text-gray-400">
            Выберите ресторан и создайте
            для него новый филиал.
          </p>
        </header>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
            {success}
          </div>
        )}

        <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <form
            onSubmit={handleCreate}
          >
            <label className="block text-sm font-semibold text-gray-300">
              Поиск ресторана
            </label>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Название ресторана или email клиента"
              className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm outline-none placeholder:text-gray-600 focus:border-blue-500"
            />

            <label className="mt-6 block text-sm font-semibold text-gray-300">
              Ресторан
            </label>

            <select
              value={restaurantId}
              onChange={(event) =>
                setRestaurantId(
                  event.target.value,
                )
              }
              disabled={loading}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-[#090d1c] px-4 py-3.5 text-sm text-white outline-none focus:border-blue-500 disabled:opacity-50"
            >
              <option value="">
                {loading
                  ? "Загружаем рестораны..."
                  : "Выберите ресторан"}
              </option>

              {filteredRestaurants.map(
                (restaurant) => (
                  <option
                    key={restaurant.id}
                    value={restaurant.id}
                  >
                    {restaurant.name}
                    {restaurant.ownerEmail
                      ? ` — ${restaurant.ownerEmail}`
                      : ""}
                  </option>
                ),
              )}
            </select>

            {selectedRestaurant && (
              <div className="mt-4 rounded-2xl border border-blue-500/15 bg-blue-500/[0.06] p-4">
                <p className="font-semibold">
                  {
                    selectedRestaurant.name
                  }
                </p>

                <p className="mt-1 text-sm text-gray-400">
                  {selectedRestaurant.ownerName ||
                    "Клиент"}
                </p>

                <p className="mt-1 text-xs text-gray-600">
                  {
                    selectedRestaurant.ownerEmail
                  }
                </p>
              </div>
            )}

            <label className="mt-6 block text-sm font-semibold text-gray-300">
              Название филиала
            </label>

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value,
                )
              }
              placeholder="Например: Главный филиал"
              maxLength={120}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm outline-none placeholder:text-gray-600 focus:border-blue-500"
            />

            <label className="mt-6 block text-sm font-semibold text-gray-300">
              Адрес
            </label>

            <input
              type="text"
              value={address}
              onChange={(event) =>
                setAddress(
                  event.target.value,
                )
              }
              placeholder="Ташкент, улица Амира Темура, 10"
              maxLength={250}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm outline-none placeholder:text-gray-600 focus:border-blue-500"
            />

            <button
              type="submit"
              disabled={
                creating ||
                loading ||
                !restaurantId ||
                !name.trim()
              }
              className="mt-7 w-full rounded-2xl bg-blue-600 px-6 py-4 text-sm font-bold transition hover:bg-blue-500 disabled:opacity-50"
            >
              {creating
                ? "Создаём филиал..."
                : "Создать филиал"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}